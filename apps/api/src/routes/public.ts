import { Router } from 'express';
import { query } from '../db.js';
import { asyncRoute } from '../http.js';
import { dashboardFiltersSchema } from '../schemas.js';
import { loadItEntrants } from '../services/it-open-data.js';
import { loadEurostatItStudents } from '../services/eurostat-it-open-data.js';

type Loaders = {
  loadItEntrants: typeof loadItEntrants;
  loadEurostatItStudents: typeof loadEurostatItStudents;
};
export function createPublicRouter(loaders: Loaders = { loadItEntrants, loadEurostatItStudents }) {
  const publicRouter = Router();

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
      const applyFilters = <
        T extends { year: number; region: string; institution: string; specialty: string },
      >(
        rows: T[],
      ) =>
        rows.filter(
          (row) =>
            (filters.year === undefined || row.year === filters.year) &&
            (!filters.region || row.region === filters.region) &&
            (!filters.institution || row.institution === filters.institution) &&
            (!filters.specialty || row.specialty === filters.specialty),
        );

      if (filters.categoryId) {
        const { rows: categories } = await query<{ slug: string }>(
          'SELECT slug FROM source_categories WHERE id = $1 AND visible = true',
          [filters.categoryId],
        );
        if (!categories[0]) {
          response.status(404).json({ error: 'Категорію не знайдено' });
          return;
        }
        if (categories[0].slug === 'site-users') {
          const { rows } = await query(`SELECT EXTRACT(YEAR FROM consent_given_at)::int AS year,
				''::text AS region, institution, specialty,
				COUNT(*) FILTER (WHERE gender_identity = 'woman')::text AS women,
				COUNT(*) FILTER (WHERE gender_identity = 'man')::text AS men,
				COUNT(*) FILTER (WHERE gender_identity IN ('nonbinary', 'prefer_not_to_say'))::text AS nonbinary,
				COUNT(*)::text AS total
				FROM voluntary_profiles GROUP BY EXTRACT(YEAR FROM consent_given_at), institution, specialty
				HAVING COUNT(*) >= 5 ORDER BY year, institution`);
          response.json({
            kind: 'profile-statistics',
            rows: applyFilters(rows as import('../types.js').DashboardRow[]),
          });
          return;
        }

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
            rows: applyFilters(await loaders.loadItEntrants(sources[0].base_url)),
          });
          return;
        }

        if (categories[0]?.slug === 'international-open-data') {
          const { rows: sources } = await query<{ base_url: string }>(
            `SELECT base_url
           FROM api_sources
           WHERE category_id = $1
             AND name = 'Eurostat: ІТ-студенти за країною та статтю'
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
            kind: 'eurostat-it',
            rows: applyFilters(await loaders.loadEurostatItStudents(sources[0].base_url)),
          });
          return;
        }
      }

      const values: unknown[] = [];
      const conditions = [
        "d.status = 'active'",
        'c.visible = true',
        "c.slug NOT IN ('site-users', 'ukraine-open-data', 'international-open-data')",
      ];
      const addFilter = (condition: string, value: unknown) => {
        values.push(value);
        conditions.push(`${condition} = $${values.length}`);
      };

      if (filters.categoryId) addFilter('d.category_id', filters.categoryId);
      if (filters.year !== undefined) addFilter('s.year', filters.year);
      if (filters.region) addFilter('s.region', filters.region);
      if (filters.institution) addFilter('s.institution', filters.institution);
      if (filters.specialty) addFilter('s.specialty', filters.specialty);

      const { rows } = await query(
        `SELECT s.year, s.region, s.institution, s.specialty,
        SUM(s.women_count) AS women,
        SUM(s.men_count) AS men,
        SUM(s.nonbinary_count) AS nonbinary,
        SUM(s.women_count::bigint + s.men_count + s.nonbinary_count) AS total
      FROM gender_statistics s
      JOIN datasets d ON d.id = s.dataset_id
      JOIN source_categories c ON c.id = d.category_id
      WHERE ${conditions.join(' AND ')}
      GROUP BY s.year, s.region, s.institution, s.specialty
      ORDER BY s.year, s.institution`,
        values,
      );

      response.json({ kind: 'gender-statistics', rows });
    }),
  );
  return publicRouter;
}
export const publicRouter = createPublicRouter();
