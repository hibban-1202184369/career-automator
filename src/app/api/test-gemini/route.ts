import { NextResponse } from 'next/server';
import { callGeminiWithFallback } from '@/lib/geminiHelper';
import { getConfig } from '@/lib/config';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const config = getConfig();
    const apiKey = body.geminiApiKey || config.geminiApiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'Gemini API Key belum diisi.' }, { status: 400 });
    }

    const text = await callGeminiWithFallback(apiKey, 'Test connection. Reply with \"OK\".', 0.1);
    return NextResponse.json({ success: true, message: 'Koneksi Gemini API Berhasil!', text });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Gagal terhubung ke Gemini API' }, { status: 500 });
  }
}
