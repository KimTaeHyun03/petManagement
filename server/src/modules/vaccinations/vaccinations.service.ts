import type { CreateVaccinationInput } from './vaccinations.schema.js';
import {
  listVaccines,
  findVaccine,
  listRecordsByPet,
  insertRecord,
  deleteRecord,
  isPetOwner,
  type VaccineRow,
  type VaccinationRecordRow,
} from './vaccinations.repo.js';

export interface PublicVaccine {
  id: number;
  species: 'dog' | 'cat' | 'both';
  name: string;
  recommendWeeks: number | null;
  doseTotal: number;
  intervalWeeks: number | null;
  boosterWeeks: number | null;
  mandatory: boolean;
  severity: 'high' | 'low';
}

export interface PublicVaccinationRecord {
  id: string;
  petId: string;
  vaccineId: number;
  vaccineName: string;
  vaccineMandatory: boolean;
  vaccineSeverity: 'high' | 'low';
  doseNo: number;
  doseTotal: number;
  vaccinatedAt: string;
  nextDueAt: string | null;
  /** 다음 접종까지 남은 일수. 음수면 기한 초과. */
  daysUntilNext: number | null;
  source: 'manual' | 'ocr';
  memo: string | null;
  createdAt: string;
}

function toPublicVaccine(row: VaccineRow): PublicVaccine {
  return {
    id: row.id,
    species: row.species,
    name: row.name,
    recommendWeeks: row.recommend_weeks,
    doseTotal: row.dose_total,
    intervalWeeks: row.interval_weeks,
    boosterWeeks: row.booster_weeks,
    mandatory: row.mandatory,
    severity: row.severity,
  };
}

function calcDaysUntilNext(nextDueAt: string | null): number | null {
  if (!nextDueAt) return null;
  const diff = new Date(nextDueAt).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function toPublicRecord(row: VaccinationRecordRow): PublicVaccinationRecord {
  return {
    id: row.id,
    petId: row.pet_id,
    vaccineId: row.vaccine_id,
    vaccineName: row.vaccine_name,
    vaccineMandatory: row.vaccine_mandatory,
    vaccineSeverity: row.vaccine_severity,
    doseNo: row.dose_no,
    doseTotal: row.dose_total,
    vaccinatedAt: row.vaccinated_at,
    nextDueAt: row.next_due_at,
    daysUntilNext: calcDaysUntilNext(row.next_due_at),
    source: row.source,
    memo: row.memo,
    createdAt: row.created_at.toISOString(),
  };
}

// 접종일 기준으로 다음 권장일 계산 (PLAN §4.6)
function calcNextDueAt(
  vaccinatedAt: string,
  vaccine: VaccineRow,
  doseNo: number,
): string | null {
  const addWeeks = (date: Date, weeks: number): string => {
    const d = new Date(date);
    d.setDate(d.getDate() + weeks * 7);
    return d.toISOString().split('T')[0]!;
  };

  const base = new Date(vaccinatedAt);

  // 아직 차수가 남았으면 다음 차수 간격으로 계산
  if (doseNo < vaccine.dose_total && vaccine.interval_weeks) {
    return addWeeks(base, vaccine.interval_weeks);
  }
  // 최종 차수 완료 후 재접종이 있으면 booster 간격으로 계산
  if (doseNo >= vaccine.dose_total && vaccine.booster_weeks) {
    return addWeeks(base, vaccine.booster_weeks);
  }
  return null;
}

export async function getVaccineList(species: 'dog' | 'cat'): Promise<PublicVaccine[]> {
  const rows = await listVaccines(species);
  return rows.map(toPublicVaccine);
}

export async function getVaccinations(
  petId: string,
  userId: string,
): Promise<PublicVaccinationRecord[]> {
  if (!(await isPetOwner(petId, userId))) {
    throw Object.assign(new Error('forbidden'), { status: 403, code: 'forbidden' });
  }
  const rows = await listRecordsByPet(petId);
  return rows.map(toPublicRecord);
}

export async function addVaccination(
  petId: string,
  userId: string,
  input: CreateVaccinationInput,
): Promise<PublicVaccinationRecord> {
  if (!(await isPetOwner(petId, userId))) {
    throw Object.assign(new Error('forbidden'), { status: 403, code: 'forbidden' });
  }

  const vaccine = await findVaccine(input.vaccineId);
  if (!vaccine) {
    throw Object.assign(new Error('vaccine not found'), { status: 400, code: 'vaccine_not_found' });
  }

  const nextDueAt = calcNextDueAt(input.vaccinatedAt, vaccine, input.doseNo);
  const row = await insertRecord(petId, input, nextDueAt);
  return toPublicRecord(row);
}

export async function removeVaccination(
  petId: string,
  recordId: string,
  userId: string,
): Promise<void> {
  if (!(await isPetOwner(petId, userId))) {
    throw Object.assign(new Error('forbidden'), { status: 403, code: 'forbidden' });
  }
  const deleted = await deleteRecord(recordId, petId);
  if (deleted === 0) {
    throw Object.assign(new Error('not found'), { status: 404, code: 'record_not_found' });
  }
}
