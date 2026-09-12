import path from 'path';
import fs from 'fs';
import { AppConfig } from './config';

export interface BotSession {
  sessionId: string;
  config: AppConfig;
  status: 'running' | 'stopped' | 'finished';
  logs: string[];
  startedAt: number;
}

const SESSIONS_FILE = path.join(process.cwd(), 'data', 'sessions.json');

function ensureDir() {
  const dir = path.dirname(SESSIONS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readSessions(): Map<string, BotSession> {
  try {
    if (!fs.existsSync(SESSIONS_FILE)) return new Map();
    const raw = fs.readFileSync(SESSIONS_FILE, 'utf8');
    const arr: BotSession[] = JSON.parse(raw);
    return new Map(arr.map((s) => [s.sessionId, s]));
  } catch {
    return new Map();
  }
}

function writeSessions(sessions: Map<string, BotSession>) {
  ensureDir();
  const arr = Array.from(sessions.values());
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(arr, null, 2), 'utf8');
}

export function createSession(config: AppConfig): BotSession {
  const sessionId = `bot_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const session: BotSession = {
    sessionId,
    config,
    status: 'running',
    logs: [],
    startedAt: Date.now(),
  };
  const sessions = readSessions();
  sessions.set(sessionId, session);
  writeSessions(sessions);
  return session;
}

export function getSession(sessionId: string): BotSession | undefined {
  return readSessions().get(sessionId);
}

export function updateSessionLog(sessionId: string, message: string) {
  const sessions = readSessions();
  const session = sessions.get(sessionId);
  if (session) {
    session.logs.push(`[${new Date().toISOString()}] ${message}`);
    if (session.logs.length > 500) session.logs = session.logs.slice(-500);
    sessions.set(sessionId, session);
    writeSessions(sessions);
  }
}

export function stopSession(sessionId: string) {
  const sessions = readSessions();
  const session = sessions.get(sessionId);
  if (session) {
    session.status = 'stopped';
    sessions.set(sessionId, session);
    writeSessions(sessions);
  }
}

export function finishSession(sessionId: string) {
  const sessions = readSessions();
  const session = sessions.get(sessionId);
  if (session) {
    session.status = 'finished';
    sessions.set(sessionId, session);
    writeSessions(sessions);
  }
}
