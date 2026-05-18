import { z } from 'zod';

// PLAN.md §4.2 등록 항목 + §5 ERD 컬럼명 그대로.
// - species: 강아지/고양이 우선 (PLAN §2)
// - allergies: 문자열 배열 (성분표 매칭 키 — PLAN §4.5)
// - 현재 체중은 WeightRecord 영역(김기연)이라 1차 등록에선 받지 않는다.
export const CreatePetSchema = z.object({
  name: z.string().trim().min(1).max(40),
  species: z.enum(['dog', 'cat']),
  breed: z.string().trim().max(60).optional(),
  // YYYY-MM-DD — Postgres DATE로 캐스팅됨
  birth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'birth_must_be_yyyy_mm_dd')
    .optional(),
  gender: z.enum(['M', 'F']).optional(),
  neutered: z.boolean().optional().default(false),
  allergies: z
    .array(z.string().trim().min(1).max(40))
    .max(50)
    .optional()
    .default([]),
});

export type CreatePetInput = z.infer<typeof CreatePetSchema>;
