import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../utils/token.js';
import { HttpError } from './error.js';

// 쿠키 이름 — login/logout과 공유. 변경 시 한 곳만 고치도록 상수화.
export const ACCESS_COOKIE = 'access_token';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

// research_taehyun.md §2: httpOnly 쿠키에 담긴 Access Token을 검증.
// 토큰이 없거나 위변조면 401. 만료(expired)도 동일하게 401로 통일.
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[ACCESS_COOKIE];
  if (!token || typeof token !== 'string') {
    return next(new HttpError(401, 'unauthenticated'));
  }
  try {
    const { sub } = verifyAccessToken(token);
    req.userId = sub;
    next();
  } catch {
    next(new HttpError(401, 'unauthenticated'));
  }
}
