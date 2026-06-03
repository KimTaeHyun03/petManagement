import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import * as ctrl from './chatbot.controller.js';

export const chatbotRouter = Router({ mergeParams: true });
chatbotRouter.use(requireAuth);
chatbotRouter.get('/', ctrl.getHistory);
chatbotRouter.post('/', ctrl.sendMessage);
