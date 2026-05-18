import { pool } from '../../db/pool.js';

export interface UserRow {
  id: string;
  email: string;
  pw_hash: string;
  created_at: Date;
}

export async function findByEmail(email: string): Promise<UserRow | null> {
  const { rows } = await pool.query<UserRow>(
    'SELECT id, email, pw_hash, created_at FROM users WHERE email = $1',
    [email],
  );
  return rows[0] ?? null;
}

export async function findById(id: string): Promise<UserRow | null> {
  const { rows } = await pool.query<UserRow>(
    'SELECT id, email, pw_hash, created_at FROM users WHERE id = $1',
    [id],
  );
  return rows[0] ?? null;
}

export async function createUser(
  email: string,
  pwHash: string,
): Promise<UserRow> {
  const { rows } = await pool.query<UserRow>(
    `INSERT INTO users (email, pw_hash)
     VALUES ($1, $2)
     RETURNING id, email, pw_hash, created_at`,
    [email, pwHash],
  );
  return rows[0]!;
}
