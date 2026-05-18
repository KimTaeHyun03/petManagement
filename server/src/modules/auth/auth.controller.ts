import type { NextFunction, Request, Response } from 'express';
import { env, isProd } from '../../config/env.js';
import { ACCESS_COOKIE } from '../../middleware/auth.js';
import { signAccessToken } from '../../utils/token.js';
import { LoginSchema, RegisterSchema } from './auth.schema.js';
import * as authService from './auth.service.js';

// research_taehyun.md §2: httpOnly + Secure(prod) + SameSite=Strict.
// dev(http://localhost)에서는 secure: true면 브라우저가 쿠키를 무시하므로 isProd로 가드.
// maxAge는 JWT 만료(env.jwtAccessTtl)와 별도 — 문자열 파싱은 피하고 단순 매핑을 둔다.
function cookieMaxAgeMs(): number {
  const ttl = env.jwtAccessTtl;
  const match = /^(\d+)([smhd])$/.exec(ttl);
  if (!match) return 2 * 60 * 60 * 1000; // 기본 2h
  const n = Number(match[1]);
  const unit = match[2];
  const mult = unit === 's' ? 1000
    : unit === 'm' ? 60_000
    : unit === 'h' ? 3_600_000
    : 86_400_000;
  return n * mult;
}

function setAuthCookie(res: Response, token: string): void {
  res.cookie(ACCESS_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    maxAge: cookieMaxAgeMs(),
    path: '/',
  });
}

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const input = RegisterSchema.parse(req.body);
    const user = await authService.register(input);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const input = LoginSchema.parse(req.body);
    const user = await authService.login(input);
    const token = signAccessToken(user.id);
    setAuthCookie(res, token);
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
}

// Access-only 정책에서 logout = 쿠키 제거.
// (Refresh Rotation 도입 시 DB row 삭제 추가 — TODO.md)
export function logout(_req: Request, res: Response) {
  res.clearCookie(ACCESS_COOKIE, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    path: '/',
  });
  res.status(204).end();
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await authService.getById(req.userId!);
    res.json(user);
  } catch (err) {
    next(err);
  }
}
