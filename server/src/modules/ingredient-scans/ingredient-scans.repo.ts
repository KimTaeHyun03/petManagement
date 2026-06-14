import { pool } from '../../db/pool.js';
import type { ConfirmScanInput } from './ingredient-scans.schema.js';

export interface IngredientScanRow {
  id:                     string;
  pet_id:                 string;
  image_url:              string | null;
  extracted_text:         string;
  matched_foods_json:     object[];
  matched_allergies_json: string[];
  product_name:           string | null;
  scanned_at:             Date;
}

// 성분표 스캔 결과 저장 (사용자 확정 후에만 호출). imageUrl은 선택 — 없으면 NULL.
export async function insertIngredientScan(
  input: ConfirmScanInput,
  imageUrl: string | null = null,
): Promise<IngredientScanRow> {
  const { rows } = await pool.query<IngredientScanRow>(
    `INSERT INTO ingredient_scans
       (pet_id, image_url, extracted_text, matched_foods_json, matched_allergies_json, product_name)
     VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6)
     RETURNING *`,
    [
      input.petId,
      imageUrl,
      input.extractedText,
      JSON.stringify(input.matchedFoodsJson),
      JSON.stringify(input.matchedAllergiesJson),
      input.productName ?? null,
    ],
  );
  return rows[0]!;
}

// 펫의 스캔 이력 조회 (타임라인용)
export async function listScansByPet(petId: string): Promise<IngredientScanRow[]> {
  const { rows } = await pool.query<IngredientScanRow>(
    `SELECT * FROM ingredient_scans
     WHERE pet_id = $1
     ORDER BY scanned_at DESC`,
    [petId],
  );
  return rows;
}

// DangerFood 전체 조회 (매칭용)
export interface DangerFoodRow {
  id:           string;
  name:         string;
  name_en:      string | null;
  toxic_compound: string | null;
  symptoms:     string | null;
  severity:     'high' | 'medium' | 'low';
}

export async function getAllDangerFoods(): Promise<DangerFoodRow[]> {
  const { rows } = await pool.query<DangerFoodRow>(
    'SELECT id, name, name_en, toxic_compound, symptoms, severity FROM danger_foods',
  );
  return rows;
}

// 펫의 allergies_json 조회
export async function getPetAllergies(petId: string): Promise<string[]> {
  const { rows } = await pool.query<{ allergies_json: string[] }>(
    'SELECT allergies_json FROM pets WHERE id = $1',
    [petId],
  );
  return rows[0]?.allergies_json ?? [];
}

// 펫의 user_id 조회 (소유권 검증용)
export async function getPetOwnerId(petId: string): Promise<string | null> {
  const { rows } = await pool.query<{ user_id: string }>(
    'SELECT user_id FROM pets WHERE id = $1',
    [petId],
  );
  return rows[0]?.user_id ?? null;
}
