import { z } from 'zod';

// GET /api/pets/:petId/timeline?limit=&before=
// - limit: 한 페이지 항목 수 (기본 50, 최대 200)
// - before: 커서 — 이 ISO 시각보다 이전 이벤트만 (occurred_at < before)
export const TimelineQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  before: z
    .string()
    .datetime({ offset: true, message: 'before_must_be_iso8601' })
    .optional(),
});

export type TimelineQuery = z.infer<typeof TimelineQuerySchema>;
