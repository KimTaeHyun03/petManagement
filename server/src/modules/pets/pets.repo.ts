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
  photo_url: string | null;
  created_at: Date;
}

const SELECT_COLS =
  'id, user_id, name, species, breed, birth::text AS birth, gender, neutered, allergies_json, photo_url, created_at';

export async function insertPet(
  userId: string,
  input: CreatePetInput,
  photoUrl: string | null = null,
): Promise<PetRow> {
  const { rows } = await pool.query<PetRow>(
    `INSERT INTO pets (user_id, name, species, breed, birth, gender, neutered, allergies_json, photo_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)
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
      photoUrl,
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

// user_id 검증 포함 — 다른 유저의 펫을 삭제할 수 없음
export async function deletePetById(petId: string, userId: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    'DELETE FROM pets WHERE id = $1 AND user_id = $2',
    [petId, userId],
  );
  return (rowCount ?? 0) > 0;
}
