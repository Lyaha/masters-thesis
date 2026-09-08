import { Router } from 'express';
import { query } from '../db.js';
import { asyncRoute } from '../http.js';
import { dashboardFiltersSchema } from '../schemas.js';
import { loadItEntrants } from '../services/it-open-data.js';

export const publicRouter = Router();

publicRouter.get('/health', (_request, response) => {
  response.json({ status: 'ok' });
});

publicRouter.get(
  '/categories',
  asyncRoute(async (_request, response) => {
    const { rows } = await query(`
      SELECT c.id, c.slug, c.name, c.description, c.visible
      FROM source_categories c
      WHERE c.visible = true
      ORDER BY (c.slug = 'ukraine-open-data') DESC, EXISTS (
        SELECT 1
        FROM datasets d
        JOIN gender_statistics s ON s.dataset_id = d.id
        WHERE d.category_id = c.id AND d.status = 'active'
      ) DESC, c.created_at
    `);

    response.json(rows);
  }),
);

publicRouter.get(
  '/dashboard',
  asyncRoute(async (request, response) => {
    const parsedFilters = dashboardFiltersSchema.safeParse(request.query);

    if (!parsedFilters.success) {
      response.status(400).json({ error: 'Некоректні фільтри' });
      return;
    }

    const filters = parsedFilters.data;

    if (filters.categoryId) {
      const { rows: categories } = await query<{ slug: string }>(
        'SELECT slug FROM source_categories WHERE id = $1 AND visible = true',
        [filters.categoryId],
      );

      if (categories[0]?.slug === 'ukraine-open-data') {
        const { rows: sources } = await query<{ base_url: string }>(
          `SELECT base_url
           FROM api_sources
           WHERE category_id = $1
             AND name = 'ЄДЕБО: вступ на ІТ-спеціальності'
             AND import_type = 'api'
             AND enabled = true
             AND base_url IS NOT NULL`,
          [filters.categoryId],
        );

        if (!sources[0]) {
          response.status(503).json({ error: 'Відкритий API-ресурс не налаштовано' });
          return;
        }

        response.json({
          kind: 'it-entrants',
          rows: await loadItEntrants(sources[0].base_url),
        });
        return;
      }
    }

    const values: unknown[] = [];
    const conditions = ["d.status = 'active'"];
    const addFilter = (condition: string, value: unknown) => {
      values.push(value);
      conditions.push(`${condition} = $${values.length}`);
    };

    if (filters.categoryId) addFilter('d.category_id', filters.categoryId);
    if (filters.year) addFilter('s.year', filters.year);
    if (filters.region) addFilter('s.region', filters.region);
    if (filters.institution) addFilter('s.institution', filters.institution);
    if (filters.specialty) addFilter('s.specialty', filters.specialty);

    const { rows } = await query(
      `SELECT s.year, s.region, s.institution, s.specialty,
        SUM(s.women_count) AS women,
        SUM(s.men_count) AS men,
        SUM(s.nonbinary_count) AS nonbinary,
        SUM(s.women_count + s.men_count + s.nonbinary_count) AS total
      FROM gender_statistics s
      JOIN datasets d ON d.id = s.dataset_id
      WHERE ${conditions.join(' AND ')}
      GROUP BY s.year, s.region, s.institution, s.specialty
      ORDER BY s.year, s.institution`,
      values,
    );

    response.json({ kind: 'gender-statistics', rows });
  }),
);
