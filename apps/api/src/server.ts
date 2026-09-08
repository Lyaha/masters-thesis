import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query } from './db.js';
import { requireAdmin, requireAuth, tokenFor, type AuthRequest } from './auth.js';

const app = express();
app.use(cors()); app.use(express.json());
const credentials = z.object({ email: z.string().email(), password: z.string().min(8) });
const category = z.object({ name: z.string().min(3), description: z.string().default(''), visible: z.boolean().default(true) });
const source = z.object({ categoryId: z.string().uuid(), name: z.string().min(2), baseUrl: z.string().url().optional().or(z.literal('')), importType: z.enum(['csv', 'api', 'manual']), enabled: z.boolean().default(true) });

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.get('/categories', async (_req, res) => {
  const { rows } = await query('SELECT id, slug, name, description, visible FROM source_categories WHERE visible = true ORDER BY created_at');
  res.json(rows);
});
app.get('/dashboard', async (req, res) => {
  const parsed = z.object({ categoryId: z.string().uuid().optional(), year: z.coerce.number().int().optional(), region: z.string().trim().min(1).optional(), institution: z.string().trim().min(1).optional(), specialty: z.string().trim().min(1).optional() }).safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: 'Некоректні фільтри' });
  const p = parsed.data; const values: unknown[] = []; const where: string[] = ["d.status = 'active'"];
  if (p.categoryId) { values.push(p.categoryId); where.push(`d.category_id = $${values.length}`); }
  if (p.year) { values.push(p.year); where.push(`s.year = $${values.length}`); }
  if (p.region) { values.push(p.region); where.push(`s.region = $${values.length}`); }
  if (p.institution) { values.push(p.institution); where.push(`s.institution = $${values.length}`); }
  if (p.specialty) { values.push(p.specialty); where.push(`s.specialty = $${values.length}`); }
  const sql = `SELECT s.year, s.region, s.institution, s.specialty,
    SUM(s.women_count) AS women, SUM(s.men_count) AS men, SUM(s.nonbinary_count) AS nonbinary,
    SUM(s.women_count+s.men_count+s.nonbinary_count) AS total
    FROM gender_statistics s JOIN datasets d ON d.id=s.dataset_id
    WHERE ${where.join(' AND ')} GROUP BY s.year,s.region,s.institution,s.specialty ORDER BY s.year,s.institution`;
  const { rows } = await query(sql, values); res.json(rows);
});
app.post('/auth/register', async (req, res) => {
  const data = credentials.safeParse(req.body); if (!data.success) return res.status(400).json({ error: 'Вкажіть коректний email і пароль від 8 символів' });
  try { const hash = await bcrypt.hash(data.data.password, 10); const { rows } = await query<{id:string;role:string}>('INSERT INTO users(email,password_hash) VALUES($1,$2) RETURNING id,role', [data.data.email, hash]); res.status(201).json({ token: tokenFor(rows[0]), role: rows[0].role }); }
  catch { res.status(409).json({ error: 'Цей email вже зареєстрований' }); }
});
app.post('/auth/login', async (req, res) => {
  const data = credentials.safeParse(req.body); if (!data.success) return res.status(400).json({ error: 'Некоректні облікові дані' });
  const { rows } = await query<{id:string;role:string;password_hash:string}>('SELECT id,role,password_hash FROM users WHERE email=$1', [data.data.email]);
  if (!rows[0] || !(await bcrypt.compare(data.data.password, rows[0].password_hash))) return res.status(401).json({ error: 'Неправильний email або пароль' });
  res.json({ token: tokenFor(rows[0]), role: rows[0].role });
});
app.put('/profile/statistics', requireAuth, async (req: AuthRequest, res) => {
  const data = z.object({ genderIdentity: z.enum(['woman','man','nonbinary','prefer_not_to_say']), institution: z.string().min(2), specialty: z.string().min(2), educationLevel: z.string().min(2), consent: z.literal(true) }).safeParse(req.body);
  if (!data.success) return res.status(400).json({ error: 'Заповніть усі поля та підтвердьте згоду' });
  await query(`INSERT INTO voluntary_profiles(user_id,gender_identity,institution,specialty,education_level) VALUES($1,$2,$3,$4,$5)
    ON CONFLICT(user_id) DO UPDATE SET gender_identity=EXCLUDED.gender_identity,institution=EXCLUDED.institution,specialty=EXCLUDED.specialty,education_level=EXCLUDED.education_level,consent_given_at=now()`, [req.user!.id, data.data.genderIdentity, data.data.institution, data.data.specialty, data.data.educationLevel]);
  res.status(204).end();
});

app.get('/admin/categories', requireAuth, requireAdmin, async (_req,res) => res.json((await query('SELECT * FROM source_categories ORDER BY created_at')).rows));
app.get('/admin/datasets', requireAuth, requireAdmin, async (_req,res) => res.json((await query(`SELECT d.id,d.title,d.period_label,d.status,d.created_at,c.name AS category_name,COUNT(s.id)::int AS records_count
  FROM datasets d JOIN source_categories c ON c.id=d.category_id LEFT JOIN gender_statistics s ON s.dataset_id=d.id
  GROUP BY d.id,c.name ORDER BY d.created_at DESC`)).rows));
app.post('/admin/categories', requireAuth, requireAdmin, async (req,res) => { const x=category.safeParse(req.body); if(!x.success)return res.status(400).json({error:'Некоректна категорія'}); const slug=x.data.name.toLowerCase().replace(/[^a-zа-яіїє0-9]+/g,'-').replace(/(^-|-$)/g,''); const {rows}=await query('INSERT INTO source_categories(slug,name,description,visible) VALUES($1,$2,$3,$4) RETURNING *',[slug,x.data.name,x.data.description,x.data.visible]); res.status(201).json(rows[0]); });
app.patch('/admin/categories/:id', requireAuth, requireAdmin, async (req,res) => { const x=category.partial().safeParse(req.body); if(!x.success)return res.status(400).json({error:'Некоректні дані'}); const {rows}=await query('UPDATE source_categories SET name=COALESCE($2,name),description=COALESCE($3,description),visible=COALESCE($4,visible) WHERE id=$1 RETURNING *',[req.params.id,x.data.name,x.data.description,x.data.visible]); if(!rows[0])return res.status(404).json({error:'Категорію не знайдено'}); res.json(rows[0]); });
app.delete('/admin/datasets/:id', requireAuth, requireAdmin, async (req,res) => { await query('DELETE FROM datasets WHERE id=$1',[req.params.id]); res.status(204).end(); });
app.post('/admin/datasets/import', requireAuth, requireAdmin, async (req: AuthRequest,res) => {
  const x = z.object({ categoryId:z.string().uuid(), apiSourceId:z.string().uuid().optional(), title:z.string().min(3), periodLabel:z.string().min(4), replaceDatasetId:z.string().uuid().optional(), records:z.array(z.object({ institution:z.string().min(2),region:z.string().min(2),specialty:z.string().min(2),educationLevel:z.string().min(2),year:z.number().int().min(2000).max(2100),womenCount:z.number().int().nonnegative(),menCount:z.number().int().nonnegative(),nonbinaryCount:z.number().int().nonnegative().default(0) })).min(1) }).safeParse(req.body);
  if (!x.success) return res.status(400).json({ error:'Некоректний набір для імпорту' });
  const client = await (await import('./db.js')).pool.connect();
  try { await client.query('BEGIN'); if(x.data.replaceDatasetId) await client.query('DELETE FROM datasets WHERE id=$1',[x.data.replaceDatasetId]);
    const d = await client.query<{id:string}>('INSERT INTO datasets(category_id,api_source_id,title,period_label,created_by) VALUES($1,$2,$3,$4,$5) RETURNING id',[x.data.categoryId,x.data.apiSourceId||null,x.data.title,x.data.periodLabel,req.user!.id]);
    for (const r of x.data.records) await client.query('INSERT INTO gender_statistics(dataset_id,institution,region,specialty,education_level,year,women_count,men_count,nonbinary_count) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[d.rows[0].id,r.institution,r.region,r.specialty,r.educationLevel,r.year,r.womenCount,r.menCount,r.nonbinaryCount]);
    await client.query('COMMIT'); res.status(201).json({ datasetId:d.rows[0].id, imported:x.data.records.length });
  } catch { await client.query('ROLLBACK'); res.status(500).json({ error:'Імпорт не завершено; попередній набір збережено' }); } finally { client.release(); }
});
app.get('/admin/sources', requireAuth, requireAdmin, async (_req,res) => res.json((await query('SELECT a.*,c.name AS category_name FROM api_sources a JOIN source_categories c ON c.id=a.category_id ORDER BY a.created_at')).rows));
app.post('/admin/sources', requireAuth, requireAdmin, async (req,res) => { const x=source.safeParse(req.body); if(!x.success)return res.status(400).json({error:'Некоректне джерело API'}); const {rows}=await query('INSERT INTO api_sources(category_id,name,base_url,import_type,enabled) VALUES($1,$2,$3,$4,$5) RETURNING *',[x.data.categoryId,x.data.name,x.data.baseUrl||null,x.data.importType,x.data.enabled]); res.status(201).json(rows[0]); });
app.patch('/admin/sources/:id', requireAuth, requireAdmin, async(req,res)=> { const x=source.partial().safeParse(req.body); if(!x.success)return res.status(400).json({error:'Некоректні дані'}); const {rows}=await query('UPDATE api_sources SET name=COALESCE($2,name),base_url=COALESCE($3,base_url),import_type=COALESCE($4,import_type),enabled=COALESCE($5,enabled) WHERE id=$1 RETURNING *',[req.params.id,x.data.name,x.data.baseUrl,x.data.importType,x.data.enabled]); res.json(rows[0]); });
app.delete('/admin/sources/:id', requireAuth, requireAdmin, async(req,res)=> { await query('DELETE FROM api_sources WHERE id=$1',[req.params.id]); res.status(204).end(); });

app.listen(Number(process.env.PORT || 3001), () => console.log('API listening on 3001'));
