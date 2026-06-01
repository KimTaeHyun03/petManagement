import { HttpError } from '../../middleware/error.js';
import { deriveProductName } from '../ocr/ocr.service.js';
import type { TimelineQuery } from './timeline.schema.js';
import { isPetOwner, loadTimeline, type TimelineRow } from './timeline.repo.js';

// PLAN §4.7 통합 타임라인 — 외부 노출 이벤트 형태.
// payload 형상은 source 별로 다르므로 discriminated union 으로 노출.
export type TimelineEvent =
  | {
      type: 'weight';
      id: string;
      petId: string;
      occurredAt: string;
      weight: number;
      memo: string | null;
      /** 직전 기록 대비 ±10% 급변으로 알림이 발송된 기록 (weight_alerts 매칭) */
      surge: boolean;
      /** surge 시점의 변화율(소수). 매칭 없으면 null. */
      deltaRatio: number | null;
    }
  | {
      type: 'vaccination';
      id: string;
      petId: string;
      occurredAt: string;
      vaccineId: number;
      vaccineName: string;
      mandatory: boolean;
      severity: 'high' | 'low';
      doseNo: number;
      doseTotal: number;
      source: 'manual' | 'ocr';
      nextDueAt: string | null;
      memo: string | null;
    }
  | {
      type: 'ingredient_scan';
      id: string;
      petId: string;
      occurredAt: string;
      matchedFoods: Array<{ id: string; name: string; severity: string; symptoms: string | null }>;
      matchedAllergies: string[];
      extractedTextPreview: string;
      /** OCR 텍스트 첫 줄에서 추출한 제품명 후보 (성분표 상단에 보통 위치). 없거나 길면 null. */
      productName: string | null;
    };

export interface TimelinePage {
  events: TimelineEvent[];
  /** 다음 페이지 커서. events 마지막 항목의 occurredAt. 더 없으면 null. */
  nextBefore: string | null;
}

function toEvent(row: TimelineRow): TimelineEvent {
  const base = { id: row.id, petId: row.pet_id, occurredAt: row.occurred_at.toISOString() };
  const p = row.payload;
  switch (row.type) {
    case 'weight':
      return {
        ...base,
        type: 'weight',
        weight: Number(p['weight']),
        memo: (p['memo'] as string | null) ?? null,
        surge: Boolean(p['surge']),
        deltaRatio:
          p['deltaRatio'] === null || p['deltaRatio'] === undefined
            ? null
            : Number(p['deltaRatio']),
      };
    case 'vaccination':
      return {
        ...base,
        type: 'vaccination',
        vaccineId: Number(p['vaccineId']),
        vaccineName: String(p['vaccineName']),
        mandatory: Boolean(p['mandatory']),
        severity: p['severity'] as 'high' | 'low',
        doseNo: Number(p['doseNo']),
        doseTotal: Number(p['doseTotal']),
        source: p['source'] as 'manual' | 'ocr',
        nextDueAt: (p['nextDueAt'] as string | null) ?? null,
        memo: (p['memo'] as string | null) ?? null,
      };
    case 'ingredient_scan': {
      const preview = String(p['extractedTextPreview'] ?? '');
      // 저장된 product_name이 우선. NULL이면 (마이그레이션 이전 스캔) 텍스트에서 추출 시도.
      const storedName = (p['productName'] as string | null) ?? null;
      return {
        ...base,
        type: 'ingredient_scan',
        matchedFoods:
          (p['matchedFoods'] as Array<{
            id: string;
            name: string;
            severity: string;
            symptoms: string | null;
          }>) ?? [],
        matchedAllergies: (p['matchedAllergies'] as string[]) ?? [],
        extractedTextPreview: preview,
        productName: storedName ?? deriveProductName(preview),
      };
    }
  }
}

export async function getTimeline(
  petId: string,
  userId: string,
  query: TimelineQuery,
): Promise<TimelinePage> {
  if (!(await isPetOwner(petId, userId))) {
    throw new HttpError(403, 'forbidden');
  }

  const rows = await loadTimeline(petId, query.limit, query.before ?? null);
  const events = rows.map(toEvent);

  // 다음 페이지가 있을 가능성: limit 만큼 꽉 채워졌으면 마지막 항목의 occurredAt 을 커서로.
  const nextBefore =
    events.length === query.limit && events.length > 0
      ? events[events.length - 1]!.occurredAt
      : null;

  return { events, nextBefore };
}
