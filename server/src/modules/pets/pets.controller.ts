import type { NextFunction, Request, Response } from 'express';
import { CreatePetSchema } from './pets.schema.js';
import * as petsService from './pets.service.js';

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const input = CreatePetSchema.parse(req.body);
    const pet = await petsService.createPet(req.userId!, input);
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
