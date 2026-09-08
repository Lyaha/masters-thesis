import type { PoolClient } from 'pg';
import type { NewSourceCategory } from '../schemas.js';

export function categorySlug(name: string) {
  return name
    .toLocaleLowerCase('uk')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/(^-|-$)/g, '');
}

export async function resolveSourceCategoryId(
  client: PoolClient,
  categoryId: string | undefined,
  newCategory: NewSourceCategory | undefined,
) {
  if (!newCategory) {
    if (!categoryId) {
      throw new Error('Category is required');
    }

    return categoryId;
  }

  const slug = categorySlug(newCategory.name);
  const existingCategory = await client.query<{ id: string }>(
    'SELECT id FROM source_categories WHERE slug = $1',
    [slug],
  );

  if (existingCategory.rows[0]) {
    return existingCategory.rows[0].id;
  }

  const createdCategory = await client.query<{ id: string }>(
    `INSERT INTO source_categories(slug, name, description, visible)
     VALUES($1, $2, $3, true)
     RETURNING id`,
    [slug, newCategory.name, newCategory.description],
  );

  return createdCategory.rows[0].id;
}
