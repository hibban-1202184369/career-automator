import { GoogleGenerativeAI } from '@google/generative-ai';

const MODELS_TO_TRY = ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.5-flash', 'gemini-3.1-pro-preview', 'gemini-2.5-flash'];

export const SYSTEM_FABLE_ASTRA_PROMPT = `
[SYSTEM REASONING DNA: Fable 5.1 & GPT-6 Astra]
- Surgical precision, structured reasoning, zero-fluff.
- Bias towards action, maximum factual accuracy, zero hallucination.
- Strict adherence to ATS standards and professional corporate values.
`;

export async function callGeminiWithFallback(apiKey: string, prompt: string, temperature: number = 0.1): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  let lastError: any = null;

  for (const modelName of MODELS_TO_TRY) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature,
          maxOutputTokens: 8192,
        }
      });

      const fullPrompt = `${SYSTEM_FABLE_ASTRA_PROMPT}\n\n${prompt}`;
      const result = await model.generateContent(fullPrompt);
      const text = result.response.text();
      if (text && text.trim().length > 0) {
        return text;
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`[Gemini Fallback] Model ${modelName} failed: ${err.message || err}. Trying next...`);
    }
  }

  throw new Error(`Semua model Gemini gagal merespons. Error terakhir: ${lastError?.message || 'Unknown error'}`);
}
