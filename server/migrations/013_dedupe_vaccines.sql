-- 013_dedupe_vaccines.sql
-- vaccines 마스터 중복 행 정리 + 재발 방지 (담당: 김찬영 / DB)
--
-- 배경: 마이그레이션 재번호(구 003_create_vaccinations → 006_create_vaccinations)로
--       파일명 기준 러너가 시드 INSERT를 두 번 적용했고, vaccines에 UNIQUE 제약이
--       없어 ON CONFLICT DO NOTHING이 무력화되어 각 백신이 2배(8종→16행)로 적재됨.
--
-- 처리 순서 (FK 보호):
--   1) vaccination_records가 중복 행(비-대표 id)을 참조하면 대표 id(최소 id)로 repoint
--   2) 중복 행 삭제 (각 (species, name) 그룹에서 최소 id만 남김)
--   3) UNIQUE(species, name) 제약 추가 → 향후 시드 재실행 시 ON CONFLICT가 정상 작동
--
-- 멱등성: id가 아니라 (species, name) 그룹 기준으로 동작하므로 재실행해도 안전.
--         이미 정리된 상태면 1·2단계는 0건, 3단계는 IF NOT EXISTS 가드로 건너뜀.

-- 1) 접종 이력의 vaccine_id를 대표(최소) id로 모아준다
WITH canonical AS (
  SELECT species, name, MIN(id) AS keep_id
  FROM vaccines
  GROUP BY species, name
),
dupes AS (
  SELECT v.id AS dup_id, c.keep_id
  FROM vaccines v
  JOIN canonical c ON c.species = v.species AND c.name = v.name
  WHERE v.id <> c.keep_id
)
UPDATE vaccination_records r
   SET vaccine_id = d.keep_id
  FROM dupes d
 WHERE r.vaccine_id = d.dup_id;

-- 2) 중복 행 삭제 (대표 id만 보존)
DELETE FROM vaccines v
 USING (
   SELECT species, name, MIN(id) AS keep_id
   FROM vaccines
   GROUP BY species, name
 ) c
 WHERE v.species = c.species
   AND v.name = c.name
   AND v.id <> c.keep_id;

-- 3) 재발 방지: (species, name) 유일 제약 (이미 있으면 건너뜀)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vaccines_species_name_key'
  ) THEN
    ALTER TABLE vaccines
      ADD CONSTRAINT vaccines_species_name_key UNIQUE (species, name);
  END IF;
END $$;
