import { z } from 'zod';

// multipart/form-data로 오면 JSON 문자열, JSON 요청으로 오면 이미 배열 — 양쪽 모두 수용.
// (confirm은 원본 이미지를 함께 받기 위해 multipart로 호출된다.)
const parseJsonArray = (v: unknown) => {
  if (typeof v !== 'string') return v;
  if (v.trim() === '') return [];
  try {
    return JSON.parse(v);
  } catch {
    return v; // 파싱 실패 시 원본 유지 → 아래 array 검증에서 거부
  }
};

// POST /api/ingredient-scans/confirm
export const ConfirmScanSchema = z.object({
  petId:                z.string().uuid(),
  extractedText:        z.string().min(1),
  matchedFoodsJson:     z.preprocess(parseJsonArray, z.array(z.object({
    id:       z.string().uuid(),
    name:     z.string(),
    severity: z.enum(['high', 'medium', 'low']),
    symptoms: z.string().nullable(),
  }))),
  matchedAllergiesJson: z.preprocess(parseJsonArray, z.array(z.string())),
  // 사용자가 확인·수정한 제품명. 빈 문자열은 null로 정규화.
  productName: z
    .string()
    .trim()
    .max(120)
    .nullable()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export type ConfirmScanInput = z.infer<typeof ConfirmScanSchema>;
