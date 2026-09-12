'use client';

import React, { useState, useEffect, useRef } from 'react';

export default function Page() {
  const [activeNav, setActiveNav] = useState<'dashboard' | 'bot' | 'profile' | 'sheets' | 'questions' | 'logs' | 'history'>('dashboard');

  // Config State
  const [config, setConfig] = useState({
    spreadsheetId: '',
    sheetName: 'Sheet1',
    googleCredentialsJson: '',
    geminiApiKey: '',
    searchKeywords: 'Network Engineer, IT GRC, IT Auditor, MIS',
    excludeKeywords: '',
    location: 'Indonesia',
    minSalary: '8000000',
    maxApplicationsDaily: '50',
    fullName: '',
    email: '',
    phoneNumber: '',
    expectedMonthlySalaryIDR: '12000000',
    noticePeriod: 'Segera / ASAP',
    limitMode: 'shared',
    limitGlints: 80,
    limitJobstreet: 75,
    limitLinkedin: 50,
    limitIndeed: 50,
    enableGlints: true,
    enableJobstreet: true,
    enableLinkedin: true,
    enableIndeed: true,
    indeedNoJobTitleFilter: false,
    debugTest: true,
    concurrency: 3,
    useSystemChrome: true,
    customChromePath: '',
    domicile: '',
    linkedinUrl: '',
    yearsOfExperience: 0,
    skills: '',
    portfolioUrl: '',
    githubUrl: '',
    educationLevel: 'S2 - Magister / Master',
    gpa: '3.48',
    workRights: 'WNI / Citizen',
    knownTools: 'Cisco, Wireshark, ISO 27001, NIST CSF 2.0, Python, SQL, Linux, Google Workspace',
    customSkills: ''
  });

  const [savingConfig, setSavingConfig] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Bot & Browser State
  const [isBotRunning, setIsBotRunning] = useState(false);
  const [isSetupBrowserRunning, setIsSetupBrowserRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Questions & History State
  const [questions, setQuestions] = useState<any[]>([]);
  const [questionSearch, setQuestionSearch] = useState('');
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [sheetsChecking, setSheetsChecking] = useState(false);
  const [sheetsResult, setSheetsResult] = useState<any>(null);


  // Load config on mount
  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) {
          const d: any = data.config || data;
          // Sync engine limitPerDay -> UI maxApplicationsDaily
          if (d.limitPerDay !== undefined && d.maxApplicationsDaily === undefined) {
            d.maxApplicationsDaily = String(d.limitPerDay);
          }
          if (d.maxApplicationsDaily !== undefined && d.limitPerDay === undefined) {
            d.limitPerDay = parseInt(d.maxApplicationsDaily) || 0;
          }
          setConfig((prev) => ({ ...prev, ...d }));
        }
      })
      .catch((e) => console.error('Failed to load config:', e));

    fetchQuestions();
    fetchAppliedHistory();
  }, []);

  const fetchQuestions = async () => {
    try {
      const res = await fetch('/api/questions');
      const data = await res.json();
      if (Array.isArray(data)) setQuestions(data);
      else if (Array.isArray(data.questions)) setQuestions(data.questions);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAppliedHistory = async () => {
    try {
      const res = await fetch('/api/applied');
      const data = await res.json();
      if (Array.isArray(data)) setHistoryItems(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    setSaveMessage('');
    try {
      // Sync before save: keep engine field limitPerDay in sync with UI maxApplicationsDaily
      const payload: any = { ...config };
      if (payload.maxApplicationsDaily !== undefined) {
        const n = parseInt(payload.maxApplicationsDaily) || 0;
        payload.limitPerDay = n;
        payload.maxApplicationsDaily = String(n);
      } else if (payload.limitPerDay !== undefined) {
        payload.maxApplicationsDaily = String(payload.limitPerDay);
      }
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setSaveMessage('✨ Konfigurasi berhasil disimpan!');
      } else {
        setSaveMessage(`❌ Gagal: ${data.error}`);
      }
    } catch (err: any) {
      setSaveMessage(`❌ Error: ${err.message}`);
    } finally {
      setSavingConfig(false);
      setTimeout(() => setSaveMessage(''), 4000);
    }
  };

  const handleToggleSetupBrowser = async () => {
    const action = isSetupBrowserRunning ? 'stop' : 'start';
    try {
      const res = await fetch('/api/setup-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success) {
        setIsSetupBrowserRunning(!isSetupBrowserRunning);
        if (action === 'start') {
          alert('🚀 Browser Setup dibuka! Silakan login manual di Glints/Jobstreet, lalu biarkan sesi tersimpan.');
        }
      } else {
        alert(data.error || 'Terjadi kesalahan browser.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleStartBot = (mode: 'headless' | 'headful' = 'headless') => {
    if (isBotRunning) return;
    setLogs([`[${new Date().toLocaleTimeString()}] 🚀 Memulai Bot Engine (${mode.toUpperCase()}) dengan Fable 5.1 & GPT Astra reasoning...`]);
    setIsBotRunning(true);
    setActiveNav('logs');

    const eventSource = new EventSource(`/api/run-bot?mode=${mode}`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setLogs((prev) => [...prev, `[${new Date(data.timestamp).toLocaleTimeString()}] ${data.message}`]);
      } catch (e) {
        console.error('SSE parse error:', e);
      }
    };

    eventSource.onerror = () => {
      setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] 🔌 Koneksi SSE ditutup.`]);
      setIsBotRunning(false);
      eventSource.close();
      fetchAppliedHistory();
    };
  };

  const handleStopBot = async () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsBotRunning(false);
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] 🛑 Menghentikan Bot Engine...`]);
    try {
      await fetch('/api/run-bot', { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
    fetchAppliedHistory();
  };

  const handleTestSheets = async () => {
    setSheetsChecking(true);
    setSheetsResult(null);
    try {
      const res = await fetch('/api/test-sheets', { method: 'POST' });
      const data = await res.json();
      setSheetsResult(data);
    } catch (e: any) {
      setSheetsResult({ success: false, error: e.message });
    } finally {
      setSheetsChecking(false);
    }
  };


  const filteredQuestions = questions.filter(
    (q) =>
      q.question?.toLowerCase().includes(questionSearch.toLowerCase()) ||
      q.answer?.toLowerCase().includes(questionSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#070913] text-[#f8fafc] flex font-sans selection:bg-indigo-500 selection:text-white">
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-72 bg-[#0b1021] border-r border-[#1e264a] flex flex-col justify-between shrink-0 hidden lg:flex">
        <div>
          {/* Logo & Brand */}
          <div className="p-6 border-b border-[#1e264a] flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/30 text-white font-bold text-xl">
              ⚡
            </div>
            <div>
              <h1 className="font-extrabold text-base tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
                Career Automator
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-[11px] text-emerald-400 font-medium tracking-wide">AI Auto-Answer Active</span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            {[
              { id: 'dashboard', label: 'Command Center', icon: '⚡' },
              { id: 'bot', label: 'Bot Engine Setup', icon: '⚙️' },
              { id: 'profile', label: 'Candidate Profile', icon: '👤' },
              { id: 'sheets', label: 'Google Sheets DB', icon: '📊' },
              { id: 'questions', label: 'Screening Q&A', icon: '📋' },
              { id: 'logs', label: 'Live Console Logs', icon: '📟' },
              { id: 'history', label: 'Application Audit', icon: '📈' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveNav(item.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                  activeNav === item.id
                    ? 'bg-gradient-to-r from-indigo-600/90 to-purple-600/90 text-white shadow-lg shadow-indigo-500/25 font-semibold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Sidebar Footer / Quick Status */}
        <div className="p-4 m-4 rounded-xl bg-[#0f172a] border border-[#232d59] text-xs space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span>AI Engine</span>
            <span className="text-emerald-400 font-mono">Gemini Ready</span>
          </div>
          <div className="flex justify-between items-center text-slate-400">
            <span>Answer Engine</span>
            <span className="text-indigo-300 font-mono">Fable & Astra Logic</span>
          </div>
          <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-500 flex justify-between">
            <span>v2.5 Pro Enterprise</span>
            <span className="text-cyan-400">Secure</span>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TOP COMMAND HEADER */}
        <header className="h-20 bg-[#0b1021]/80 backdrop-blur-md border-b border-[#1e264a] px-6 lg:px-10 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <div className="lg:hidden text-2xl">⚡</div>
            <div>
              <h2 className="text-lg font-bold capitalize tracking-tight text-white flex items-center gap-2">
                {activeNav === 'dashboard' && 'Command Center Overview'}
                {activeNav === 'bot' && 'Bot Engine Automation Settings'}
                {activeNav === 'profile' && 'Candidate Professional Profile'}
                {activeNav === 'sheets' && 'Google Sheets & Credentials Database'}
                {activeNav === 'questions' && 'Screening Questions Intelligence Base'}
                {activeNav === 'logs' && 'Live Terminal Execution Logs'}
                {activeNav === 'history' && 'Application Audit & History Log'}
              </h2>
              <p className="text-xs text-slate-400 hidden sm:block">
                Autonomous multi-platform job application system powered by advanced AI reasoning.
              </p>
            </div>
          </div>

          {/* Top Quick Actions */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleToggleSetupBrowser}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 border ${
                isSetupBrowserRunning
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                  : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20'
              }`}
            >
              <span>{isSetupBrowserRunning ? '🛑' : '🔑'}</span>
              <span>{isSetupBrowserRunning ? 'Tutup Browser Setup' : 'Login Setup Browser'}</span>
            </button>

            {isBotRunning ? (
              <button
                onClick={handleStopBot}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition shadow-lg shadow-amber-600/30 flex items-center gap-2 animate-pulse"
              >
                <span>🛑</span>
                <span>Hentikan Bot</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleStartBot('headless')}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs transition shadow-lg shadow-emerald-600/20 flex items-center gap-1.5"
                >
                  <span>🚀</span>
                  <span>Run Headless</span>
                </button>
                <button
                  onClick={() => handleStartBot('headful')}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs transition shadow-lg shadow-indigo-600/20 flex items-center gap-1.5 hidden sm:flex"
                >
                  <span>👁️</span>
                  <span>Run Headful</span>
                </button>
              </div>
            )}
          </div>
        </header>

        {/* WORKSPACE CONTENT BODY */}
        <main className="flex-1 p-6 lg:p-10 overflow-y-auto max-w-7xl w-full mx-auto space-y-8">
          {saveMessage && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center justify-between animate-fade-in">
              <span>{saveMessage}</span>
              <button onClick={() => setSaveMessage('')} className="text-emerald-400 hover:text-white font-bold">×</button>
            </div>
          )}

          {/* 1. DASHBOARD VIEW */}
          {activeNav === 'dashboard' && (
            <div className="space-y-8">
              {/* Metric Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {[
                  { label: 'Total Applications', val: historyItems.length, icon: '📈', color: 'from-blue-600 to-indigo-600' },
                  { label: 'Screening Questions Q&A', val: questions.length, icon: '📋', color: 'from-purple-600 to-pink-600' },
                  { label: 'Q&A Knowledge Base', val: questions.length + ' entries', icon: '🧠', color: 'from-emerald-600 to-teal-600' },
                  { label: 'Bot Status', val: isBotRunning ? 'Running 🚀' : 'Idle 🟢', icon: '⚡', color: 'from-amber-600 to-orange-600' },
                ].map((stat, i) => (
                  <div key={i} className="p-6 rounded-2xl bg-[#0f172a] border border-[#232d59] relative overflow-hidden shadow-xl">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl opacity-10 rounded-bl-full pointer-events-none from-white to-transparent"></div>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs text-slate-400 font-medium">{stat.label}</p>
                        <h3 className="text-2xl font-extrabold text-white mt-2 font-mono">{stat.val}</h3>
                      </div>
                      <span className="text-2xl p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/50">{stat.icon}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick Launch & Status Panel */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 p-8 rounded-2xl bg-[#0f172a] border border-[#232d59] shadow-xl space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <span>⚡</span>
                      <span>Quick Bot Control Center</span>
                    </h3>
                    <span className="text-xs px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                      Glints & Jobstreet Automation
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Career Automator menjalankan pencarian lowongan otomatis, menjawab screening dengan logika <span className="text-indigo-400 font-semibold">Fable 5.1 & GPT Astra (internal)</span>, dan mencatat hasil lamaran ke Google Sheets Anda.
                  </p>
                  <div className="flex flex-wrap gap-4 pt-2">
                    <button
                      onClick={() => handleStartBot('headless')}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-xl shadow-emerald-600/30 transition flex items-center gap-2"
                    >
                      <span>🚀</span>
                      <span>Start Headless Bot</span>
                    </button>
                    <button
                      onClick={() => handleStartBot('headful')}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 transition flex items-center gap-2"
                    >
                      <span>👁️</span>
                      <span>Start Headful (Visible Browser)</span>
                    </button>
                    <button
                      onClick={handleToggleSetupBrowser}
                      className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm transition border border-slate-700 flex items-center gap-2"
                    >
                      <span>🔑</span>
                      <span>Login Session Setup</span>
                    </button>
                  </div>
                </div>

                {/* System Diagnostics Card */}
                <div className="p-8 rounded-2xl bg-[#0f172a] border border-[#232d59] shadow-xl space-y-6">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-4">
                    <span>🩺</span>
                    <span>System Health</span>
                  </h3>
                  <div className="space-y-4 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Gemini AI</span>
                      <span className="px-2 py-0.5 rounded text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono">Online</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Reasoning Mode</span>
                      <span className="text-indigo-300 font-mono font-semibold">Fable + Astra</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Google Sheets DB</span>
                      <span className={config.spreadsheetId ? "text-emerald-400 font-mono" : "text-amber-400 font-mono"}>
                        {config.spreadsheetId ? "Configured" : "Not Set"}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveNav('questions')}
                    className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition border border-slate-700 text-center block"
                  >
                    Lihat Q&A Knowledge Base →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 2. BOT ENGINE SETTINGS VIEW */}
          {activeNav === 'bot' && (
            <form onSubmit={handleSaveConfig} className="space-y-8">
              <div className="p-8 rounded-2xl bg-[#0f172a] border border-[#232d59] shadow-xl space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>⚙️</span>
                    <span>Bot Target & Execution Parameters</span>
                  </h3>
                  <button
                    type="submit"
                    disabled={savingConfig}
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition shadow-lg shadow-indigo-600/30 disabled:opacity-50"
                  >
                    {savingConfig ? 'Menyimpan...' : 'Simpan Konfigurasi'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">Search Keywords (Pencarian Lowongan)</label>
                    <input
                      type="text"
                      value={config.searchKeywords}
                      onChange={(e) => setConfig({ ...config, searchKeywords: e.target.value })}
                      className="w-full bg-[#070913] border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                      placeholder="Network Engineer, IT GRC, MIS, IT Auditor"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-amber-400/90 mb-2">🚫 Exclude Keywords (Pengecualian)</label>
                    <input
                      type="text"
                      value={(config as any).excludeKeywords || ""}
                      onChange={(e) => setConfig({ ...config, excludeKeywords: e.target.value } as any)}
                      className="w-full bg-[#070913] border border-amber-500/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
                      placeholder="Contoh: kata kunci 1, kata kunci 2, kata kunci 3"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">Pisahkan dengan koma — setiap kata/frasa yang muncul di <b className="text-slate-400">judul atau nama perusahaan</b> akan otomatis <span className="text-amber-400 font-semibold">dilewati (skip)</span>. Contoh: <code className="text-slate-400">Network Engineer</code> + exclude <code className="text-amber-400">kata kunci</code></p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">Target Location (Lokasi)</label>
                    <input
                      type="text"
                      value={config.location}
                      onChange={(e) => setConfig({ ...config, location: e.target.value })}
                      className="w-full bg-[#070913] border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                      placeholder="Indonesia / Jakarta / Remote"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">Minimum Salary (Gaji Min. IDR)</label>
                    <input
                      type="text"
                      value={config.minSalary}
                      onChange={(e) => setConfig({ ...config, minSalary: e.target.value })}
                      className="w-full bg-[#070913] border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                      placeholder="8000000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">Max Applications Daily (Batas Harian)</label>
                    <input
                      type="text"
                      value={config.maxApplicationsDaily}
                      onChange={(e) => {
                        const v = e.target.value;
                        setConfig({ ...config, maxApplicationsDaily: v, limitPerDay: parseInt(v) || 0 } as any);
                      }}
                      className="w-full bg-[#070913] border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                      placeholder="50"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">Sinkron otomatis → <code className="text-slate-400">limitPerDay</code> engine</p>
                  </div>
                </div>

              {/* Platform Toggles & Limits — sibling of grid, full width */}
              <div className="p-6 rounded-2xl bg-[#070913] border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold tracking-widest uppercase text-slate-400">Sumber Lowongan & Limit Platform</h4>
                  <span className="text-[11px] text-slate-500">Nonaktifkan platform yang tidak digunakan</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { key: 'enableGlints', label: 'Glints', limitKey: 'limitGlints' },
                    { key: 'enableJobstreet', label: 'Jobstreet', limitKey: 'limitJobstreet' },
                    { key: 'enableLinkedin', label: 'LinkedIn', limitKey: 'limitLinkedin' },
                    { key: 'enableIndeed', label: 'Indeed', limitKey: 'limitIndeed' },
                  ].map((p) => (
                    <label key={p.key} className="flex flex-col gap-2 p-3.5 rounded-xl bg-[#0b1021] border border-slate-800 hover:border-slate-700 cursor-pointer">
                      <span className="flex items-center gap-2 font-semibold text-xs text-white">
                        <input type="checkbox" checked={(config as any)[p.key] !== false} onChange={(e) => setConfig({ ...config, [p.key]: e.target.checked } as any)} className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500" />
                        {p.label}
                      </span>
                      <span className="flex items-center gap-2 text-[11px] text-slate-400">
                        Limit:
                        <input type="number" value={(config as any)[p.limitKey] ?? ''} onChange={(e) => setConfig({ ...config, [p.limitKey]: parseInt(e.target.value) || 0 } as any)} className="w-16 px-2 py-1 rounded bg-[#070913] border border-slate-700 text-white font-mono text-xs" />
                      </span>
                    </label>
                  ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-2">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-slate-400 font-medium">Mode Limit</span>
                    <select value={(config as any).limitMode || 'shared'} onChange={(e) => setConfig({ ...config, limitMode: e.target.value } as any)} className="w-full bg-[#0b1021] border border-slate-700 rounded-xl px-3 py-2.5 text-white">
                      <option value="shared">Shared (limitPerDay total)</option>
                      <option value="per_platform">Per Platform</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-slate-400 font-medium">Concurrency (Parallel)</span>
                    <input type="number" min={1} max={5} value={(config as any).concurrency ?? 3} onChange={(e) => setConfig({ ...config, concurrency: parseInt(e.target.value) || 1 } as any)} className="w-full bg-[#0b1021] border border-slate-700 rounded-xl px-3 py-2.5 text-white font-mono" />
                  </label>
                  <label className="flex items-center gap-2 pt-6">
                    <input type="checkbox" checked={(config as any).indeedNoJobTitleFilter || false} onChange={(e) => setConfig({ ...config, indeedNoJobTitleFilter: e.target.checked } as any)} className="rounded border-slate-700 bg-slate-900 text-indigo-600" />
                    <span className="text-slate-300">Indeed tanpa filter job title</span>
                  </label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={(config as any).useSystemChrome !== false} onChange={(e) => setConfig({ ...config, useSystemChrome: e.target.checked } as any)} className="rounded border-slate-700 bg-slate-900 text-indigo-600" />
                    <span className="text-slate-300 text-xs">Gunakan System Chrome</span>
                  </label>
                  <label className="flex flex-col gap-1 text-xs">
                    <span className="text-slate-400">Custom Chrome Path (Opsional)</span>
                    <input value={(config as any).customChromePath || ''} onChange={(e) => setConfig({ ...config, customChromePath: e.target.value } as any)} placeholder="C:\Program Files\Google\Chrome\Application\chrome.exe" className="w-full bg-[#0b1021] border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-[11px]" />
                  </label>
                </div>
                <label className="flex items-center gap-2 pt-2 text-xs">
                  <input type="checkbox" checked={(config as any).debugTest || false} onChange={(e) => setConfig({ ...config, debugTest: e.target.checked } as any)} className="rounded border-slate-700 bg-slate-900 text-indigo-600" />
                  <span className="text-slate-300">Mode Debug Test (dry-run tanpa submit lamaran)</span>
                </label>
              </div>
              </div>
            </form>
          )}

          {/* 3. AI INTELLIGENCE & FABLE 5.1 / GPT ASTRA HUB */}
          {activeNav === 'profile' && (
            <form onSubmit={handleSaveConfig} className="space-y-8">
              <div className="p-8 rounded-2xl bg-[#0f172a] border border-[#232d59] shadow-xl space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>👤</span>
                    <span>Candidate Professional Profile</span>
                  </h3>
                  <button
                    type="submit"
                    disabled={savingConfig}
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition shadow-lg shadow-indigo-600/30"
                  >
                    {savingConfig ? 'Menyimpan...' : 'Simpan Profil'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">Full Name (Nama Lengkap)</label>
                    <input
                      type="text"
                      value={config.fullName}
                      onChange={(e) => setConfig({ ...config, fullName: e.target.value })}
                      className="w-full bg-[#070913] border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                      placeholder="Nama Kandidat"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">Email Address</label>
                    <input
                      type="email"
                      value={config.email}
                      onChange={(e) => setConfig({ ...config, email: e.target.value })}
                      className="w-full bg-[#070913] border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono text-xs"
                      placeholder="email@domain.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">Phone Number</label>
                    <input
                      type="text"
                      value={config.phoneNumber}
                      onChange={(e) => setConfig({ ...config, phoneNumber: e.target.value })}
                      className="w-full bg-[#070913] border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono text-xs"
                      placeholder="+62 812..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">Expected Salary (IDR)</label>
                    <input
                      type="text"
                      value={config.expectedMonthlySalaryIDR}
                      onChange={(e) => setConfig({ ...config, expectedMonthlySalaryIDR: e.target.value })}
                      className="w-full bg-[#070913] border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono text-xs"
                      placeholder="12000000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">Notice Period</label>
                    <input
                      type="text"
                      value={config.noticePeriod}
                      onChange={(e) => setConfig({ ...config, noticePeriod: e.target.value })}
                      className="w-full bg-[#070913] border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono text-xs"
                      placeholder="Segera / ASAP"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">Education & GPA</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={config.educationLevel}
                        onChange={(e) => setConfig({ ...config, educationLevel: e.target.value })}
                        className="w-2/3 bg-[#070913] border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                        placeholder="S2 Magister"
                      />
                      <input
                        type="text"
                        value={config.gpa}
                        onChange={(e) => setConfig({ ...config, gpa: e.target.value })}
                        className="w-1/3 bg-[#070913] border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                        placeholder="3.48"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800">
                  <label className="block text-xs font-semibold text-slate-300 mb-2">Known Technical Skills & Tools</label>
                  <textarea
                    rows={3}
                    value={config.knownTools}
                    onChange={(e) => setConfig({ ...config, knownTools: e.target.value })}
                    className="w-full bg-[#070913] border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono text-xs"
                    placeholder="Cisco, ISO 27001, Python, SQL, Linux..."
                  ></textarea>
                </div>
                <div className="pt-6 border-t border-slate-800">
                  <h4 className="text-xs font-bold tracking-widest uppercase text-slate-400 mb-4">Portfolio & Professional Links</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-2">Portfolio URL</label>
                      <input value={(config as any).portfolioUrl || ''} onChange={(e) => setConfig({ ...config, portfolioUrl: e.target.value } as any)} placeholder="https://portfolio-anda.com" className="w-full bg-[#070913] border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono text-xs placeholder:text-slate-600" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-2">GitHub URL</label>
                      <input value={(config as any).githubUrl || ''} onChange={(e) => setConfig({ ...config, githubUrl: e.target.value } as any)} placeholder="https://github.com/username" className="w-full bg-[#070913] border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono text-xs placeholder:text-slate-600" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-2">LinkedIn URL</label>
                      <input value={(config as any).linkedinUrl || ''} onChange={(e) => setConfig({ ...config, linkedinUrl: e.target.value } as any)} placeholder="https://linkedin.com/in/nama-anda" className="w-full bg-[#070913] border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono text-xs placeholder:text-slate-600" />
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-800">
                  <h4 className="text-xs font-bold tracking-widest uppercase text-slate-400 mb-4">Additional Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-2">Domisili</label>
                      <input value={(config as any).domicile || ''} onChange={(e) => setConfig({ ...config, domicile: e.target.value } as any)} placeholder="Jakarta, Indonesia" className="w-full bg-[#070913] border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-2">Tahun Pengalaman</label>
                      <input type="number" value={(config as any).yearsOfExperience ?? 0} onChange={(e) => setConfig({ ...config, yearsOfExperience: parseInt(e.target.value) || 0 } as any)} className="w-full bg-[#070913] border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono" placeholder="2" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-2">Skills (Pisah koma)</label>
                      <input value={(config as any).skills || ''} onChange={(e) => setConfig({ ...config, skills: e.target.value } as any)} placeholder="Cisco, Python, ISO 27001" className="w-full bg-[#070913] border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500" />
                    </div>
                  </div>
                </div>
              </div>
            </form>
          )}

          {/* 5. GOOGLE SHEETS DB VIEW */}
          {activeNav === 'sheets' && (
            <form onSubmit={handleSaveConfig} className="space-y-8">
              <div className="p-8 rounded-2xl bg-[#0f172a] border border-[#232d59] shadow-xl space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>📊</span>
                    <span>Google Sheets & Service Account Database Sync</span>
                  </h3>
                  <button
                    type="submit"
                    disabled={savingConfig}
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition shadow-lg shadow-indigo-600/30"
                  >
                    {savingConfig ? 'Menyimpan...' : 'Simpan Sheets Config'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">Google Spreadsheet ID</label>
                    <input
                      type="text"
                      value={config.spreadsheetId}
                      onChange={(e) => setConfig({ ...config, spreadsheetId: e.target.value })}
                      className="w-full bg-[#070913] border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                      placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">Sheet Name (Nama Lembar)</label>
                    <input
                      type="text"
                      value={config.sheetName}
                      onChange={(e) => setConfig({ ...config, sheetName: e.target.value })}
                      className="w-full bg-[#070913] border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                      placeholder="Sheet1"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">Google Service Account JSON Credentials</label>
                  <textarea
                    rows={5}
                    value={config.googleCredentialsJson}
                    onChange={(e) => setConfig({ ...config, googleCredentialsJson: e.target.value })}
                    className="w-full bg-[#070913] border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono text-xs"
                    placeholder="{ ... }"
                  ></textarea>
                <div className="mt-6 pt-6 border-t border-slate-800">
                  <label className="block text-xs font-semibold text-slate-300 mb-2">Gemini API Key (Auto-Jawab Screening - Fable & Astra Logic)</label>
                  <input
                    type="password"
                    value={(config as any).geminiApiKey || ''}
                    onChange={(e) => setConfig({ ...config, geminiApiKey: e.target.value } as any)}
                    className="w-full bg-[#070913] border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono text-xs"
                    placeholder="AIzaSy... (kosongkan jika pakai ENV)"
                  />
                  <p className="text-xs text-slate-500 mt-1">Cukup isi sekali di tab ini. Teman Anda langsung pakai tanpa perlu setting gateway apa pun.</p>
                </div>
                </div>

                <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handleTestSheets}
                    disabled={sheetsChecking}
                    className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition border border-slate-700"
                  >
                    {sheetsChecking ? 'Memeriksa...' : 'Test Koneksi Google Sheets 🔍'}
                  </button>
                  {sheetsResult && (
                    <span className={`text-xs font-mono ${sheetsResult.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {sheetsResult.success ? '✅ Koneksi Berhasil!' : `❌ ${sheetsResult.error}`}
                    </span>
                  )}
                </div>
              </div>
            </form>
          )}

          {/* 6. SCREENING QUESTIONS Q&A VIEW */}
          {activeNav === 'questions' && (
            <div className="space-y-8">
              <div className="p-8 rounded-2xl bg-[#0f172a] border border-[#232d59] shadow-xl space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>📋</span>
                    <span>Screening Questions Database ({filteredQuestions.length})</span>
                  </h3>
                  <button
                    onClick={fetchQuestions}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition border border-slate-700"
                  >
                    🔄 Refresh List
                  </button>
                </div>

                <div className="flex gap-4">
                  <input
                    type="text"
                    value={questionSearch}
                    onChange={(e) => setQuestionSearch(e.target.value)}
                    placeholder="Cari pertanyaan screening..."
                    className="w-full bg-[#070913] border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-3 max-h-[550px] overflow-y-auto pr-2">
                  {filteredQuestions.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-12">Belum ada data pertanyaan tersimpan.</p>
                  ) : (
                    filteredQuestions.map((q, idx) => (
                      <div key={idx} className="p-5 rounded-xl bg-[#070913] border border-slate-800 space-y-2">
                        <div className="flex justify-between items-start">
                          <span className="font-semibold text-sm text-white">{q.question}</span>
                          <span className="text-[11px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                            {q.type || 'text'}
                          </span>
                        </div>
                        <p className="text-xs text-emerald-300 font-mono bg-emerald-950/20 p-2.5 rounded-lg border border-emerald-900/40">
                          A: {q.answer}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 7. LIVE CONSOLE LOGS VIEW */}
          {activeNav === 'logs' && (
            <div className="space-y-8">
              <div className="p-8 rounded-2xl bg-[#0f172a] border border-[#232d59] shadow-xl space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>📟</span>
                    <span>Live Terminal Execution Console</span>
                  </h3>
                  <div className="flex items-center gap-3">
                    {isBotRunning && (
                      <button
                        onClick={handleStopBot}
                        className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
                      >
                        Stop Bot
                      </button>
                    )}
                    <button
                      onClick={() => setLogs([])}
                      className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700"
                    >
                      Clear Logs
                    </button>
                  </div>
                </div>

                <div className="p-6 rounded-xl bg-[#070913] border border-slate-800 font-mono text-xs text-slate-300 h-[500px] overflow-y-auto space-y-2 shadow-inner">
                  {logs.length === 0 ? (
                    <p className="text-slate-600 text-center py-20">Bot belum dijalankan. Klik "Run Headless" atau "Run Headful" di atas untuk mulai.</p>
                  ) : (
                    logs.map((log, index) => (
                      <div key={index} className="leading-relaxed border-b border-slate-900/50 pb-1">
                        {log}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 8. APPLICATION HISTORY VIEW */}
          {activeNav === 'history' && (
            <div className="space-y-8">
              <div className="p-8 rounded-2xl bg-[#0f172a] border border-[#232d59] shadow-xl space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>📈</span>
                    <span>Application Audit Trail & History ({historyItems.length})</span>
                  </h3>
                  <button
                    onClick={fetchAppliedHistory}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition border border-slate-700"
                  >
                    🔄 Refresh Audit
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-[#070913] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="p-3">Timestamp</th>
                        <th className="p-3">Platform</th>
                        <th className="p-3">Job Title</th>
                        <th className="p-3">Company</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {historyItems.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-12 text-center text-slate-500 font-sans">
                            Belum ada riwayat lamaran terekam.
                          </td>
                        </tr>
                      ) : (
                        historyItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/30">
                            <td className="p-3 text-slate-400">{item.timestamp || '-'}</td>
                            <td className="p-3 text-indigo-300 font-semibold">{item.platform || '-'}</td>
                            <td className="p-3 text-white font-sans font-medium">{item.title || '-'}</td>
                            <td className="p-3 text-slate-300">{item.company || '-'}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                {item.status || 'Applied'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
