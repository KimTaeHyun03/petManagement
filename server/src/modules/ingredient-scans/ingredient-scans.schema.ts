import { z } from 'zod';

// POST /api/ingredient-scans/confirm
export const ConfirmScanSchema = z.object({
  petId:                z.string().uuid(),
  extractedText:        z.string().min(1),
  matchedFoodsJson:     z.array(z.object({
    id:       z.string().uuid(),
    name:     z.string(),
    severity: z.enum(['high', 'medium', 'low']),
    symptoms: z.string().nullable(),
  })),
  matchedAllergiesJson: z.array(z.string()),
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
