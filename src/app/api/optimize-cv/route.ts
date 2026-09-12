import { NextResponse } from 'next/server';
import * as pdfParseModule from 'pdf-parse';
const pdfParse = (pdfParseModule as any).default || pdfParseModule;
import { callGeminiWithFallback } from '@/lib/geminiHelper';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('cv') as File | null;
    const apiKey = (formData.get('apiKey') as string || '').trim();

    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'Gemini API Key wajib diisi terlebih dahulu.' }, { status: 400 });
    }

    if (!file) {
      return NextResponse.json({ success: false, error: 'File CV (PDF / Text) tidak ditemukan.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let cvText = '';
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.pdf')) {
      try {
        const parsed = await pdfParse(buffer);
        cvText = parsed.text;
      } catch (err: any) {
        return NextResponse.json({ success: false, error: `Gagal membaca file PDF CV: ${err.message || err}` }, { status: 400 });
      }
    } else {
      cvText = buffer.toString('utf8');
    }

    if (!cvText || cvText.trim().length < 10) {
      return NextResponse.json({ success: false, error: 'Teks CV terlalu pendek atau kosong.' }, { status: 400 });
    }

    // STEP 1: Career Ops Tailoring & ATS Optimization (Fable 5.1 & Astra Logic — wajib, anti-halu, pro ATS)
    const tailoringPrompt = `
TUGAS: CareerOps Tailoring & ATS Optimization menggunakan [Fable 5.1 & GPT Astra Logic] — surgical precision, zero-fluff, bias-to-action, anti-halu. CV berformat PDF telah di-parse ke teks (pdf-parse). Optimasi harus profesional, ATS-friendly, menekankan value-proposition (sertifikasi Cisco/MTCNA/ISO, kepemimpinan, GRC/Cybersecurity/NIST, IT Audit), hapus filler.

Teks CV Asli (hasil pdf-parse):
---
${cvText.slice(0, 15000)}
---

Berikan hasil dalam format JSON MURNI (tanpa markdown backticks, hanya JSON valid) dengan struktur persis:
{
  "tailoredMarkdownCv": "Full optimized CV content in markdown format...",
  "tailoringSummary": "Analisis ringkas dan keunggulan value-proposition hasil tailoring...",
  "fullName": "Nama Lengkap",
  "email": "email@domain.com",
  "phoneNumber": "Nomor Telepon",
  "domicile": "Kota, Negara",
  "educationLevel": "S2 / S1 / D3",
  "gpa": "3.48",
  "yearsOfExperience": 3,
  "skills": "skill1, skill2, skill3",
  "portfolioUrl": "https://...",
  "githubUrl": "https://...",
  "linkedinUrl": "https://...",
  "expectedSalary": 15000000,
  "searchKeywords": "IT GRC, Network Engineer, Cybersecurity, ISO 27001"
}
`;

    const responseText = await callGeminiWithFallback(apiKey, tailoringPrompt, 0.1);

    let jsonStr = responseText.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```/, '').replace(/```$/, '').trim();
    }

    let extractedData;
    try {
      extractedData = JSON.parse(jsonStr);
    } catch (e) {
      const match = jsonStr.match(/\{[\s\S]*\}/);
      if (match) {
        extractedData = JSON.parse(match[0]);
      } else {
        return NextResponse.json({ success: false, error: 'Gagal memparsing hasil AI Tailoring ke format JSON.' }, { status: 400 });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'CV berhasil di-tailoring & dioptimalkan untuk ATS!',
      data: extractedData
    });

  } catch (error: any) {
    console.error('Error in optimize-cv:', error);
    return NextResponse.json({ success: false, error: error.message || 'Gagal memproses CV' }, { status: 500 });
  }
}
