-- PLAN.md §5 ERD — Pet 테이블 (반려동물 등록, 담당: 김태현)
-- - user_id FK (사용자-펫 격리: CLAUDE.md "펫 단위 격리" 결정)
-- - allergies_json: 알러지 목록 (성분표 매칭용, PLAN §4.5)
-- - species는 dog/cat 두 종으로 우선 집중 (PLAN §2)
--
-- WeightRecord는 김기연 영역이므로 본 마이그레이션에서 다루지 않는다.
-- (PLAN §4.2의 '현재 체중(선택)' 입력은 WeightRecord 모듈 도입 후 연동 예정)

CREATE TABLE IF NOT EXISTS pets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  species       TEXT NOT NULL CHECK (species IN ('dog', 'cat')),
  breed         TEXT,
  birth         DATE,
  gender        TEXT CHECK (gender IN ('M', 'F')),
  neutered      BOOLEAN NOT NULL DEFAULT FALSE,
  allergies_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PLAN §5 인덱스 메모: "Pet.user_id 인덱스 (펫 목록 조회 빈번)"
CREATE INDEX IF NOT EXISTS pets_user_id_idx ON pets(user_id);
