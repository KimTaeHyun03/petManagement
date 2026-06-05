import type { CreatePetInput } from './pets.schema.js';
import { insertPet, listPetsByUser, deletePetById, type PetRow } from './pets.repo.js';
import { HttpError } from '../../middleware/error.js';

export interface PublicPet {
  id: string;
  name: string;
  species: 'dog' | 'cat';
  breed: string | null;
  birth: string | null;
  gender: 'M' | 'F' | null;
  neutered: boolean;
  allergies: string[];
  createdAt: string;
}

function toPublic(row: PetRow): PublicPet {
  return {
    id: row.id,
    name: row.name,
    species: row.species,
    breed: row.breed,
    birth: row.birth,
    gender: row.gender,
    neutered: row.neutered,
    allergies: row.allergies_json ?? [],
    createdAt: row.created_at.toISOString(),
  };
}

export async function createPet(
  userId: string,
  input: CreatePetInput,
): Promise<PublicPet> {
  const row = await insertPet(userId, input);
  return toPublic(row);
}

export async function listMyPets(userId: string): Promise<PublicPet[]> {
  const rows = await listPetsByUser(userId);
  return rows.map(toPublic);
}

export async function deletePet(userId: string, petId: string): Promise<void> {
  const deleted = await deletePetById(petId, userId);
  if (!deleted) throw new HttpError(404, 'pet_not_found');
}
