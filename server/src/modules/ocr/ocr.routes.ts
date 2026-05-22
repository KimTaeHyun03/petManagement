import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../../middleware/auth.js';
import * as ocrController from './ocr.controller.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter(_req, file, cb) {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/bmp', 'image/tiff'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('jpg, png, bmp, tiff 형식만 업로드 가능합니다'));
    }
  },
});

export const ocrRouter = Router();

ocrRouter.use(requireAuth);

// POST /api/ocr/scan?petId=<uuid>
// Content-Type: multipart/form-data, field name: "image"
ocrRouter.post('/scan', upload.single('image'), ocrController.scan);
