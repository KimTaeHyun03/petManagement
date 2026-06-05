import type { Request, Response, NextFunction } from 'express';
import { queryUserAlerts } from './notifications.service.js';

export async function getUserAlerts(req: Request, res: Response, next: NextFunction) {
  try {
    const alerts = await queryUserAlerts(req.userId!);
    res.json(alerts);
  } catch (err) {
    next(err);
  }
}
