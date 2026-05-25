import { pool } from '../../db/pool.js';

// UNION ALL 결과는 컬럼 형태가 통일돼야 하므로 모든 source 가 동일한 형상(id/pet_id/occurred_at/type/payload)을 반환한다.
// payload는 source 별로 다른 필드를 담는 jsonb 객체.
// occurred_at 은 ::text 캐스팅 없이 TIMESTAMPTZ → pg Date 객체로 받음 (.toISOString() 으로 직렬화).
export interface TimelineRow {
  id: string;
  pet_id: string;
  occurred_at: Date;
  type: 'weight' | 'vaccination' | 'ingredient_scan';
  payload: Record<string, unknown>;
}

export async function isPetOwner(petId: string, userId: string): Promise<boolean> {
  const { rows } = await pool.query<{ exists: boolean }>(
    'SELECT EXISTS(SELECT 1 FROM pets WHERE id = $1 AND user_id = $2) AS exists',
    [petId, userId],
  );
  return rows[0]?.exists ?? false;
}

// PLAN §4.7 — 모든 이벤트를 시간축 단일 뷰로 결합.
// vaccination_records.vaccinated_at 은 DATE 라 자정 기준 TIMESTAMPTZ로 캐스팅 (UNION ALL 타입 일치 + 정렬용).
// limit 까지 가져와서 클라이언트가 마지막 항목의 occurredAt을 다음 요청의 before 로 사용 (커서 페이지네이션).
export async function loadTimeline(
  petId: string,
  limit: number,
  before: string | null,
): Promise<TimelineRow[]> {
  const { rows } = await pool.query<TimelineRow>(
    `
    SELECT
      id,
      pet_id,
      occurred_at,
      type,
      payload
    FROM (
      SELECT
        w.id,
        w.pet_id,
        w.recorded_at AS occurred_at,
        'weight'::text AS type,
        jsonb_build_object(
          'weight',     w.weight,
          'memo',       w.memo,
          -- weight_alerts 가 매칭되면 surge=true 로 노출. 매칭 없으면 NULL → 클라이언트에서 false 로 취급.
          'surge',      (a.id IS NOT NULL),
          'deltaRatio', a.delta_ratio
        ) AS payload
      FROM weight_records w
      LEFT JOIN weight_alerts a ON a.weight_record_id = w.id
      WHERE w.pet_id = $1

      UNION ALL

      SELECT
        r.id,
        r.pet_id,
        r.vaccinated_at::timestamptz AS occurred_at,
        'vaccination'::text AS type,
        jsonb_build_object(
          'vaccineId',   r.vaccine_id,
          'vaccineName', v.name,
          'mandatory',   v.mandatory,
          'severity',    v.severity,
          'doseNo',      r.dose_no,
          'doseTotal',   v.dose_total,
          'source',      r.source,
          'nextDueAt',   r.next_due_at::text,
          'memo',        r.memo
        ) AS payload
      FROM vaccination_records r
      JOIN vaccines v ON v.id = r.vaccine_id
      WHERE r.pet_id = $1

      UNION ALL

      SELECT
        s.id,
        s.pet_id,
        s.scanned_at AS occurred_at,
        'ingredient_scan'::text AS type,
        jsonb_build_object(
          'matchedFoods',         s.matched_foods_json,
          'matchedAllergies',     s.matched_allergies_json,
          'extractedTextPreview', LEFT(s.extracted_text, 120)
        ) AS payload
      FROM ingredient_scans s
      WHERE s.pet_id = $1
    ) AS events
    WHERE ($2::timestamptz IS NULL OR occurred_at < $2::timestamptz)
    ORDER BY occurred_at DESC
    LIMIT $3
    `,
    [petId, before, limit],
  );
  return rows;
}
