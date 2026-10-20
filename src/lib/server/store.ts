import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Pool } from 'pg';
import type { Profile } from '../portfolio';

export type SavedPortfolio = { id: string; tokenHash: string; profile: Profile; published: boolean; updatedAt: string };
const folder = path.join(process.cwd(), '.data', 'portfolios');
const globals = globalThis as typeof globalThis & { talentproofPool?: Pool; talentproofSchema?: Promise<unknown> };
function pool() {
  if (!globals.talentproofPool) globals.talentproofPool = new Pool({ connectionString: process.env.DATABASE_URL, max: 4, connectionTimeoutMillis: 5000, idleTimeoutMillis: 10000 });
  return globals.talentproofPool;
}
async function schema() {
  if (!globals.talentproofSchema) globals.talentproofSchema = pool().query('CREATE TABLE IF NOT EXISTS portfolios (id UUID PRIMARY KEY, token_hash TEXT NOT NULL, profile JSONB NOT NULL, published BOOLEAN NOT NULL DEFAULT TRUE, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())').catch(error => { globals.talentproofSchema = undefined; throw error; });
  return globals.talentproofSchema;
}
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
export function tokenMatches(record: SavedPortfolio, token: string) {
  const a = Buffer.from(record.tokenHash, 'hex'); const b = Buffer.from(hashToken(token), 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}
export function newIdentity() { return { id: randomUUID(), token: randomBytes(32).toString('base64url') }; }
export async function getPortfolio(id: string): Promise<SavedPortfolio | null> {
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id)) return null;
  if (process.env.DATABASE_URL) {
    await schema(); const result = await pool().query('SELECT id, token_hash, profile, published, updated_at FROM portfolios WHERE id=$1', [id]); const row = result.rows[0];
    return row ? { id: row.id, tokenHash: row.token_hash, profile: row.profile, published: row.published, updatedAt: new Date(row.updated_at).toISOString() } : null;
  }
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_LOCAL_STORAGE !== 'true') throw new Error('DatabaseNotConfigured');
  try { return JSON.parse(await readFile(path.join(folder, `${id}.json`), 'utf8')); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
}
export async function savePortfolio(record: SavedPortfolio) {
  if (process.env.DATABASE_URL) {
    await schema(); await pool().query('INSERT INTO portfolios(id, token_hash, profile, published, updated_at) VALUES($1,$2,$3,$4,$5) ON CONFLICT(id) DO UPDATE SET profile=EXCLUDED.profile, published=EXCLUDED.published, updated_at=EXCLUDED.updated_at', [record.id, record.tokenHash, JSON.stringify(record.profile), record.published, record.updatedAt]); return;
  }
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_LOCAL_STORAGE !== 'true') throw new Error('DatabaseNotConfigured');
  await mkdir(folder, { recursive: true }); const target = path.join(folder, `${record.id}.json`); const temporary = `${target}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(record), { mode: 0o600 }); await rename(temporary, target);
}
