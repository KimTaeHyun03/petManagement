import type { NextFunction, Request, Response } from 'express';
import { SendMessageSchema } from './chatbot.schema.js';
import * as svc from './chatbot.service.js';

// GET /api/pets/:petId/chat
export async function getHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const petId = req.params['petId'] as string;
    const history = await svc.getHistory(petId, req.userId!);
    res.json(history);
  } catch (err) {
    next(err);
  }
}

// POST /api/pets/:petId/chat
export async function sendMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const petId = req.params['petId'] as string;
    const { message } = SendMessageSchema.parse(req.body);
    const answer = await svc.chat(petId, req.userId!, message);
    res.json({ answer });
  } catch (err) {
    next(err);
  }
}
