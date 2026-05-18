-- research_taehyun.md §3.7 — User.id를 UUID로 (enumeration / BOLA 방어)
-- PLAN.md 5절 ERD는 정수로 그려져 있으나 본 결정에 따라 UUID 사용 (ERD 갱신 제안 대상).

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  pw_hash     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
