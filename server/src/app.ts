import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { errorHandler } from './middleware/error.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { petsRouter } from './modules/pets/pets.routes.js';
import { ocrRouter } from './modules/ocr/ocr.routes.js';
import { ingredientScansRouter } from './modules/ingredient-scans/ingredient-scans.routes.js';

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
  app.use('/api/ocr', ocrRouter);
  app.use('/api/ingredient-scans', ingredientScansRouter);

  app.use(errorHandler);
  return app;
}
