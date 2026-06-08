-- 012_add_photo_to_pets.sql
-- 반려동물 프로필 사진 (담당: 김태현)
-- - PLAN.md §4.2 등록 항목 / §5 ERD Pet 컬럼 확장 (사진 추가)
-- - 원본 이미지는 S3에 보관(PLAN §7 "이미지 저장소 → S3"), DB에는 접근 URL만 저장
-- - 사진은 선택 입력이므로 NULL 허용

ALTER TABLE pets
  ADD COLUMN IF NOT EXISTS photo_url TEXT;

COMMENT ON COLUMN pets.photo_url IS
  '반려동물 프로필 사진의 S3 객체 URL. 미업로드 시 NULL (UI는 종별 기본 이모지로 대체).';
