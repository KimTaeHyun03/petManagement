import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../../middleware/auth.js';
import * as controller from './ingredient-scans.controller.js';

// 원본 성분표 이미지를 S3로 보내기 위해 메모리에 받는다 (OCR 라우터와 동일 패턴, 10MB 제한).
// 이미지는 선택 — 없거나 S3 미설정이어도 confirm은 정상 저장된다(image_url=NULL).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/bmp', 'image/tiff'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('jpg, png, bmp, tiff 형식만 업로드 가능합니다'));
    }
  },
});

export const ingredientScansRouter = Router();

// 모든 ingredient-scans API는 인증 필수. pet 소유권 검증은 service에서 강제.
ingredientScansRouter.use(requireAuth);

// POST /api/ingredient-scans/confirm — 스캔 결과 확정 저장 (multipart: 텍스트 필드 + 선택 이미지 "image")
ingredientScansRouter.post('/confirm', upload.single('image'), controller.confirm);

// GET  /api/ingredient-scans?petId=<uuid> — 이력 조회
ingredientScansRouter.get('/', controller.list);
