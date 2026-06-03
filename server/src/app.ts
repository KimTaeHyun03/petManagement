import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { errorHandler } from './middleware/error.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { petsRouter } from './modules/pets/pets.routes.js';
import { vaccinesRouter, vaccinationsRouter } from './modules/vaccinations/vaccinations.routes.js';
import { weightsRouter } from './modules/weights/weights.routes.js';
import { timelineRouter } from './modules/timeline/timeline.routes.js';
import { runNotificationCheck } from './modules/notifications/notifications.service.js';
import { ocrRouter } from './modules/ocr/ocr.routes.js';
import { ingredientScansRouter } from './modules/ingredient-scans/ingredient-scans.routes.js';
import { chatbotRouter } from './modules/chatbot/chatbot.routes.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/pets', petsRouter);
  app.use('/api/vaccines', vaccinesRouter);
  app.use('/api/pets/:petId/vaccinations', vaccinationsRouter);
  app.use('/api/pets/:petId/weights', weightsRouter);
  app.use('/api/pets/:petId/timeline', timelineRouter);
  app.use('/api/pets/:petId/chat', chatbotRouter);
  app.use('/api/ocr', ocrRouter);
  app.use('/api/ingredient-scans', ingredientScansRouter);

  // 알림 수동 트리거 (개발·테스트용)
  app.post('/api/admin/notify-check', async (_req, res, next) => {
    try {
      await runNotificationCheck();
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  app.use(errorHandler);
  return app;
}
