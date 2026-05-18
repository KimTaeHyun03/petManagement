import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import * as petsController from './pets.controller.js';

export const petsRouter = Router();

// 모든 pets API는 인증 필수. user_id 격리는 service/repo에서 강제.
petsRouter.use(requireAuth);

petsRouter.post('/', petsController.create);
petsRouter.get('/', petsController.listMine);
