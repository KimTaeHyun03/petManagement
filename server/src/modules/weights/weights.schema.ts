import { z } from 'zod';

// PLAN §4.3 입력 항목: 날짜(시간 포함) + 몸무게(kg). memo는 ERD에 있는 선택 항목.
export const CreateWeightSchema = z.object({
  // ISO 8601 (예: 2026-05-24T09:30:00Z 또는 2026-05-24T18:30:00+09:00)
  // 클라이언트가 보내지 않으면 서비스에서 현재 시각으로 채운다.
  recordedAt: z
    .string()
    .datetime({ offset: true, message: 'recorded_at_must_be_iso8601' })
    .optional(),
  // kg. 소수점 둘째 자리까지(NUMERIC(5,2)).
  weight: z.number().positive().max(999.99),
  memo: z.string().trim().max(200).optional(),
});

export type CreateWeightInput = z.infer<typeof CreateWeightSchema>;
