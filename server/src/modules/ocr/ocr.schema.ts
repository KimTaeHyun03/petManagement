import { z } from 'zod';

// POST /api/ocr/scan — query param으로 pet_id 수신 (파일은 multipart)
export const ScanQuerySchema = z.object({
  petId: z.string().uuid('petId는 UUID 형식이어야 합니다'),
});

export type ScanQuery = z.infer<typeof ScanQuerySchema>;
