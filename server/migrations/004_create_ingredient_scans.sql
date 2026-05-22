-- 004_create_ingredient_scans.sql
-- 성분표 OCR 스캔 기록 테이블

CREATE TABLE IF NOT EXISTS ingredient_scans (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id                 UUID        NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  image_url              TEXT,                           -- S3 URL (1차 범위 미사용, NULL 허용)
  extracted_text         TEXT        NOT NULL,           -- OCR로 추출한 원본 텍스트
  matched_foods_json     JSONB       NOT NULL DEFAULT '[]', -- 매칭된 danger_foods 결과
  matched_allergies_json JSONB       NOT NULL DEFAULT '[]', -- 매칭된 펫 알러지 결과
  scanned_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 타임라인·챗봇 컨텍스트 조회 인덱스
CREATE INDEX IF NOT EXISTS idx_ingredient_scans_pet_scanned
  ON ingredient_scans (pet_id, scanned_at DESC);

COMMENT ON TABLE ingredient_scans IS '사용자가 성분표 사진을 업로드하고 확정한 OCR 스캔 기록. 자동 저장 X — 사용자 확정(confirm) 후에만 INSERT.';
COMMENT ON COLUMN ingredient_scans.image_url IS 'S3 원본 이미지 URL. 1차 구현에서는 NULL 허용, S3 셋업 후 채움.';
COMMENT ON COLUMN ingredient_scans.matched_foods_json IS '[{id, name, severity, symptoms}, ...] 형태';
COMMENT ON COLUMN ingredient_scans.matched_allergies_json IS '["닭고기", "감자", ...] 형태 — 펫 알러지 중 텍스트에서 발견된 항목';
