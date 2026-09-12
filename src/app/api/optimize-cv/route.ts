import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as pdfParseModule from 'pdf-parse';
const pdfParse = (pdfParseModule as any).default || pdfParseModule;

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
        return NextResponse.json({ success: false, error: `Gagal membaca file PDF CV: ${err.message || err}. Pastikan file PDF tidak terenkripsi.` }, { status: 400 });
      }
    } else {
      cvText = buffer.toString('utf8');
    }

    if (!cvText || cvText.trim().length < 10) {
      return NextResponse.json({ success: false, error: 'Teks CV terlalu pendek atau kosong.' }, { status: 400 });
    }

    // Call Gemini to analyze & optimize
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
Anda adalah expert ATS CV Optimizer & Career Coach profesional.
Analisis teks CV berikut, optimalkan untuk standar ATS, dan ekstrak informasinya DALAM FORMAT JSON MURNI (tanpa teks pengantar, tanpa markdown backticks, hanya objek JSON valid) dengan struktur persis seperti berikut:

{
  "fullName": "Nama Lengkap",
  "email": "email@domain.com",
  "phoneNumber": "08123456789",
  "domicile": "Kota, Negara",
  "educationLevel": "S2 / S1 / D3",
  "gpa": "3.50",
  "yearsOfExperience": 3,
  "skills": "skill1, skill2, skill3",
  "portfolioUrl": "https://...",
  "githubUrl": "https://...",
  "linkedinUrl": "https://...",
  "expectedSalary": 10000000,
  "searchKeywords": "Keyword1, Keyword2, Keyword3",
  "optimizedSummary": "Ringkasan profesional yang dioptimalkan untuk ATS..."
}

Berikut adalah teks CV Kandidat:
---
${cvText.slice(0, 15000)}
---
`;

    let responseText = '';
    try {
      const result = await model.generateContent(prompt);
      responseText = result.response.text();
    } catch (geminiErr: any) {
      return NextResponse.json({ success: false, error: `Gemini API Error: ${geminiErr.message || geminiErr}` }, { status: 400 });
    }

    // Clean up markdown code blocks if any
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
        try {
          extractedData = JSON.parse(match[0]);
        } catch (innerE) {
          return NextResponse.json({ success: false, error: 'Gagal memparsing respons AI ke format JSON.', raw: jsonStr.slice(0, 200) }, { status: 400 });
        }
      } else {
        return NextResponse.json({ success: false, error: 'Format JSON dari AI tidak valid.', raw: jsonStr.slice(0, 200) }, { status: 400 });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'CV berhasil dioptimalkan dan diekstrak!',
      data: extractedData
    });

  } catch (error: any) {
    console.error('Error optimizing CV:', error);
    return NextResponse.json({ success: false, error: error.message || 'Gagal memproses CV' }, { status: 500 });
  }
}
