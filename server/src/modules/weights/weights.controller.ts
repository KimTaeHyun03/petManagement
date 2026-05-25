import type { NextFunction, Request, Response } from 'express';
import { CreateWeightSchema } from './weights.schema.js';
import * as svc from './weights.service.js';

// GET /api/pets/:petId/weights
export async function listWeights(req: Request, res: Response, next: NextFunction) {
  try {
    const petId = req.params['petId'] as string;
    const records = await svc.listWeights(petId, req.userId!);
    res.json(records);
  } catch (err) {
    next(err);
  }
}

// POST /api/pets/:petId/weights
export async function createWeight(req: Request, res: Response, next: NextFunction) {
  try {
    const petId = req.params['petId'] as string;
    const input = CreateWeightSchema.parse(req.body);
    const result = await svc.addWeight(petId, req.userId!, input);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/pets/:petId/weights/:id
export async function deleteWeight(req: Request, res: Response, next: NextFunction) {
  try {
    const petId = req.params['petId'] as string;
    const id = req.params['id'] as string;
    await svc.removeWeight(petId, id, req.userId!);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}
