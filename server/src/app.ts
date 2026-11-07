import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env, isProd } from './config/env.js';
import { errorHandler } from './middleware/error.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { petsRouter } from './modules/pets/pets.routes.js';
import { vaccinesRouter, vaccinationsRouter } from './modules/vaccinations/vaccinations.routes.js';
import { weightsRouter } from './modules/weights/weights.routes.js';
import { timelineRouter } from './modules/timeline/timeline.routes.js';
import { runNotificationCheck } from './modules/notifications/notifications.service.js';
import { notificationsRouter } from './modules/notifications/notifications.routes.js';
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
  app.use('/api/notifications', notificationsRouter);

  // 알림 트리거 (Cloud Scheduler·수동 테스트용)
  // CRON_SECRET이 설정돼 있으면 `Authorization: Bearer <CRON_SECRET>` 헤더가 필요하다.
  // 운영(prod)에서 CRON_SECRET이 없으면 거부하고, 개발 환경에서만 열어 둔다.
  app.post('/api/admin/notify-check', async (req, res, next) => {
    try {
      if (env.cronSecret) {
        const given = req.header('authorization') ?? '';
        if (given !== `Bearer ${env.cronSecret}`) {
          res.status(401).json({ error: 'unauthorized' });
          return;
        }
      } else if (isProd) {
        res.status(403).json({ error: 'disabled' });
        return;
      }
      await runNotificationCheck();
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  // 빌드된 프론트엔드 서빙 (단일 컨테이너 배포). 폴더가 없으면(로컬 개발) 건너뛴다.
  const staticDir = path.resolve(process.cwd(), env.staticDir);
  if (fs.existsSync(path.join(staticDir, 'index.html'))) {
    app.use(express.static(staticDir));
    // SPA 라우팅: /api 가 아닌 GET 요청은 index.html 로 응답
    app.use((req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
      res.sendFile(path.join(staticDir, 'index.html'));
    });
  }

  app.use(errorHandler);
  return app;
}
