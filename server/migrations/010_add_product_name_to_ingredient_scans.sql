-- 010_add_product_name_to_ingredient_scans.sql
-- 성분표 OCR 결과에 사용자가 확인·수정한 제품명을 저장
-- 기본값은 OCR 텍스트에서 "제품명" 라벨로 자동 추출, 사용자가 비울 수도 있으므로 NULL 허용

ALTER TABLE ingredient_scans
  ADD COLUMN IF NOT EXISTS product_name TEXT;

COMMENT ON COLUMN ingredient_scans.product_name IS
  'OCR 텍스트의 "제품명" 라벨에서 자동 추출하거나 사용자가 직접 입력한 제품명. 비어 있으면 NULL.';
