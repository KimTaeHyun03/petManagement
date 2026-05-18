import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';

// research_taehyun.md §2: HS256 고정. alg=none 공격 방어를 위해
// verify 시 algorithms를 반드시 명시한다.
const ALGO = 'HS256' as const;

export interface AccessTokenPayload {
  sub: string; // user id (UUID)
}

export function signAccessToken(userId: string): string {
  const opts: SignOptions = {
    algorithm: ALGO,
    expiresIn: env.jwtAccessTtl as SignOptions['expiresIn'],
  };
  return jwt.sign({ sub: userId }, env.jwtAccessSecret, opts);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.jwtAccessSecret, { algorithms: [ALGO] });
  if (typeof decoded === 'string' || typeof decoded.sub !== 'string') {
    throw new Error('invalid_token_payload');
  }
  return { sub: decoded.sub };
}
