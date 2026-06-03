import type { NextFunction, Request, Response } from 'express';
import { TimelineQuerySchema } from './timeline.schema.js';
import * as svc from './timeline.service.js';

// GET /api/pets/:petId/timeline?limit=&before=
export async function getTimeline(req: Request, res: Response, next: NextFunction) {
  try {
    const petId = req.params['petId'] as string;
    const query = TimelineQuerySchema.parse(req.query);
    const page = await svc.getTimeline(petId, req.userId!, query);
    res.json(page);
  } catch (err) {
    next(err);
  }
}
