import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../../middleware/auth.js';
import * as authController from './auth.controller.js';

export const authRouter = Router();

// research_taehyun.md §5.6: 회원가입 IP당 10분 3회
const registerLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 3,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

// research_taehyun.md §6: 로그인 IP당 1분 5회 실패 → 5분 잠금 (지수 backoff)
// 1차 구현은 고정 윈도우. 성공 요청은 카운트에서 제외해 정상 사용 방해 최소화.
const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

authRouter.post('/register', registerLimiter, authController.register);
authRouter.post('/login', loginLimiter, authController.login);
authRouter.post('/logout', authController.logout);
authRouter.get('/me', requireAuth, authController.me);
