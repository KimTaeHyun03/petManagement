-- PLAN.md §4.3, §6 — 체중 급변(±10%) 알림 발송 이력 (담당: 김기연)
--
-- notification_log 와 별개 테이블로 둔다:
--  - notification_log 는 백신 cron 알림 전용 (vaccination_record_id NOT NULL FK + notify_type CHECK 'd7/d1/dday/overdue')
--    공유 변경 시 김찬영(DB) 영역과 겹침
--  - 체중 급변은 일일 cron 이 아니라 체중 기록 추가 시점에 즉시 1회 발송 → 발송 흐름도 분리됨
--
-- 중복 발송 방지: weight_record_id UNIQUE — 같은 기록에 대해 두 번 발송되지 않음.

CREATE TABLE IF NOT EXISTS weight_alerts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id           UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  weight_record_id UUID NOT NULL UNIQUE REFERENCES weight_records(id) ON DELETE CASCADE,
  prev_weight      NUMERIC(5, 2) NOT NULL,
  new_weight       NUMERIC(5, 2) NOT NULL,
  -- 변화율(소수). 예: -0.1234 = -12.34%. NUMERIC(5,4) → 최대 ±9.9999.
  delta_ratio      NUMERIC(5, 4) NOT NULL,
  notified_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS weight_alerts_pet_id_idx
  ON weight_alerts(pet_id, notified_at DESC);
