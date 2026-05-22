import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import * as controller from './ingredient-scans.controller.js';

export const ingredientScansRouter = Router();

// 모든 ingredient-scans API는 인증 필수. pet 소유권 검증은 service에서 강제.
ingredientScansRouter.use(requireAuth);

// POST /api/ingredient-scans/confirm — 스캔 결과 확정 저장
ingredientScansRouter.post('/confirm', controller.confirm);

// GET  /api/ingredient-scans?petId=<uuid> — 이력 조회
ingredientScansRouter.get('/', controller.list);
