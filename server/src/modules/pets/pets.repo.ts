import { pool } from '../../db/pool.js';
import type { CreatePetInput } from './pets.schema.js';

export interface PetRow {
  id: string;
  user_id: string;
  name: string;
  species: 'dog' | 'cat';
  breed: string | null;
  birth: string | null; // pg가 DATE를 ISO 문자열로 반환하도록 처리(아래 SELECT에서 ::text)
  gender: 'M' | 'F' | null;
  neutered: boolean;
  allergies_json: string[];
  created_at: Date;
}

const SELECT_COLS =
  'id, user_id, name, species, breed, birth::text AS birth, gender, neutered, allergies_json, created_at';

export async function insertPet(
  userId: string,
  input: CreatePetInput,
): Promise<PetRow> {
  const { rows } = await pool.query<PetRow>(
    `INSERT INTO pets (user_id, name, species, breed, birth, gender, neutered, allergies_json)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
     RETURNING ${SELECT_COLS}`,
    [
      userId,
      input.name,
      input.species,
      input.breed ?? null,
      input.birth ?? null,
      input.gender ?? null,
      input.neutered,
      JSON.stringify(input.allergies),
    ],
  );
  return rows[0]!;
}

export async function listPetsByUser(userId: string): Promise<PetRow[]> {
  const { rows } = await pool.query<PetRow>(
    `SELECT ${SELECT_COLS}
     FROM pets
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId],
  );
  return rows;
}
