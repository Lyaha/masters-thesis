import bcrypt from 'bcryptjs';
import { pool } from '../db.js';
import { credentialsSchema } from '../schemas.js';

// A versioned migration also upgrades existing Docker volumes without reseeding them.
export async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(8473201)');
    await client.query('CREATE TABLE IF NOT EXISTS app_migrations (version TEXT PRIMARY KEY)');
    const applied = await client.query(
      "SELECT 1 FROM app_migrations WHERE version = 'security-2026-09'",
    );
    if (!applied.rowCount) {
      await client.query(`DO $$ DECLARE constraint_name text; BEGIN
				FOR constraint_name IN SELECT conname FROM pg_constraint
				WHERE conrelid = 'gender_statistics'::regclass AND contype = 'u'
				AND pg_get_constraintdef(oid) = 'UNIQUE (dataset_id, institution, specialty, education_level, year)'
				LOOP EXECUTE format('ALTER TABLE gender_statistics DROP CONSTRAINT %I', constraint_name); END LOOP;
			END $$`);
      const current =
        await client.query(`SELECT 1 FROM pg_constraint WHERE conrelid = 'gender_statistics'::regclass
				AND contype = 'u' AND pg_get_constraintdef(oid) = 'UNIQUE (dataset_id, institution, region, specialty, education_level, year)'`);
      if (!current.rowCount)
        await client.query(`ALTER TABLE gender_statistics ADD CONSTRAINT statistics_observation_unique
				UNIQUE(dataset_id, institution, region, specialty, education_level, year)`);
      await client.query("INSERT INTO app_migrations VALUES ('security-2026-09')");
    }
    const legacy = await client.query<{ id: string }>(
      `SELECT id FROM users WHERE role = 'admin' AND password_hash = $1`,
      ['$2a$10$ccpNWO5JbS12LQrHV4d1vOupT9NF.n/5ww4abXV0WNCirmx1nNbe.'],
    );
    const admins = await client.query("SELECT 1 FROM users WHERE role = 'admin'");
    if (!admins.rowCount || legacy.rowCount) {
      const credentials = credentialsSchema.parse({
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
      });
      if (credentials.password === 'admin123')
        throw new Error('Choose a unique administrator password');
      const hash = await bcrypt.hash(credentials.password, 12);
      // Invalidate only the documented legacy demo credential; preserve the user and its data.
      for (const user of legacy.rows)
        await client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, user.id]);
      const existing = await client.query('SELECT role FROM users WHERE email = $1', [
        credentials.email,
      ]);
      if (existing.rows[0]?.role === 'user')
        throw new Error('Bootstrap email belongs to a regular user');
      if (!existing.rowCount)
        await client.query(
          "INSERT INTO users(email, password_hash, role) VALUES ($1, $2, 'admin')",
          [credentials.email, hash],
        );
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
