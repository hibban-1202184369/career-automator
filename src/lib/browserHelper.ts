import fs from 'fs';
import path from 'path';
import { getConfig } from './config';

export interface LaunchBrowserResult {
  browser: any;
  browserType: 'google-chrome' | 'chromium-bundled' | 'custom-chrome';
}

/**
 * Automatically detects installed Google Chrome executable path across OS platforms.
 */
function getSystemChromePath(): string | null {
  if (process.platform === 'win32') {
    const candidates = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
      path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Google\\Chrome\\Application\\chrome.exe')
    ];
    for (const c of candidates) {
      if (c && fs.existsSync(/*turbopackIgnore: true*/ c)) return c;
    }
  } else if (process.platform === 'darwin') {
    const macPath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    if (fs.existsSync(/*turbopackIgnore: true*/ macPath)) return macPath;
  } else {
    const linuxPaths = ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'];
    for (const p of linuxPaths) {
      if (fs.existsSync(/*turbopackIgnore: true*/ p)) return p;
    }
  }
  return null;
}

/**
 * Removes stale Chromium/Chrome singleton lock symlinks if left over from a previous crash/close.
 */
export function cleanupStaleProfileLocks(profilePath: string) {
  try {
    const lockFiles = ['SingletonLock', 'SingletonCookie', 'SingletonSocket', 'DevToolsActivePort'];
    for (const file of lockFiles) {
      const fullPath = path.join(/*turbopackIgnore: true*/ profilePath, file);
      try {
        if (fs.existsSync(/*turbopackIgnore: true*/ fullPath) || (fs.lstatSync(/*turbopackIgnore: true*/ fullPath).isSymbolicLink())) {
          fs.unlinkSync(/*turbopackIgnore: true*/ fullPath);
        }
      } catch {}
    }
  } catch (e) {
    // ignore
  }
}

/**
 * Launches Puppeteer browser with priority given to official Google Chrome (System Chrome)
 * and automatically falls back to bundled Chromium if Google Chrome fails or is unavailable.
 */
export async function launchBrowserWithFallback(
  mode: 'headless' | 'headful' = 'headless',
  onLog?: (msg: string) => void
): Promise<LaunchBrowserResult> {
  const puppeteer = require('puppeteer-extra');
  const StealthPlugin = require('puppeteer-extra-plugin-stealth');
  try {
    puppeteer.use(StealthPlugin());
  } catch (e) {}

  const config = getConfig();
  const profilePath = path.join(/*turbopackIgnore: true*/ process.cwd(), 'automation-profile');
  const isHeadless = mode !== 'headful';

  cleanupStaleProfileLocks(profilePath);

  const baseArgs = [
    '--no-default-browser-check',
    '--no-first-run',
    '--disable-infobars',
    '--test-type',
    '--disable-blink-features=AutomationControlled',
    '--window-size=1280,800'
  ];

  if (process.platform === 'linux') {
    baseArgs.push('--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage');
  }

  const baseOptions: any = {
    headless: isHeadless,
    userDataDir: profilePath,
    ignoreDefaultArgs: ['--enable-automation'],
    args: baseArgs,
    defaultViewport: isHeadless ? { width: 1280, height: 800 } : null
  };

  const log = onLog || console.log;

  // ----------------------------------------------------
  // ATTEMPT 1: System Google Chrome (Auto-detected or Custom Path)
  // ----------------------------------------------------
  if (config.useSystemChrome !== false) {
    const customPath = config.customChromePath ? config.customChromePath.trim() : '';
    const detectedPath = getSystemChromePath();
    const executablePath = customPath || detectedPath;

    if (executablePath && fs.existsSync(/*turbopackIgnore: true*/ executablePath)) {
      const chromeOptions = {
        ...baseOptions,
        executablePath
      };

      const targetLabel = customPath ? `Custom Chrome (${customPath})` : `System Google Chrome (${executablePath})`;

      try {
        log(`🌐 Mencoba meluncurkan ${targetLabel}...`);
        cleanupStaleProfileLocks(profilePath);
        const browser = await puppeteer.launch(chromeOptions);
        const version = await browser.version().catch(() => 'Unknown');
        log(`✅ Berhasil membuka ${targetLabel} [${version}]`);
        return {
          browser,
          browserType: customPath ? 'custom-chrome' : 'google-chrome'
        };
      } catch (chromeError: any) {
        log(`⚠️ Gagal membuka ${targetLabel}: ${chromeError.message || chromeError}`);
        log(`🔄 Beralih (fallback) menggunakan Chromium bawaan Puppeteer...`);
        cleanupStaleProfileLocks(profilePath);
      }
    } else {
      log(`⚠️ System Google Chrome tidak ditemukan di path default. Mencoba Chromium bawaan...`);
    }
  }

  // ----------------------------------------------------
  // ATTEMPT 2: Fallback to Bundled Chromium
  // ----------------------------------------------------
  try {
    log(`🌐 Meluncurkan Chromium Bawaan (Bundled Chromium)...`);
    cleanupStaleProfileLocks(profilePath);
    const browser = await puppeteer.launch(baseOptions);
    const version = await browser.version().catch(() => 'Unknown');
    log(`✅ Berhasil membuka Chromium Bawaan [${version}]`);
    return {
      browser,
      browserType: 'chromium-bundled'
    };
  } catch (bundledError: any) {
    log(`🚨 Gagal meluncurkan browser: ${bundledError.message || bundledError}`);
    throw new Error(`Tidak dapat meluncurkan browser: ${bundledError.message || bundledError}. Silakan pastikan Google Chrome terinstal di komputer Anda.`);
  }
}
