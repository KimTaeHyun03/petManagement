-- PLAN.md §4.6, §5 ERD — Vaccine 마스터 + VaccinationRecord (담당: 김찬영)
--
-- Vaccine 마스터: KASA·농림축산검역본부 기준 백신 종류·시기
-- VaccinationRecord: 펫별 접종 이력 (수동 입력 / OCR 자동)
--
-- booster_weeks: 최종 차수 완료 후 재접종 간격(주). NULL이면 재접종 없음.
-- interval_weeks: 다회차 백신의 차수 간 간격(주).
-- mandatory: 광견병 등 법적 의무 여부 (가축전염병예방법)

CREATE TABLE IF NOT EXISTS vaccines (
  id              SERIAL PRIMARY KEY,
  species         TEXT NOT NULL CHECK (species IN ('dog', 'cat', 'both')),
  name            TEXT NOT NULL,
  recommend_weeks INT,          -- 최초 접종 권장 시기 (생후 N주)
  dose_total      INT NOT NULL DEFAULT 1,
  interval_weeks  INT,          -- 다회차 차수 간 간격(주)
  booster_weeks   INT,          -- 최종 접종 후 재접종 간격(주)
  mandatory       BOOLEAN NOT NULL DEFAULT FALSE,
  severity        TEXT NOT NULL DEFAULT 'low' CHECK (severity IN ('high', 'low'))
);

-- 백신 시드 데이터 (KASA·농림축산검역본부·WSAVA 기준, 2개 이상 출처 교차 검증)
-- 강아지
INSERT INTO vaccines (species, name, recommend_weeks, dose_total, interval_weeks, booster_weeks, mandatory, severity) VALUES
  ('dog', '종합백신 (DHPPL)',  8, 5, 4, 52, FALSE, 'high'),
  ('dog', '코로나장염',        8, 2, 4, 52, FALSE, 'low'),
  ('dog', '켄넬코프',          8, 2, 4, 52, FALSE, 'low'),
  ('dog', '광견병',           12, 1, NULL, 52, TRUE,  'high'),
  ('dog', '심장사상충 예방',    8, 1, NULL,  4, FALSE, 'low'),
-- 고양이
  ('cat', '종합백신 (FVRCP)',  8, 3, 4, 52, FALSE, 'high'),
  ('cat', '광견병',           12, 1, NULL, 52, TRUE,  'high'),
  ('cat', '고양이백혈병 (FeLV)', 8, 2, 4, 52, FALSE, 'low')
ON CONFLICT DO NOTHING;

-- VaccinationRecord: 펫별 접종 이력
CREATE TABLE IF NOT EXISTS vaccination_records (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id        UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  vaccine_id    INT  NOT NULL REFERENCES vaccines(id),
  dose_no       INT  NOT NULL DEFAULT 1,
  vaccinated_at DATE NOT NULL,
  next_due_at   DATE,            -- 다음 권장 접종일 (자동 계산)
  source        TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'ocr')),
  memo          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PLAN §5 인덱스: "VaccinationRecord(pet_id, vaccinated_at DESC)"
CREATE INDEX IF NOT EXISTS vaccination_records_pet_id_idx
  ON vaccination_records(pet_id, vaccinated_at DESC);
