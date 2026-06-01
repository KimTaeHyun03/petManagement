import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../../middleware/error.js';
import { ScanQuerySchema } from './ocr.schema.js';
import * as ocrService from './ocr.service.js';
import * as ingredientScansService from '../ingredient-scans/ingredient-scans.service.js';

const DISCLAIMER = '본 정보는 참고용이며 의학적 진단이 아닙니다. 이상 증상 발견 시 동물병원을 방문해 주세요.';

// POST /api/ocr/scan
// - multipart: field "image" (단일 파일)
// - query:     petId (UUID)
// 처리 결과를 반환하되 DB에는 저장하지 않음 — 사용자 확정 후 /api/ingredient-scans/confirm 호출
export async function scan(req: Request, res: Response, next: NextFunction) {
  try {
    const { petId } = ScanQuerySchema.parse(req.query);
    const userId = req.userId!;

    const file = req.file;
    if (!file) {
      throw new HttpError(400, '이미지 파일이 필요합니다 (field: image)');
    }

    // OCR 호출 + 문서 분류
    const { extractedText, docType, productName } = await ocrService.scanImage(
      file.buffer,
      file.mimetype,
      file.originalname,
    );

    // 성분표인 경우에만 위험 성분·알러지 매칭
    let matches: Awaited<ReturnType<typeof ingredientScansService.matchIngredients>> | null = null;
    if (docType === 'ingredient') {
      matches = await ingredientScansService.matchIngredients(extractedText, petId, userId);
    }

    res.json({
      docType,
      extractedText,
      productName,
      matches,
      disclaimer: DISCLAIMER,
    });
  } catch (err) {
    next(err);
  }
}
