import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import * as ctrl from './vaccinations.controller.js';

// 백신 마스터 목록 — 인증 불필요 (공개 데이터)
export const vaccinesRouter = Router();
vaccinesRouter.get('/', ctrl.listVaccines);

// 펫별 접종 이력 — mergeParams: true 로 :petId 접근
export const vaccinationsRouter = Router({ mergeParams: true });
vaccinationsRouter.use(requireAuth);
vaccinationsRouter.get('/', ctrl.listVaccinations);
vaccinationsRouter.post('/', ctrl.createVaccination);
vaccinationsRouter.delete('/:id', ctrl.deleteVaccination);
