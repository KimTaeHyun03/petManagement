import { HttpError } from '../../middleware/error.js';
import type { CreateWeightInput } from './weights.schema.js';
import {
  isPetOwner,
  getPetProfile,
  listRecordsByPet,
  findPrevRecord,
  insertRecord,
  deleteRecord,
  findStandardWeight,
  type WeightRecordRow,
} from './weights.repo.js';
import { notifyWeightSurge } from './weights.notify.js';

// PLAN §4.3 "정상/과체중/저체중" + StandardWeight 시드 미등재 시 'unknown'
export type WeightJudgement = 'normal' | 'over' | 'under' | 'unknown';

export interface PublicWeightRecord {
  id: string;
  petId: string;
  weight: number;
  recordedAt: string;
  memo: string | null;
  createdAt: string;
}

// 기록 추가 응답 — 클라이언트가 판정/급변 카드를 띄울 수 있게 함께 반환
export interface CreateWeightResult {
  record: PublicWeightRecord;
  judgement: WeightJudgement;
  /** 직전 기록 대비 ±10% 이상 변동 (PLAN §4.3) */
  surge: boolean;
  /** 직전 기록 대비 변화율(소수, 예: -0.12 = -12%). 직전 기록 없으면 null. */
  deltaRatio: number | null;
}

function toPublic(row: WeightRecordRow): PublicWeightRecord {
  return {
    id: row.id,
    petId: row.pet_id,
    weight: Number(row.weight),
    recordedAt: row.recorded_at.toISOString(),
    memo: row.memo,
    createdAt: row.created_at.toISOString(),
  };
}

function assertOwner(petId: string, userId: string) {
  return isPetOwner(petId, userId).then((ok) => {
    if (!ok) throw new HttpError(403, 'forbidden');
  });
}

function diffMonths(birthISO: string, atISO: string): number {
  const b = new Date(birthISO);
  const a = new Date(atISO);
  return (a.getFullYear() - b.getFullYear()) * 12 + (a.getMonth() - b.getMonth());
}

async function judgeWeight(
  petId: string,
  weight: number,
  recordedAt: string,
): Promise<WeightJudgement> {
  const pet = await getPetProfile(petId);
  if (!pet?.birth) return 'unknown'; // 생년월일 없으면 연령 매칭 불가
  const ageMonths = diffMonths(pet.birth, recordedAt);
  if (ageMonths < 0) return 'unknown';

  const std = await findStandardWeight(pet.species, pet.breed, ageMonths);
  if (!std) return 'unknown';

  const min = Number(std.min_kg);
  const max = Number(std.max_kg);
  if (weight < min) return 'under';
  if (weight > max) return 'over';
  return 'normal';
}

// 직전 기록 대비 ±10% 변동 판정 (PLAN §4.3 / §6)
function detectSurge(prevWeight: number, newWeight: number): { surge: boolean; deltaRatio: number } {
  const deltaRatio = (newWeight - prevWeight) / prevWeight;
  return { surge: Math.abs(deltaRatio) >= 0.1, deltaRatio };
}

export async function listWeights(
  petId: string,
  userId: string,
): Promise<PublicWeightRecord[]> {
  await assertOwner(petId, userId);
  const rows = await listRecordsByPet(petId);
  return rows.map(toPublic);
}

export async function addWeight(
  petId: string,
  userId: string,
  input: CreateWeightInput,
): Promise<CreateWeightResult> {
  await assertOwner(petId, userId);

  const recordedAt = input.recordedAt ?? new Date().toISOString();
  const memo = input.memo ?? null;

  const prev = await findPrevRecord(petId, recordedAt);
  const row = await insertRecord(petId, recordedAt, input.weight, memo);

  const judgement = await judgeWeight(petId, input.weight, recordedAt);

  let surge = false;
  let deltaRatio: number | null = null;
  if (prev) {
    const r = detectSurge(Number(prev.weight), input.weight);
    surge = r.surge;
    deltaRatio = r.deltaRatio;
  }

  // 급변 알림은 fire-and-forget — 메일/DB 실패가 API 응답을 막지 않음.
  // 중복 발송은 weight_alerts.weight_record_id UNIQUE 로 차단.
  if (surge && prev && deltaRatio !== null) {
    void notifyWeightSurge({
      petId,
      weightRecordId: row.id,
      prevWeight: Number(prev.weight),
      newWeight: input.weight,
      deltaRatio,
      recordedAt: row.recorded_at.toISOString(),
    });
  }

  return { record: toPublic(row), judgement, surge, deltaRatio };
}

export async function removeWeight(
  petId: string,
  recordId: string,
  userId: string,
): Promise<void> {
  await assertOwner(petId, userId);
  const deleted = await deleteRecord(recordId, petId);
  if (deleted === 0) throw new HttpError(404, 'record_not_found');
}
