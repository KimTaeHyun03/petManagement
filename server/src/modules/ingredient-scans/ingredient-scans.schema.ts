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
});

export type ConfirmScanInput = z.infer<typeof ConfirmScanSchema>;
