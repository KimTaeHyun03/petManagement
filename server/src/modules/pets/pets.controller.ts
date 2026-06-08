import type { NextFunction, Request, Response } from 'express';
import { s3Enabled } from '../../config/env.js';
import { HttpError } from '../../middleware/error.js';
import { uploadImage } from '../../utils/s3.js';
import { CreatePetSchema } from './pets.schema.js';
import * as petsService from './pets.service.js';

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const input = CreatePetSchema.parse(req.body);

    // 사진은 선택. 첨부됐으면 S3에 올리고 URL만 DB에 저장한다.
    let photoUrl: string | null = null;
    if (req.file) {
      if (!s3Enabled) {
        throw new HttpError(503, '이미지 저장소(S3)가 설정되지 않아 사진을 업로드할 수 없습니다');
      }
      photoUrl = await uploadImage(req.file.buffer, req.file.mimetype, 'pet', req.userId!);
    }

    const pet = await petsService.createPet(req.userId!, input, photoUrl);
    res.status(201).json(pet);
  } catch (err) {
    next(err);
  }
}

export async function listMine(req: Request, res: Response, next: NextFunction) {
  try {
    const pets = await petsService.listMyPets(req.userId!);
    res.json(pets);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await petsService.deletePet(req.userId!, req.params['petId'] as string);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}
