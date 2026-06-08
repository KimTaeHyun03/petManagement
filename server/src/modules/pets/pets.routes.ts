import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../../middleware/auth.js';
import * as petsController from './pets.controller.js';

// 프로필 사진 업로드용 — 메모리에 받아 S3로 전달 (OCR 라우터와 동일 패턴, 5MB 제한)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('jpg, png, webp 형식만 업로드 가능합니다'));
    }
  },
});

export const petsRouter = Router();

// 모든 pets API는 인증 필수. user_id 격리는 service/repo에서 강제.
petsRouter.use(requireAuth);

// multipart/form-data — 텍스트 필드 + 선택 이미지(field: "photo")
petsRouter.post('/', upload.single('photo'), petsController.create);
petsRouter.get('/', petsController.listMine);
petsRouter.delete('/:petId', petsController.remove);
