import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { errorHandler } from './middleware/error.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { petsRouter } from './modules/pets/pets.routes.js';
import { vaccinesRouter, vaccinationsRouter } from './modules/vaccinations/vaccinations.routes.js';
import { runNotificationCheck } from './modules/notifications/notifications.service.js';

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
