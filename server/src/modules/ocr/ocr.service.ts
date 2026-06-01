import FormData from 'form-data';
import fetch from 'node-fetch';
import { env } from '../../config/env.js';

export type DocType = 'ingredient' | 'receipt' | 'unknown';

export interface OcrResult {
  extractedText: string;
  docType: DocType;
  /** OCR 텍스트의 "제품명" 라벨에서 자동 추출한 값. 못 찾으면 null. */
  productName: string | null;
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
  const productName = deriveProductName(extractedText);
  return { extractedText, docType, productName };
}

// OCR 텍스트에서 "제품명" 라벨 뒤의 값을 추출.
// 한국 패키지 표준 표기: "제품명: 강아지 프리미엄 사료"
// "제 품 명"처럼 글자 사이 공백이 있어도 인식하도록 라벨 사이 \s* 허용.
// 종료 라벨도 동일하게 글자 사이 공백 허용.
// 종료 조건은 (a) 다음 라벨 키워드, (b) 줄바꿈, (c) 텍스트 끝.
export function deriveProductName(text: string): string | null {
  const m = text.match(
    /제\s*품\s*명\s*[:：]?\s*([^\n]+?)(?=\s*(?:원\s*재\s*료|원\s*료|성\s*분|영\s*양\s*성\s*분|보\s*증\s*성\s*분|품\s*목\s*보\s*고|제\s*조\s*원|유\s*통\s*기\s*한|규\s*격|중\s*량|포\s*장)|\n|$)/,
  );
  if (!m) return null;
  const value = m[1]!.trim();
  if (value.length < 2 || value.length > 60) return null;
  return value;
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
    fields: Array<{ inferText: string; lineBreak?: boolean }>;
  }>;
}

// CLOVA V2 General OCR은 각 field에 `lineBreak: true`로 줄 끝을 표시한다.
// 이걸 이용해 같은 줄은 공백, 줄 끝은 \n 으로 합쳐서 레이아웃을 부분 보존한다.
// (예: 패키지 상단의 제품명이 첫 줄로 분리됨 → 타임라인에서 제품명 추출 가능)
function extractText(data: ClovaOcrResponse): string {
  return data.images
    .flatMap((img) => img.fields)
    .reduce((acc, f, i, arr) => {
      const sep = f.lineBreak || i === arr.length - 1 ? '\n' : ' ';
      return acc + f.inferText + sep;
    }, '')
    .trim();
}
