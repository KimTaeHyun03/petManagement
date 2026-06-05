import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { getUserAlerts } from './notifications.controller.js';

export const notificationsRouter = Router();

notificationsRouter.get('/', requireAuth, getUserAlerts);
