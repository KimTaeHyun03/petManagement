import { pool } from '../../db/pool.js';

export interface WeightRecordRow {
  id: string;
  pet_id: string;
  weight: string; // pg numeric → string
  // TIMESTAMPTZ → pg 기본 Date 객체. service 에서 toISOString() 으로 직렬화.
  // ::text 캐스팅을 쓰면 "2026-05-24 18:30:00+09" 같은 비-ISO 문자열이 나와 클라이언트 Date 파싱이 불안정.
  recorded_at: Date;
  memo: string | null;
  created_at: Date;
}

export interface PetProfileRow {
  species: 'dog' | 'cat';
  breed: string | null;
  birth: string | null; // DATE → ISO string
}

export interface StandardWeightRow {
  min_kg: string;
  max_kg: string;
}

const SELECT_COLS =
  'id, pet_id, weight::text AS weight, recorded_at, memo, created_at';

// 펫의 소유자 확인 (CLAUDE.md "펫 단위 격리")
export async function isPetOwner(petId: string, userId: string): Promise<boolean> {
  const { rows } = await pool.query<{ exists: boolean }>(
    'SELECT EXISTS(SELECT 1 FROM pets WHERE id = $1 AND user_id = $2) AS exists',
    [petId, userId],
  );
  return rows[0]?.exists ?? false;
}

// 판정 로직용 펫 프로필 (StandardWeight 매칭 키)
export async function getPetProfile(petId: string): Promise<PetProfileRow | null> {
  const { rows } = await pool.query<PetProfileRow>(
    'SELECT species, breed, birth::text AS birth FROM pets WHERE id = $1',
    [petId],
  );
  return rows[0] ?? null;
}

// 추세 조회 (최신순)
export async function listRecordsByPet(petId: string): Promise<WeightRecordRow[]> {
  const { rows } = await pool.query<WeightRecordRow>(
    `SELECT ${SELECT_COLS}
     FROM weight_records
     WHERE pet_id = $1
     ORDER BY recorded_at DESC, created_at DESC`,
    [petId],
  );
  return rows;
}

// 급변 판정용: 새 기록의 recorded_at 직전(strict less than) 마지막 기록
export async function findPrevRecord(
  petId: string,
  recordedAt: string,
): Promise<WeightRecordRow | null> {
  const { rows } = await pool.query<WeightRecordRow>(
    `SELECT ${SELECT_COLS}
     FROM weight_records
     WHERE pet_id = $1 AND recorded_at < $2
     ORDER BY recorded_at DESC
     LIMIT 1`,
    [petId, recordedAt],
  );
  return rows[0] ?? null;
}

export async function insertRecord(
  petId: string,
  recordedAt: string,
  weight: number,
  memo: string | null,
): Promise<WeightRecordRow> {
  const { rows } = await pool.query<WeightRecordRow>(
    `INSERT INTO weight_records (pet_id, weight, recorded_at, memo)
     VALUES ($1, $2, $3, $4)
     RETURNING ${SELECT_COLS}`,
    [petId, weight, recordedAt, memo],
  );
  return rows[0]!;
}

export async function deleteRecord(id: string, petId: string): Promise<number> {
  const { rowCount } = await pool.query(
    'DELETE FROM weight_records WHERE id = $1 AND pet_id = $2',
    [id, petId],
  );
  return rowCount ?? 0;
}

// 급변 알림 발송 대상의 주인 이메일·펫 이름 조회
export async function getOwnerEmailAndPetName(
  petId: string,
): Promise<{ email: string; petName: string } | null> {
  const { rows } = await pool.query<{ email: string; pet_name: string }>(
    `SELECT u.email, p.name AS pet_name
     FROM pets p
     JOIN users u ON u.id = p.user_id
     WHERE p.id = $1`,
    [petId],
  );
  const r = rows[0];
  return r ? { email: r.email, petName: r.pet_name } : null;
}

// 급변 알림 발송 이력 기록. weight_record_id UNIQUE → 동일 기록 중복 발송 방지.
// 이미 존재하면 ON CONFLICT DO NOTHING 으로 조용히 스킵 + false 반환.
export async function insertAlert(
  petId: string,
  weightRecordId: string,
  prevWeight: number,
  newWeight: number,
  deltaRatio: number,
): Promise<boolean> {
  const { rowCount } = await pool.query(
    `INSERT INTO weight_alerts (pet_id, weight_record_id, prev_weight, new_weight, delta_ratio)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (weight_record_id) DO NOTHING`,
    [petId, weightRecordId, prevWeight, newWeight, deltaRatio],
  );
  return (rowCount ?? 0) > 0;
}

// StandardWeight 마스터 lookup — species + 연령(개월) 일치, breed 일치를 우선하고 없으면 종 전체(breed IS NULL).
// 시드 데이터가 비어 있으면 null 반환 → 판정 'unknown'.
export async function findStandardWeight(
  species: 'dog' | 'cat',
  breed: string | null,
  ageMonths: number,
): Promise<StandardWeightRow | null> {
  const { rows } = await pool.query<StandardWeightRow>(
    `SELECT min_kg::text AS min_kg, max_kg::text AS max_kg
     FROM standard_weights
     WHERE species = $1
       AND $3 >= age_min_months
       AND $3 <  age_max_months
       AND (breed = $2 OR breed IS NULL)
     ORDER BY (breed IS NULL) ASC  -- 품종 일치를 우선
     LIMIT 1`,
    [species, breed, ageMonths],
  );
  return rows[0] ?? null;
}
