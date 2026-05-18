import { z } from 'zod';

// research_taehyun.md §1.6 정책:
//   - 이메일: 정규화(소문자 + 공백 제거)
//   - 비밀번호: 최소 10자, 최대 ≥64자, 복잡도 강제 X
export const RegisterSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(10).max(128),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;

// 로그인은 회원가입과 정책이 다르다:
//  - 이메일 정규화는 동일 (소문자 + trim)
//  - 비밀번호 길이 검증은 풀어둔다. min 강제 시 응답 코드가 422/400으로 갈라져
//    "사용자 존재 여부" 정보가 노출될 수 있음 (research_taehyun.md §4 통일 메시지).
export const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(128),
});

export type LoginInput = z.infer<typeof LoginSchema>;
