import { HttpError } from '../../middleware/error.js';
import type { ConfirmScanInput } from './ingredient-scans.schema.js';
import {
  getAllDangerFoods,
  getPetAllergies,
  getPetOwnerId,
  insertIngredientScan,
  listScansByPet,
  type DangerFoodRow,
  type IngredientScanRow,
} from './ingredient-scans.repo.js';

export interface MatchedFood {
  id:       string;
  name:     string;
  severity: 'high' | 'medium' | 'low';
  symptoms: string | null;
}

export interface MatchResult {
  dangerFoods: MatchedFood[];
  allergies:   string[];
}

export interface PublicScan {
  id:                   string;
  petId:                string;
  extractedText:        string;
  matchedFoods:         MatchedFood[];
  matchedAllergies:     string[];
  productName:          string | null;
  scannedAt:            string;
}

// ─── 매칭 로직 ─────────────────────────────────────────────────────────────────

// OCR 텍스트 vs DangerFood + 펫 알러지
// 소유권 검증도 여기서 수행 (ocr.controller → matchIngredients 호출 시점에 petId·userId 전달)
export async function matchIngredients(
  extractedText: string,
  petId: string,
  userId: string,
): Promise<MatchResult> {
  await assertPetOwnership(petId, userId);

  const [dangerFoods, petAllergies] = await Promise.all([
    getAllDangerFoods(),
    getPetAllergies(petId),
  ]);

  const normalizedText = normalizeText(extractedText);

  // DangerFood 키워드 매칭 — name(한국어) 또는 name_en(영문) 포함 여부
  const matchedFoods: MatchedFood[] = dangerFoods
    .filter((f) => foodMatchesText(f, normalizedText))
    .map((f) => ({
      id:       f.id,
      name:     f.name,
      severity: f.severity,
      symptoms: f.symptoms,
    }));

  // 펫 알러지 키워드 매칭
  const matchedAllergies: string[] = petAllergies.filter((allergen) =>
    normalizedText.includes(normalizeText(allergen)),
  );

  return { dangerFoods: matchedFoods, allergies: matchedAllergies };
}

// ─── confirm 저장 ──────────────────────────────────────────────────────────────

export async function confirmScan(
  input: ConfirmScanInput,
  userId: string,
): Promise<PublicScan> {
  await assertPetOwnership(input.petId, userId);
  const row = await insertIngredientScan(input);
  return toPublic(row);
}

// ─── 이력 조회 ─────────────────────────────────────────────────────────────────

export async function listScans(petId: string, userId: string): Promise<PublicScan[]> {
  await assertPetOwnership(petId, userId);
  const rows = await listScansByPet(petId);
  return rows.map(toPublic);
}

// ─── 내부 유틸 ─────────────────────────────────────────────────────────────────

async function assertPetOwnership(petId: string, userId: string) {
  const ownerId = await getPetOwnerId(petId);
  if (!ownerId) throw new HttpError(404, '반려동물을 찾을 수 없습니다');
  if (ownerId !== userId) throw new HttpError(403, '이 반려동물에 접근할 권한이 없습니다');
}

function normalizeText(text: string): string {
  // 공백·특수문자 제거 후 소문자로 통일 → 부분 매칭 정확도 향상
  return text.replace(/[\s\-_.,·•\/]/g, '').toLowerCase();
}

function foodMatchesText(food: DangerFoodRow, normalizedText: string): boolean {
  const nameKo = normalizeText(food.name);
  const nameEn = food.name_en ? normalizeText(food.name_en) : null;
  return (
    normalizedText.includes(nameKo) ||
    (nameEn !== null && normalizedText.includes(nameEn))
  );
}

function toPublic(row: IngredientScanRow): PublicScan {
  return {
    id:               row.id,
    petId:            row.pet_id,
    extractedText:    row.extracted_text,
    matchedFoods:     row.matched_foods_json as MatchedFood[],
    matchedAllergies: row.matched_allergies_json as string[],
    productName:      row.product_name,
    scannedAt:        row.scanned_at.toISOString(),
  };
}
