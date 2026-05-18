import { env } from '../../config/env.js';
import { HttpError } from '../../middleware/error.js';
import {
  DUMMY_PASSWORD_HASH,
  hashPassword,
  isPwnedPassword,
  verifyPassword,
} from '../../utils/password.js';
import type { LoginInput, RegisterInput } from './auth.schema.js';
import { createUser, findById, findByEmail } from './auth.repo.js';

export interface PublicUser {
  id: string;
  email: string;
}

// research_taehyun.md §5.1 흐름:
//   1) 입력 검증(zod) → 2) 이메일 정규화(zod에서 처리) → 3) 중복 검사
//   4) Pwned Passwords 차단 → 5) Argon2id 해시 → 6) INSERT → 7) 자동 로그인 X
//
// research §5.2: 회원가입 단계에서는 enumeration UX 우선 (트레이드오프 결정).
// → 중복 이메일은 409로 명시.
export async function register(input: RegisterInput): Promise<PublicUser> {
  if (await findByEmail(input.email)) {
    throw new HttpError(409, 'email_already_registered');
  }
  // env.skipPwnedCheck는 prod에서 강제 false (config/env.ts 가드)
  if (!env.skipPwnedCheck && (await isPwnedPassword(input.password))) {
    throw new HttpError(400, 'password_compromised');
  }
  const pwHash = await hashPassword(input.password);
  const user = await createUser(input.email, pwHash);
  return { id: user.id, email: user.email };
}

// research_taehyun.md §4 표준 로그인:
//   1) 이메일로 사용자 조회
//   2) 사용자 없어도 더미 해시 비교 → 응답시간 일정 (타이밍 공격 방어)
//   3) argon2.verify
//   4) 실패 메시지 통일 → "invalid_credentials"
export async function login(input: LoginInput): Promise<PublicUser> {
  const user = await findByEmail(input.email);
  const hash = user?.pw_hash ?? DUMMY_PASSWORD_HASH;
  const ok = await verifyPassword(hash, input.password);
  if (!ok || !user) {
    throw new HttpError(401, 'invalid_credentials');
  }
  return { id: user.id, email: user.email };
}

export async function getById(userId: string): Promise<PublicUser> {
  const user = await findById(userId);
  if (!user) throw new HttpError(401, 'unauthenticated');
  return { id: user.id, email: user.email };
}
