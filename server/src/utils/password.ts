import argon2 from 'argon2';
import { createHash } from 'node:crypto';

// research_taehyun.md §1.7 — OWASP 권장 Argon2id 파라미터 (최소 권장값)
const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

export function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, ARGON2_OPTIONS);
}

export function verifyPassword(hash: string, plain: string): Promise<boolean> {
  return argon2.verify(hash, plain);
}

// research_taehyun.md §4 (타이밍 공격 방어): 사용자가 존재하지 않아도
// 동일한 시간 동안 더미 해시 비교를 수행해 응답시간을 일정하게 만든다.
// 프로세스 시작 시 1회 생성된 더미 해시 — 평문은 임의값.
export const DUMMY_PASSWORD_HASH: string = await argon2.hash(
  '__dummy_password_for_timing_safety__',
  ARGON2_OPTIONS,
);

// Pwned Passwords API (k-Anonymity): SHA-1 앞 5자만 전송, 응답에서 suffix 매칭
// 평문/전체 해시 전송 없음. 외부 호출 실패 시 가입을 막지 않도록 fail-open.
export async function isPwnedPassword(plain: string): Promise<boolean> {
  const sha1 = createHash('sha1').update(plain).digest('hex').toUpperCase();
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);
  try {
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'Add-Padding': 'true' },
    });
    if (!res.ok) return false;
    const body = await res.text();
    return body.split('\n').some((line) => line.startsWith(`${suffix}:`));
  } catch {
    return false;
  }
}
