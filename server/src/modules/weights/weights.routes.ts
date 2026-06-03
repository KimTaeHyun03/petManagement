import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import * as ctrl from './weights.controller.js';

// 펫별 체중 기록 — mergeParams: true 로 :petId 접근
export const weightsRouter = Router({ mergeParams: true });
weightsRouter.use(requireAuth);
weightsRouter.get('/', ctrl.listWeights);
weightsRouter.post('/', ctrl.createWeight);
weightsRouter.delete('/:id', ctrl.deleteWeight);
