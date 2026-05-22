import FormData from 'form-data';
import fetch from 'node-fetch';
import { env } from '../../config/env.js';

export type DocType = 'ingredient' | 'receipt' | 'unknown';

export interface OcrResult {
  extractedText: string;
  docType: DocType;
}

// ─── CLOVA OCR 호출 ───────────────────────────────────────────────────────────

export async function callClova(
  imageBuffer: Buffer,
  mimetype: string,
  originalName: string,
): Promise<string> {
  // CLOVA General OCR은 multipart/form-data로 이미지와 message JSON을 함께 전송
  const message = JSON.stringify({
    version: 'V2',
    requestId: crypto.randomUUID(),
    timestamp: Date.now(),
    images: [
      {
        format: mimetypeToFormat(mimetype),
        name: originalName,
      },
    ],
  });

  const form = new FormData();
  form.append('message', message, { contentType: 'application/json' });
  form.append('file', imageBuffer, {
    filename: originalName,
    contentType: mimetype,
  });

  const response = await fetch(env.clovaOcrInvokeUrl, {
    method: 'POST',
    headers: {
      'X-OCR-SECRET': env.clovaOcrSecret,
      ...form.getHeaders(),
    },
    body: form,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`CLOVA OCR 오류 (${response.status}): ${body}`);
  }

  const data = (await response.json()) as ClovaOcrResponse;
  return extractText(data);
}

// ─── 문서 분류 ─────────────────────────────────────────────────────────────────
// PLAN.md §3.2 기준 키워드

const INGREDIENT_KEYWORDS = ['원재료', '성분', '조단백질', '조지방', '조섬유', '수분', '회분', '원료', '영양성분'];
const RECEIPT_KEYWORDS    = ['결제', '영수증', '동물병원', '합계', '부가세', '백신', '접종', '예방접종', '진료'];

export function classifyDoc(text: string): DocType {
  const t = text.replace(/\s/g, '');
  const ingredientScore = INGREDIENT_KEYWORDS.filter((kw) => t.includes(kw)).length;
  const receiptScore    = RECEIPT_KEYWORDS.filter((kw) => t.includes(kw)).length;

  if (ingredientScore === 0 && receiptScore === 0) return 'unknown';
  return ingredientScore >= receiptScore ? 'ingredient' : 'receipt';
}

export async function scanImage(
  imageBuffer: Buffer,
  mimetype: string,
  originalName: string,
): Promise<OcrResult> {
  const extractedText = await callClova(imageBuffer, mimetype, originalName);
  const docType = classifyDoc(extractedText);
  return { extractedText, docType };
}

// ─── 내부 유틸 ─────────────────────────────────────────────────────────────────

function mimetypeToFormat(mimetype: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg':  'jpg',
    'image/png':  'png',
    'image/tiff': 'tiff',
    'image/bmp':  'bmp',
    'image/webp': 'jpg', // CLOVA는 webp 미지원 → jpg로 선언 (업로드 단에서 jpeg만 허용)
  };
  return map[mimetype] ?? 'jpg';
}

interface ClovaOcrResponse {
  images: Array<{
    fields: Array<{ inferText: string }>;
  }>;
}

function extractText(data: ClovaOcrResponse): string {
  return (
    data.images
      .flatMap((img) => img.fields)
      .map((f) => f.inferText)
      .join(' ')
      .trim()
  );
}
