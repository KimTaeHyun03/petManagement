-- 알림 발송 이력 테이블 (중복 발송 방지용)
-- PLAN §6 알림 정책: D-7 / D-1 / D-day / 의무백신 미접종(overdue)

CREATE TABLE IF NOT EXISTS notification_log (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pet_id                UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  vaccination_record_id UUID REFERENCES vaccination_records(id) ON DELETE CASCADE,
  notify_type           TEXT NOT NULL CHECK (notify_type IN ('d7', 'd1', 'dday', 'overdue')),
  sent_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 중복 조회용 인덱스 (날짜 필터는 쿼리에서 처리)
CREATE INDEX IF NOT EXISTS notification_log_record_type_idx
  ON notification_log(vaccination_record_id, notify_type);
