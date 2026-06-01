-- PLAN.md §4.3, §5 ERD — WeightRecord + StandardWeight 마스터 (담당: 김기연)
--
-- WeightRecord: 펫별 체중 기록. 직전 기록 대비 ±10% 변동 시 "급변" 판정 → 알림(§6)
-- StandardWeight: 종·품종·연령대별 표준 체중 범위. 판정 결과 정상/과체중/저체중에 사용.
--
-- 컬럼 메모:
--  - recorded_at: PLAN §4.3 "날짜(기본값: 입력 시점 날짜, 시간)" — 분 단위까지 받기 위해 TIMESTAMPTZ
--  - weight: NUMERIC(5,2) — 999.99kg까지. 대형견 상한 대비 충분
--  - memo: ERD에 명시된 자유 메모 (선택)

CREATE TABLE IF NOT EXISTS weight_records (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id      UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  weight      NUMERIC(5, 2) NOT NULL CHECK (weight > 0),
  recorded_at TIMESTAMPTZ NOT NULL,
  memo        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PLAN §5 인덱스: "WeightRecord(pet_id, recorded_at DESC)" — 추세 조회 / 직전 기록 lookup
CREATE INDEX IF NOT EXISTS weight_records_pet_id_recorded_at_idx
  ON weight_records(pet_id, recorded_at DESC);

-- StandardWeight 마스터 (§5 ERD)
-- 시드 데이터는 PLAN §7.1 검증 절차(1차 출처 + 2개 이상 교차 검증) 통과 후 후속 마이그레이션에서 등재.
-- 현재는 구조만 생성하여, 판정 로직은 데이터가 없을 경우 "unknown"을 반환한다.
CREATE TABLE IF NOT EXISTS standard_weights (
  id              SERIAL PRIMARY KEY,
  species         TEXT NOT NULL CHECK (species IN ('dog', 'cat')),
  breed           TEXT,                  -- NULL이면 종 전체 평균 (품종 미상 폴백)
  age_min_months  INT  NOT NULL CHECK (age_min_months >= 0),
  age_max_months  INT  NOT NULL CHECK (age_max_months > age_min_months),
  min_kg          NUMERIC(5, 2) NOT NULL CHECK (min_kg > 0),
  max_kg          NUMERIC(5, 2) NOT NULL CHECK (max_kg > min_kg)
);

-- 조회 인덱스: 종 + 품종 + 연령 범위 lookup
CREATE INDEX IF NOT EXISTS standard_weights_lookup_idx
  ON standard_weights(species, breed);
