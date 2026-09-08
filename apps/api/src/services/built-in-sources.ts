import { query } from '../db.js';

const ukraineOpenDataDescription =
  'Реальні дані ЄДЕБО про вступ на ІТ-спеціальності: 121–126 у 2020–2024 роках і F2–F7 у 2025 році. Джерело не містить гендерного розподілу.';
const eurostatOpenDataDescription =
  'Дані Eurostat про студентів ІТ-напрямів у країнах Європи за статтю, країною та роком. Дані не містять окремих закладів освіти; «Інші» означає стать, не вказану в джерелі.';

export async function ensureBuiltInSources() {
  await query(
    `
    INSERT INTO source_categories (slug, name, description) VALUES
      ('ukraine-open-data', 'Відкриті джерела України', $1),
      ('test-data', 'Тестові', 'Демонстраційні дані для розробки та перевірки інтерфейсу.'),
      ('international-open-data', 'Європейські відкриті дані', $2)
    ON CONFLICT (slug) DO UPDATE
      SET name = EXCLUDED.name,
        description = EXCLUDED.description
  `,
    [ukraineOpenDataDescription, eurostatOpenDataDescription],
  );

  await query(`
    UPDATE datasets
    SET category_id = (SELECT id FROM source_categories WHERE slug = 'test-data')
    WHERE category_id = (SELECT id FROM source_categories WHERE slug = 'ukraine-open-data')
      AND title = 'Демонстраційна статистика ЗВО України'
  `);

  await query(`
    DELETE FROM api_sources
    WHERE category_id = (SELECT id FROM source_categories WHERE slug = 'ukraine-open-data')
      AND name = 'Держстат: населення за рівнем освіти та статтю'
  `);

  await query(`
    INSERT INTO api_sources (category_id, name, base_url, import_type)
    SELECT category.id, source.name, source.base_url, 'api'
    FROM source_categories category
    CROSS JOIN (
      VALUES
        (
          'ЄДЕБО: вступ на ІТ-спеціальності',
          'https://registry.edbo.gov.ua/api/opendata/university-entrant/'
        )
    ) AS source(name, base_url)
    WHERE category.slug = 'ukraine-open-data'
      AND NOT EXISTS (
        SELECT 1
        FROM api_sources existing
        WHERE existing.category_id = category.id
          AND existing.name IN (
            'ЄДЕБО: вступ на ІТ-спеціальності',
            'ЄДЕБО: відкриті дані вступної кампанії'
          )
      )
  `);

  await query(`
    UPDATE api_sources
    SET name = 'ЄДЕБО: вступ на ІТ-спеціальності',
        base_url = 'https://registry.edbo.gov.ua/api/opendata/university-entrant/',
        enabled = true
    WHERE category_id = (SELECT id FROM source_categories WHERE slug = 'ukraine-open-data')
      AND name IN (
        'ЄДЕБО: відкриті дані вступної кампанії',
        'ЄДЕБО: вступ на 122 Комп’ютерні науки'
      )
  `);

  await query(`
    INSERT INTO api_sources (category_id, name, base_url, import_type)
    SELECT category.id, source.name, source.base_url, 'api'
    FROM source_categories category
    CROSS JOIN (
      VALUES
        (
          'Eurostat: ІТ-студенти за країною та статтю',
          'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/educ_uoe_enrt03'
        )
    ) AS source(name, base_url)
    WHERE category.slug = 'international-open-data'
      AND NOT EXISTS (
        SELECT 1
        FROM api_sources existing
        WHERE existing.category_id = category.id AND existing.name = source.name
      )
  `);
}
