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
  // multipart/form-data로 오면 "true"/"false" 문자열, JSON으로 오면 boolean — 양쪽 모두 수용.
  // (주의: z.coerce.boolean()은 "false"도 true로 만들므로 사용하면 안 됨)
  neutered: z
    .preprocess(
      (v) => (typeof v === 'string' ? v === 'true' : v),
      z.boolean(),
    )
    .optional()
    .default(false),
  // multipart에서는 JSON 문자열('["닭고기"]')로, JSON 요청에서는 배열로 들어온다.
  allergies: z
    .preprocess((v) => {
      if (typeof v !== 'string') return v;
      if (v.trim() === '') return [];
      try {
        return JSON.parse(v);
      } catch {
        return v; // 파싱 실패 시 원본 유지 → 아래 array 검증에서 거부
      }
    }, z.array(z.string().trim().min(1).max(40)).max(50))
    .optional()
    .default([]),
});

export type CreatePetInput = z.infer<typeof CreatePetSchema>;
