import { Router } from 'express';
import { requireAdmin, requireAuth, type AuthRequest } from '../auth.js';
import { pool, query } from '../db.js';
import { asyncRoute } from '../http.js';
import {
  categorySchema,
  datasetImportSchema,
  sourceSchema,
  sourceUpdateSchema,
} from '../schemas.js';
import { categorySlug, resolveSourceCategoryId } from '../services/categories.js';

export const adminRouter = Router();

adminRouter.use(requireAuth, requireAdmin);

adminRouter.get(
  '/categories',
  asyncRoute(async (_request, response) => {
    const { rows } = await query('SELECT * FROM source_categories ORDER BY created_at');
    response.json(rows);
  }),
);

adminRouter.get(
  '/datasets',
  asyncRoute(async (_request, response) => {
    const { rows } = await query(`
      SELECT d.id, d.title, d.period_label, d.status, d.created_at,
        c.name AS category_name, COUNT(s.id)::int AS records_count
      FROM datasets d
      JOIN source_categories c ON c.id = d.category_id
      LEFT JOIN gender_statistics s ON s.dataset_id = d.id
      GROUP BY d.id, c.name
      ORDER BY d.created_at DESC
    `);
    response.json(rows);
  }),
);

adminRouter.post(
  '/categories',
  asyncRoute(async (request, response) => {
    const category = categorySchema.safeParse(request.body);

    if (!category.success) {
      response.status(400).json({ error: 'Некоректна категорія' });
      return;
    }

    const { rows } = await query(
      `INSERT INTO source_categories(slug, name, description, visible)
       VALUES($1, $2, $3, $4)
       RETURNING *`,
      [
        categorySlug(category.data.name),
        category.data.name,
        category.data.description,
        category.data.visible,
      ],
    );
    response.status(201).json(rows[0]);
  }),
);

adminRouter.patch(
  '/categories/:id',
  asyncRoute(async (request, response) => {
    const category = categorySchema.partial().safeParse(request.body);

    if (!category.success) {
      response.status(400).json({ error: 'Некоректні дані' });
      return;
    }

    const { rows } = await query(
      `UPDATE source_categories
       SET name = COALESCE($2, name),
         description = COALESCE($3, description),
         visible = COALESCE($4, visible)
       WHERE id = $1
       RETURNING *`,
      [request.params.id, category.data.name, category.data.description, category.data.visible],
    );

    if (!rows[0]) {
      response.status(404).json({ error: 'Категорію не знайдено' });
      return;
    }

    response.json(rows[0]);
  }),
);

adminRouter.delete(
  '/datasets/:id',
  asyncRoute(async (request, response) => {
    await query('DELETE FROM datasets WHERE id = $1', [request.params.id]);
    response.status(204).end();
  }),
);

adminRouter.post(
  '/datasets/import',
  asyncRoute(async (request, response) => {
    const authRequest = request as AuthRequest;
    const dataset = datasetImportSchema.safeParse(authRequest.body);

    if (!dataset.success) {
      response.status(400).json({ error: 'Некоректний набір для імпорту' });
      return;
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      if (dataset.data.replaceDatasetId) {
        await client.query('DELETE FROM datasets WHERE id = $1', [dataset.data.replaceDatasetId]);
      }

      const createdDataset = await client.query<{ id: string }>(
        `INSERT INTO datasets(category_id, api_source_id, title, period_label, created_by)
         VALUES($1, $2, $3, $4, $5)
         RETURNING id`,
        [
          dataset.data.categoryId,
          dataset.data.apiSourceId ?? null,
          dataset.data.title,
          dataset.data.periodLabel,
          authRequest.user!.id,
        ],
      );
      const datasetId = createdDataset.rows[0].id;

      for (const record of dataset.data.records) {
        await client.query(
          `INSERT INTO gender_statistics(
            dataset_id, institution, region, specialty, education_level, year,
            women_count, men_count, nonbinary_count
          ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            datasetId,
            record.institution,
            record.region,
            record.specialty,
            record.educationLevel,
            record.year,
            record.womenCount,
            record.menCount,
            record.nonbinaryCount,
          ],
        );
      }

      await client.query('COMMIT');
      response.status(201).json({ datasetId, imported: dataset.data.records.length });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }),
);

adminRouter.get(
  '/sources',
  asyncRoute(async (_request, response) => {
    const { rows } = await query(`
      SELECT a.*, c.name AS category_name
      FROM api_sources a
      JOIN source_categories c ON c.id = a.category_id
      ORDER BY a.created_at
    `);
    response.json(rows);
  }),
);

adminRouter.post(
  '/sources',
  asyncRoute(async (request, response) => {
    const source = sourceSchema.safeParse(request.body);

    if (!source.success) {
      response.status(400).json({ error: 'Некоректне джерело API' });
      return;
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      const categoryId = await resolveSourceCategoryId(
        client,
        source.data.categoryId,
        source.data.category,
      );
      const { rows } = await client.query(
        `INSERT INTO api_sources(category_id, name, base_url, import_type, enabled)
         VALUES($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          categoryId,
          source.data.name,
          source.data.baseUrl || null,
          source.data.importType,
          source.data.enabled,
        ],
      );

      await client.query('COMMIT');
      response.status(201).json(rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }),
);

adminRouter.patch(
  '/sources/:id',
  asyncRoute(async (request, response) => {
    const source = sourceUpdateSchema.safeParse(request.body);

    if (!source.success) {
      response.status(400).json({ error: 'Некоректні дані' });
      return;
    }

    const { rows } = await query(
      `UPDATE api_sources
       SET name = COALESCE($2, name),
         base_url = COALESCE($3, base_url),
         import_type = COALESCE($4, import_type),
         enabled = COALESCE($5, enabled)
       WHERE id = $1
       RETURNING *`,
      [
        request.params.id,
        source.data.name,
        source.data.baseUrl,
        source.data.importType,
        source.data.enabled,
      ],
    );

    if (!rows[0]) {
      response.status(404).json({ error: 'Джерело API не знайдено' });
      return;
    }

    response.json(rows[0]);
  }),
);

adminRouter.delete(
  '/sources/:id',
  asyncRoute(async (request, response) => {
    await query('DELETE FROM api_sources WHERE id = $1', [request.params.id]);
    response.status(204).end();
  }),
);
