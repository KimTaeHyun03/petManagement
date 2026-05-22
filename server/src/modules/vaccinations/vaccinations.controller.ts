import type { NextFunction, Request, Response } from 'express';
import { CreateVaccinationSchema } from './vaccinations.schema.js';
import * as svc from './vaccinations.service.js';

// GET /api/vaccines?species=dog|cat
export async function listVaccines(req: Request, res: Response, next: NextFunction) {
  try {
    const species = req.query['species'] as string;
    if (species !== 'dog' && species !== 'cat') {
      res.status(400).json({ error: 'invalid_request', message: 'species must be dog or cat' });
      return;
    }
    const vaccines = await svc.getVaccineList(species);
    res.json(vaccines);
  } catch (err) {
    next(err);
  }
}

// GET /api/pets/:petId/vaccinations
export async function listVaccinations(req: Request, res: Response, next: NextFunction) {
  try {
    const petId = req.params['petId'] as string;
    const records = await svc.getVaccinations(petId, req.userId!);
    res.json(records);
  } catch (err) {
    next(err);
  }
}

// POST /api/pets/:petId/vaccinations
export async function createVaccination(req: Request, res: Response, next: NextFunction) {
  try {
    const petId = req.params['petId'] as string;
    const input = CreateVaccinationSchema.parse(req.body);
    const record = await svc.addVaccination(petId, req.userId!, input);
    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/pets/:petId/vaccinations/:id
export async function deleteVaccination(req: Request, res: Response, next: NextFunction) {
  try {
    const petId = req.params['petId'] as string;
    const id = req.params['id'] as string;
    await svc.removeVaccination(petId, id, req.userId!);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}
