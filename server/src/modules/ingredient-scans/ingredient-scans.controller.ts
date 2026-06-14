import type { NextFunction, Request, Response } from 'express';
import { s3Enabled } from '../../config/env.js';
import { uploadImage } from '../../utils/s3.js';
import { ConfirmScanSchema } from './ingredient-scans.schema.js';
import * as service from './ingredient-scans.service.js';

const DISCLAIMER = '본 정보는 참고용이며 의학적 진단이 아닙니다. 이상 증상 발견 시 동물병원을 방문해 주세요.';

// POST /api/ingredient-scans/confirm
// OCR 스캔 결과를 사용자가 확정 → DB 저장. 원본 성분표 이미지가 첨부됐으면 S3에도 보관한다.
export async function confirm(req: Request, res: Response, next: NextFunction) {
  try {
    const input = ConfirmScanSchema.parse(req.body);

    // 이미지는 부가 정보 — 업로드가 실패해도 사용자가 확정한 스캔 기록 저장은 막지 않는다.
    // (S3 미설정 환경에서도 OCR 기록은 정상 저장돼야 한다.)
    let imageUrl: string | null = null;
    if (req.file && s3Enabled) {
      try {
        imageUrl = await uploadImage(req.file.buffer, req.file.mimetype, 'ocr', req.userId!);
      } catch {
        imageUrl = null;
      }
    }

    const scan = await service.confirmScan(input, req.userId!, imageUrl);
    res.status(201).json({ ...scan, disclaimer: DISCLAIMER });
  } catch (err) {
    next(err);
  }
}

// GET /api/ingredient-scans?petId=<uuid>
// 특정 펫의 성분표 스캔 이력 조회
export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const petId = req.query['petId'];
    if (typeof petId !== 'string') {
      res.status(400).json({ message: 'petId 쿼리 파라미터가 필요합니다' });
      return;
    }
    const scans = await service.listScans(petId, req.userId!);
    res.json(scans);
  } catch (err) {
    next(err);
  }
}
