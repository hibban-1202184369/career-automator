import path from 'path';
import { getConfig, AppConfig } from './config';
import { runGlintsBot } from './bots/glints';
import { runJobstreetBot } from './bots/jobstreet';
import { runLinkedinBot } from './bots/linkedin';
import { runIndeedBot } from './bots/indeed';


// Helper: inject session cookies dari config (auto-login anti-keban)
async function injectCookies(page: any, rawCookies: string, domainHint: string, log: (m:string)=>void) {
  if (!rawCookies || !rawCookies.trim()) return;
  try {
    let cookies: any[] = [];
    const s = rawCookies.trim();
    // Support 3 format: JSON array [{name,value,domain}], Netscape, atau raw "a=b; c=d"
    if (s.startsWith('[')) {
      cookies = JSON.parse(s);
    } else if (s.includes('httpOnly') || s.startsWith('# HttpOnly')) {
      // Netscape format - skip, log warning
      log(`⚠️ Format Netscape terdeteksi untuk ${domainHint}, gunakan Export JSON dari Cookie-Editor / Extension.`);
      return;
    } else {
      // raw header "a=b; c=d"
      cookies = s.split(';').map(pair => {
        const idx = pair.indexOf('=');
        if (idx === -1) return null;
        const name = pair.slice(0, idx).trim();
        const value = pair.slice(idx+1).trim();
        if (!name || !value) return null;
        return { name, value, domain: domainHint };
      }).filter(Boolean) as any[];
    }
    if (cookies.length === 0) return;
    // Normalize domain
    const final = cookies.map(c => ({ ...c, domain: c.domain || domainHint }));
    await page.setCookie(...final);
    log(`🔑 Cookies injected: ${final.length} cookies for ${domainHint}`);
  } catch (e:any) {
    log(`⚠️ Gagal inject cookies ${domainHint}: ${e.message||e}`);
  }
}

declare global {
  var isBotRunning: boolean;
}

export async function startBot(onLog: (msg: string) => void, mode: string = 'headless', rawConfig?: AppConfig) {
  if (global.isBotRunning) {
    onLog('⚠️ Bot is already running!');
    return;
  }

  global.isBotRunning = true;
  onLog(`🚀 Starting Career Automator Engine in ${mode.toUpperCase()} mode...`);

  // Fallback to default/stored config if not provided
  const config: AppConfig = rawConfig || getConfig();

  let browser: any = null;
  try {
    const effectiveApiKey = (config?.geminiApiKey?.trim() || process.env.GEMINI_API_KEY || '').trim();
    if (!effectiveApiKey) {
      throw new Error('GEMINI_API_KEY tidak ditemukan. Isi di tab Bot Engine Setup.');
    }
    config.geminiApiKey = effectiveApiKey;

    if (!config.searchKeywords && !config.indeedNoJobTitleFilter) {
      throw new Error('Search keywords are not configured. Please fill them in first.');
    }

    onLog('📊 Menguji koneksi ke Google Sheets...');
    const { testSheetsConnection } = require('./googleSheets');
    const sheetsTest = await testSheetsConnection();
    if (sheetsTest.success) {
      onLog(`✅ Google Sheets terhubung: ${sheetsTest.message}`);
    } else {
      onLog(`⚠️ Peringatan: Gagal terhubung ke Google Sheets (${sheetsTest.error})`);
      onLog(`   ℹ️ Lamaran tetap akan diproses, namun riwayat sheets tidak tersimpan jika koneksi terputus.`);
    }

    // Launch browser with Google Chrome priority and Chromium fallback
    const { launchBrowserWithFallback } = require('./browserHelper');
    const launchResult = await launchBrowserWithFallback(mode as any, onLog);
    browser = launchResult.browser;

    let totalSuccess = 0;
    let totalAlreadyApplied = 0;
    let totalErrors = 0;

    const isSharedMode = config.limitMode !== 'per_platform';
    const sharedLimitTarget = config.limitPerDay || 155;

    if (isSharedMode) {
      onLog(`🎯 Mode Kuota: Kuota Gabungan Aktif (Target Total: ${sharedLimitTarget} lamaran untuk semua platform).`);
    } else {
      onLog(`🎯 Mode Kuota: Kuota Per-Platform Aktif (Glints: ${config.limitGlints || 80}, JobStreet: ${config.limitJobstreet || 75}, LinkedIn: ${config.limitLinkedin || 50}).`);
    }

    const excludeList = (config.excludeKeywords || '').split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
    const isExcluded = (title: string, company: string) => {
      if (excludeList.length === 0) return null;
      const hay = `${title} ${company}`.toLowerCase();
      for (const ex of excludeList) {
        // Support multi-word phrase match
        if (ex && hay.includes(ex)) return ex;
      }
      return null;
    };
    (config as any).__isExcluded = isExcluded;
    if (excludeList.length > 0) {
      onLog(`🚫 Filter Pengecualian Aktif: ${excludeList.join(', ')} (cek judul + perusahaan).`);
    }

    const glintsLimiter = {
      getTargetLimit: () => isSharedMode ? sharedLimitTarget : (config.limitGlints || config.limitPerDay || 80),
      isLimitReached: (currentGlintsSuccess: number) => {
        if (isSharedMode) {
          return totalSuccess >= sharedLimitTarget;
        }
        return currentGlintsSuccess >= (config.limitGlints || config.limitPerDay || 80);
      },
      onJobSuccess: () => {
        totalSuccess++;
      }
    };

    const jobstreetLimiter = {
      getTargetLimit: () => isSharedMode ? sharedLimitTarget : (config.limitJobstreet || config.limitPerDay || 75),
      isLimitReached: (currentJobstreetSuccess: number) => {
        if (isSharedMode) {
          return totalSuccess >= sharedLimitTarget;
        }
        return currentJobstreetSuccess >= (config.limitJobstreet || config.limitPerDay || 75);
      },
      onJobSuccess: () => {
        totalSuccess++;
      }
    };

    const linkedinLimiter = {
      getTargetLimit: () => isSharedMode ? sharedLimitTarget : (config.limitLinkedin || config.limitPerDay || 50),
      isLimitReached: (currentLinkedinSuccess: number) => {
        if (isSharedMode) {
          return totalSuccess >= sharedLimitTarget;
        }
        return currentLinkedinSuccess >= (config.limitLinkedin || config.limitPerDay || 50);
      },
      onJobSuccess: () => {
        totalSuccess++;
      }
    };

    const indeedLimiter = {
      getTargetLimit: () => isSharedMode ? sharedLimitTarget : (config.limitIndeed || config.limitPerDay || 50),
      isLimitReached: (currentIndeedSuccess: number) => {
        if (isSharedMode) {
          return totalSuccess >= sharedLimitTarget;
        }
        return currentIndeedSuccess >= (config.limitIndeed || config.limitPerDay || 50);
      },
      onJobSuccess: () => {
        totalSuccess++;
      }
    };

    const initialPages = await browser.pages();
    let initialPageUsed = false;

    const getOrNewPage = async () => {
      if (!initialPageUsed && initialPages.length > 0 && initialPages[0]) {
        initialPageUsed = true;
        return initialPages[0];
      }
      return await browser.newPage();
    };

    const tasks: Promise<void>[] = [];

    // ----------------------------------------------------
    // TAB 1: GLINTS AUTOMATION
    // ----------------------------------------------------
    if (config.enableGlints) {
      tasks.push((async () => {
        const pageGlints = await getOrNewPage();
        await pageGlints.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
        const glintsLog = (msg: string) => onLog(`[Glints] ${msg}`);
        await injectCookies(pageGlints, (config as any).glintsCookies, '.glints.com', glintsLog);

        glintsLog('🔍 Memulai proses bot Glints di Tab khusus...');
        try {
          const metrics = await runGlintsBot(pageGlints, config, glintsLog, glintsLimiter);
          totalAlreadyApplied += metrics.alreadyAppliedCount;
          totalErrors += metrics.errorCount;
        } catch (err: any) {
          glintsLog(`❌ Error: ${err.message || err}`);
          totalErrors++;
        } finally {
          try { await pageGlints.close(); } catch {}
        }
      })());
    } else {
      onLog('⏩ Glints dinonaktifkan di pengaturan.');
    }

    // ----------------------------------------------------
    // TAB 2: JOBSTREET AUTOMATION
    // ----------------------------------------------------
    if (config.enableJobstreet) {
      tasks.push((async () => {
        const pageJobstreet = await getOrNewPage();
        await pageJobstreet.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
        const jobstreetLog = (msg: string) => onLog(`[Jobstreet] ${msg}`);
        await injectCookies(pageJobstreet, (config as any).jobstreetCookies, '.jobstreet.co.id', jobstreetLog);

        jobstreetLog('🔍 Memulai proses bot Jobstreet di Tab khusus...');
        try {
          const metrics = await runJobstreetBot(pageJobstreet, config, jobstreetLog, jobstreetLimiter);
          totalAlreadyApplied += metrics.alreadyAppliedCount;
          totalErrors += metrics.errorCount;
        } catch (err: any) {
          jobstreetLog(`❌ Error: ${err.message || err}`);
          totalErrors++;
        } finally {
          try { await pageJobstreet.close(); } catch {}
        }
      })());
    } else {
      onLog('⏩ Jobstreet dinonaktifkan di pengaturan.');
    }

    // ----------------------------------------------------
    // TAB 3: LINKEDIN AUTOMATION
    // ----------------------------------------------------
    if (config.enableLinkedin) {
      tasks.push((async () => {
        const pageLinkedin = await getOrNewPage();
        await pageLinkedin.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
        const linkedinLog = (msg: string) => onLog(`[LinkedIn] ${msg}`);
        await injectCookies(pageLinkedin, (config as any).linkedinCookies, '.linkedin.com', linkedinLog);

        linkedinLog('🔍 Memulai proses bot LinkedIn di Tab khusus...');
        try {
          const metrics = await runLinkedinBot(pageLinkedin, config, linkedinLog, linkedinLimiter);
          totalAlreadyApplied += metrics.alreadyAppliedCount;
          totalErrors += metrics.errorCount;
        } catch (err: any) {
          linkedinLog(`❌ Error: ${err.message || err}`);
          totalErrors++;
        } finally {
          try { await pageLinkedin.close(); } catch {}
        }
      })());
    } else {
      onLog('⏩ LinkedIn dinonaktifkan di pengaturan.');
    }

    // ----------------------------------------------------
    // TAB 4: INDEED AUTOMATION
    // ----------------------------------------------------
    if (config.enableIndeed) {
      tasks.push((async () => {
        const pageIndeed = await getOrNewPage();
        await pageIndeed.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
        const indeedLog = (msg: string) => onLog(`[Indeed] ${msg}`);
        await injectCookies(pageIndeed, (config as any).indeedCookies, '.indeed.com', indeedLog);

        indeedLog('🔍 Memulai proses bot Indeed di Tab khusus...');
        try {
          const metrics = await runIndeedBot(pageIndeed, config, indeedLog, indeedLimiter);
          totalAlreadyApplied += metrics.alreadyAppliedCount;
          totalErrors += metrics.errorCount;
        } catch (err: any) {
          indeedLog(`❌ Error: ${err.message || err}`);
          totalErrors++;
        } finally {
          try { await pageIndeed.close(); } catch {}
        }
      })());
    } else {
      onLog('⏩ Indeed dinonaktifkan di pengaturan.');
    }

    // Tunggu semua tab platform selesai bekerja
    if (tasks.length > 0) {
      onLog(`🚀 Menjalankan ${tasks.length} tab platform secara bersamaan...`);
      await Promise.allSettled(tasks);
    } else {
      onLog('⚠️ Tidak ada platform yang diaktifkan (Glints, Jobstreet, LinkedIn & Indeed semuanya nonaktif).');
    }

    onLog('--------------------------------------------------');
    onLog('📊 RINGKASAN SESI (SESSION SUMMARY):');
    onLog(`✅ Total Berhasil Dilamar / Disimulasikan: ${totalSuccess} pekerjaan`);
    onLog(`⏩ Total Dilewati (Sudah Dilamar): ${totalAlreadyApplied} pekerjaan`);
    onLog(`❌ Total Error: ${totalErrors} pekerjaan`);
    onLog('--------------------------------------------------');
    onLog('🏁 Sesi Career Automator Selesai!');
  } catch (error: any) {
    onLog(`🚨 Fatal Bot Error: ${error.message || error}`);
  } finally {
    if (browser) {
      if (mode === 'headful') {
        onLog('⏳ Menunggu 5 detik sebelum menutup browser headful...');
        await new Promise(r => setTimeout(r, 5000));
      }
      await browser.close();
    }
    global.isBotRunning = false;
  }
}
