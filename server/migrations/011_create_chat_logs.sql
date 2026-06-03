CREATE TABLE IF NOT EXISTS chat_logs (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pet_id                UUID        NOT NULL REFERENCES pets(id)  ON DELETE CASCADE,
  role                  TEXT        NOT NULL CHECK (role IN ('user', 'assistant')),
  message               TEXT        NOT NULL,
  context_snapshot_json JSONB,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_logs_pet_created
  ON chat_logs (pet_id, created_at DESC);
