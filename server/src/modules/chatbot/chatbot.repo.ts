import { pool } from '../../db/pool.js';

export interface PetContext {
  name: string;
  species: string;
  breed: string | null;
  birthDate: string | null;
  allergies: string[];
  recentWeights: Array<{ weight: number; recordedAt: string }>;
  upcomingVaccinations: Array<{ name: string; dueAt: string }>;
  vaccinationHistory: Array<{ name: string; vaccinatedAt: string; nextDueAt: string | null }>;
  recentScans: Array<{ productName: string | null; matchedFoods: string[]; scannedAt: string }>;
  vaccineSchedule: Array<{
    name: string;
    recommendWeeks: number | null;
    doseTotal: number;
    intervalWeeks: number | null;
    boosterWeeks: number | null;
    mandatory: boolean;
  }>;
}

export async function loadPetContext(petId: string, userId: string): Promise<PetContext | null> {
  const { rows: petRows } = await pool.query<{
    name: string; species: string; breed: string | null; birth: string | null; allergies_json: string[];
  }>(
    'SELECT name, species, breed, birth::text AS birth, allergies_json FROM pets WHERE id = $1 AND user_id = $2',
    [petId, userId],
  );
  if (!petRows[0]) return null;
  const pet = petRows[0];

  const { rows: weightRows } = await pool.query<{ weight: string; recorded_at: Date }>(
    'SELECT weight, recorded_at FROM weight_records WHERE pet_id = $1 ORDER BY recorded_at DESC LIMIT 10',
    [petId],
  );

  const { rows: vacRows } = await pool.query<{ name: string; next_due_at: string }>(
    `SELECT v.name, r.next_due_at::text
     FROM vaccination_records r
     JOIN vaccines v ON v.id = r.vaccine_id
     WHERE r.pet_id = $1 AND r.next_due_at IS NOT NULL AND r.next_due_at >= CURRENT_DATE
     ORDER BY r.next_due_at ASC LIMIT 5`,
    [petId],
  );

  // 완료한 접종 이력 (이미 맞춘 기록 — 챗봇이 "무엇을 접종했는지" 알 수 있도록)
  const { rows: vacHistRows } = await pool.query<{
    name: string; vaccinated_at: string; next_due_at: string | null;
  }>(
    `SELECT v.name, r.vaccinated_at::text, r.next_due_at::text
     FROM vaccination_records r
     JOIN vaccines v ON v.id = r.vaccine_id
     WHERE r.pet_id = $1
     ORDER BY r.vaccinated_at DESC, r.created_at DESC
     LIMIT 10`,
    [petId],
  );

  const { rows: scanRows } = await pool.query<{
    product_name: string | null;
    matched_foods_json: Array<{ name: string }>;
    scanned_at: Date;
  }>(
    'SELECT product_name, matched_foods_json, scanned_at FROM ingredient_scans WHERE pet_id = $1 ORDER BY scanned_at DESC LIMIT 3',
    [petId],
  );

  // 해당 종의 표준 예방접종 일정 마스터 (일반 스케줄 질문에 DB 근거를 제공)
  const { rows: vaccineMasterRows } = await pool.query<{
    name: string;
    recommend_weeks: number | null;
    dose_total: number;
    interval_weeks: number | null;
    booster_weeks: number | null;
    mandatory: boolean;
  }>(
    `SELECT DISTINCT name, recommend_weeks, dose_total, interval_weeks, booster_weeks, mandatory
       FROM vaccines
      WHERE species = $1 OR species = 'both'
      ORDER BY mandatory DESC, recommend_weeks ASC`,
    [pet.species],
  );

  return {
    name: pet.name,
    species: pet.species,
    breed: pet.breed,
    birthDate: pet.birth,
    allergies: pet.allergies_json ?? [],
    recentWeights: weightRows.map((r) => ({
      weight: Number(r.weight),
      recordedAt: r.recorded_at.toISOString(),
    })),
    upcomingVaccinations: vacRows.map((r) => ({ name: r.name, dueAt: r.next_due_at })),
    vaccinationHistory: vacHistRows.map((r) => ({
      name: r.name,
      vaccinatedAt: r.vaccinated_at,
      nextDueAt: r.next_due_at,
    })),
    recentScans: scanRows.map((r) => ({
      productName: r.product_name,
      matchedFoods: (r.matched_foods_json ?? []).map((f) => f.name),
      scannedAt: r.scanned_at.toISOString(),
    })),
    vaccineSchedule: vaccineMasterRows.map((r) => ({
      name: r.name,
      recommendWeeks: r.recommend_weeks,
      doseTotal: r.dose_total,
      intervalWeeks: r.interval_weeks,
      boosterWeeks: r.booster_weeks,
      mandatory: r.mandatory,
    })),
  };
}

export interface ChatLogRow {
  id: string;
  role: 'user' | 'assistant';
  message: string;
  created_at: Date;
}

export async function loadChatHistory(
  petId: string,
  userId: string,
  limit = 50,
): Promise<ChatLogRow[]> {
  const { rows } = await pool.query<ChatLogRow>(
    `SELECT id, role, message, created_at
     FROM chat_logs
     WHERE pet_id = $1 AND user_id = $2
     ORDER BY created_at ASC
     LIMIT $3`,
    [petId, userId, limit],
  );
  return rows;
}

export async function saveChatLog(
  userId: string,
  petId: string,
  role: 'user' | 'assistant',
  message: string,
  contextSnapshot: unknown,
): Promise<void> {
  await pool.query(
    `INSERT INTO chat_logs (user_id, pet_id, role, message, context_snapshot_json)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, petId, role, message, JSON.stringify(contextSnapshot)],
  );
}
