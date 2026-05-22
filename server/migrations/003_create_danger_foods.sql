-- 003_create_danger_foods.sql
-- 반려동물 위험 음식 마스터 테이블 (ASPCA 기준)
-- 시드 데이터는 005_seed_danger_foods_dummy.sql에서 별도 관리

CREATE TABLE IF NOT EXISTS danger_foods (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT        NOT NULL UNIQUE,          -- 위험 성분/음식 이름 (한국어)
  name_en          TEXT,                                 -- 영문명 (OCR 매칭용)
  toxic_compound   TEXT,                                 -- 독성 물질명 (예: theobromine)
  symptoms         TEXT,                                 -- 증상 설명
  severity         TEXT        NOT NULL                  -- 위험도: high / medium / low
                   CHECK (severity IN ('high','medium','low')),
  threshold_per_kg NUMERIC(8,3),                        -- 체중 kg당 독성 임계량 (NULL = 소량도 위험)
  source_url       TEXT,                                 -- 출처 URL (ASPCA 등)
  aspca_ref        TEXT,                                 -- ASPCA 문서 참조 코드
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE danger_foods IS '반려동물(강아지·고양이) 위험 음식 마스터. 출처: ASPCA, AVMA 교차검증 항목만 등재.';
