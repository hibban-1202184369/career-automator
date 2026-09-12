import { NextRequest, NextResponse } from 'next/server';
import { startBot } from '@/lib/automation';

export const dynamic = 'force-dynamic';

function isBotRunning() {
  return (global as any).isBotRunning === true;
}
function setBotRunning(running: boolean) {
  (global as any).isBotRunning = running;
}

function parseConfigFromQuery(searchParams: URLSearchParams): any {
  const configParam = searchParams.get('config');
  if (!configParam) return undefined;
  try {
    // URL-encoded, decode
    const decoded = decodeURIComponent(configParam);
    return JSON.parse(decoded);
  } catch (e) {
    console.warn('Failed to parse config query param:', e);
    return undefined;
  }
}

async function startBotSSE(response: NextResponse, mode: string, config?: any) {
  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  const sendLog = async (message: string) => {
    try {
      await writer.write(
        encoder.encode(`data: ${JSON.stringify({ message, timestamp: new Date().toISOString() })}\n\n`)
      );
    } catch (err) {
      console.warn('SSE client disconnected:', err);
    }
  };

  // Generate unique session ID
  const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // Launch bot asynchronously with provided config (stateless!)
  (async () => {
    try {
      await startBot(async (msg) => {
        await sendLog(msg);
      }, mode || 'headless', config || undefined);
    } catch (err: any) {
      await sendLog(`🚨 Fatal error: ${err.message || err}`);
    } finally {
      try {
        await writer.close();
      } catch (e) {}
    }
  })();

  // Return streaming response
  const readableStream = responseStream.readable;
  return new NextResponse(readableStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// GET: start a stateless bot session with query params (mode, config)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('mode') || 'headless';
  const config = parseConfigFromQuery(searchParams);

  if (mode || config) {
    // Start bot with SSE streaming
    return startBotSSE(new NextResponse(), mode, config);
  } else {
    // No start params: treat as stop signal (keep backward compatibility)
    setBotRunning(false);
    return NextResponse.json({ success: true, message: 'Bot stop signal triggered (GET).' });
  }
}

// POST: start a stateless bot session with body { mode, config } or stop if empty
export async function POST(request: NextRequest) {
  try {
    // Check if body is present and parse
    const contentType = request.headers.get('content-type') || '';
    let body: { mode?: string; config?: any } | undefined;
    if (contentType.includes('application/json')) {
      try {
        const text = await request.text();
        if (text) body = JSON.parse(text);
      } catch (e) {
        console.warn('Failed to parse JSON body:', e);
      }
    }

    if (body && (body.mode || body.config !== undefined)) {
      // Start bot with provided config
      return startBotSSE(new NextResponse(), body.mode || 'headless', body.config);
    } else {
      // Stop all running bots
      setBotRunning(false);
      return NextResponse.json({ success: true, message: 'Bot stop signal triggered (POST).' });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  setBotRunning(false);
  return NextResponse.json({ success: true, message: 'Bot stop signal triggered (DELETE).' });
}
