// 마이그레이션 러너 — `npm run migrate` 로 실행.
//
// migrations/ 디렉토리의 .sql 파일을 파일명 사전순으로 적용한다.
// 이미 적용된 파일은 _migrations 테이블에 기록되어 다시 실행되지 않는다.
// (가벼운 1차 구현 — node-pg-migrate 같은 풀 도구 도입은 후속 PR 결정)

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../db/pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const MIGRATIONS_DIR = resolve(__dirname, '../../migrations');

async function ensureLog(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      filename   TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function applied(): Promise<Set<string>> {
  const { rows } = await pool.query<{ filename: string }>(
    'SELECT filename FROM _migrations',
  );
  return new Set(rows.map((r) => r.filename));
}

async function main(): Promise<void> {
  console.log('▶ migration target:', MIGRATIONS_DIR);
  await ensureLog();
  const done = await applied();

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  let count = 0;
  for (const file of files) {
    if (done.has(file)) {
      console.log(`  - ${file} (skip — already applied)`);
      continue;
    }
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO _migrations (filename) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`  ✓ ${file}`);
      count += 1;
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`  ✗ ${file} — rolled back`);
      throw err;
    } finally {
      client.release();
    }
  }
  console.log(`done. applied ${count} file(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => pool.end());
