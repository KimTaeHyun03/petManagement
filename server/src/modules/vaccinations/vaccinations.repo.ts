import { pool } from '../../db/pool.js';
import type { CreateVaccinationInput } from './vaccinations.schema.js';

export interface VaccineRow {
  id: number;
  species: 'dog' | 'cat' | 'both';
  name: string;
  recommend_weeks: number | null;
  dose_total: number;
  interval_weeks: number | null;
  booster_weeks: number | null;
  mandatory: boolean;
  severity: 'high' | 'low';
}

export interface VaccinationRecordRow {
  id: string;
  pet_id: string;
  vaccine_id: number;
  vaccine_name: string;
  vaccine_mandatory: boolean;
  vaccine_severity: 'high' | 'low';
  dose_no: number;
  dose_total: number;
  vaccinated_at: string;
  next_due_at: string | null;
  source: 'manual' | 'ocr';
  memo: string | null;
  created_at: Date;
}

// 백신 마스터 목록 (종 필터 가능)
export async function listVaccines(species: 'dog' | 'cat'): Promise<VaccineRow[]> {
  const { rows } = await pool.query<VaccineRow>(
    `SELECT * FROM vaccines
     WHERE species = $1 OR species = 'both'
     ORDER BY mandatory DESC, severity DESC, id`,
    [species],
  );
  return rows;
}

// 단일 백신 조회
export async function findVaccine(id: number): Promise<VaccineRow | null> {
  const { rows } = await pool.query<VaccineRow>(
    'SELECT * FROM vaccines WHERE id = $1',
    [id],
  );
  return rows[0] ?? null;
}

// 접종 이력 목록 (펫 기준, 최신순)
export async function listRecordsByPet(petId: string): Promise<VaccinationRecordRow[]> {
  const { rows } = await pool.query<VaccinationRecordRow>(
    `SELECT
       r.id, r.pet_id, r.vaccine_id,
       v.name        AS vaccine_name,
       v.mandatory   AS vaccine_mandatory,
       v.severity    AS vaccine_severity,
       r.dose_no,
       v.dose_total,
       r.vaccinated_at::text AS vaccinated_at,
       r.next_due_at::text   AS next_due_at,
       r.source, r.memo, r.created_at
     FROM vaccination_records r
     JOIN vaccines v ON v.id = r.vaccine_id
     WHERE r.pet_id = $1
     ORDER BY r.vaccinated_at DESC, r.created_at DESC`,
    [petId],
  );
  return rows;
}

// 접종 기록 추가
export async function insertRecord(
  petId: string,
  input: CreateVaccinationInput,
  nextDueAt: string | null,
): Promise<VaccinationRecordRow> {
  const { rows } = await pool.query<VaccinationRecordRow>(
    `INSERT INTO vaccination_records
       (pet_id, vaccine_id, dose_no, vaccinated_at, next_due_at, source, memo)
     VALUES ($1, $2, $3, $4, $5, 'manual', $6)
     RETURNING
       id, pet_id, vaccine_id,
       (SELECT name     FROM vaccines WHERE id = $2) AS vaccine_name,
       (SELECT mandatory FROM vaccines WHERE id = $2) AS vaccine_mandatory,
       (SELECT severity  FROM vaccines WHERE id = $2) AS vaccine_severity,
       dose_no,
       (SELECT dose_total FROM vaccines WHERE id = $2) AS dose_total,
       vaccinated_at::text, next_due_at::text,
       source, memo, created_at`,
    [petId, input.vaccineId, input.doseNo, input.vaccinatedAt, nextDueAt, input.memo ?? null],
  );
  return rows[0]!;
}

// 접종 기록 삭제 (삭제된 행 수 반환)
export async function deleteRecord(id: string, petId: string): Promise<number> {
  const { rowCount } = await pool.query(
    'DELETE FROM vaccination_records WHERE id = $1 AND pet_id = $2',
    [id, petId],
  );
  return rowCount ?? 0;
}

// 펫의 소유자 확인 (사용자-펫 권한 검증 — CLAUDE.md "펫 단위 격리")
export async function isPetOwner(petId: string, userId: string): Promise<boolean> {
  const { rows } = await pool.query<{ exists: boolean }>(
    'SELECT EXISTS(SELECT 1 FROM pets WHERE id = $1 AND user_id = $2) AS exists',
    [petId, userId],
  );
  return rows[0]?.exists ?? false;
}
