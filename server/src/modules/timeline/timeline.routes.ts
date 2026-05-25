import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import * as ctrl from './timeline.controller.js';

// 펫별 통합 타임라인 (read-only)
export const timelineRouter = Router({ mergeParams: true });
timelineRouter.use(requireAuth);
timelineRouter.get('/', ctrl.getTimeline);
