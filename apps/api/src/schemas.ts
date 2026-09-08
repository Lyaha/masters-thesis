import { z } from 'zod';

export const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const categorySchema = z.object({
  name: z.string().min(3),
  description: z.string().default(''),
  visible: z.boolean().default(true),
});

export const dashboardFiltersSchema = z.object({
  categoryId: z.string().uuid().optional(),
  year: z.coerce.number().int().optional(),
  region: z.string().trim().min(1).optional(),
  institution: z.string().trim().min(1).optional(),
  specialty: z.string().trim().min(1).optional(),
});

export const profileSchema = z.object({
  genderIdentity: z.enum(['woman', 'man', 'nonbinary', 'prefer_not_to_say']),
  institution: z.string().min(2),
  specialty: z.string().min(2),
  educationLevel: z.string().min(2),
  consent: z.literal(true),
});

const newSourceCategorySchema = categorySchema.pick({ name: true, description: true });

const sourceFieldsSchema = z.object({
  categoryId: z.string().uuid().optional(),
  category: newSourceCategorySchema.optional(),
  name: z.string().min(2),
  baseUrl: z.string().url().optional().or(z.literal('')),
  importType: z.enum(['csv', 'api', 'manual']),
  enabled: z.boolean().default(true),
});

export const sourceSchema = sourceFieldsSchema.refine(
  (value) => Boolean(value.categoryId) !== Boolean(value.category),
  { message: 'Оберіть категорію або створіть нову' },
);

export const sourceUpdateSchema = sourceFieldsSchema
  .pick({ name: true, baseUrl: true, importType: true, enabled: true })
  .partial();

const statisticRecordSchema = z.object({
  institution: z.string().min(2),
  region: z.string().min(2),
  specialty: z.string().min(2),
  educationLevel: z.string().min(2),
  year: z.number().int().min(2000).max(2100),
  womenCount: z.number().int().nonnegative(),
  menCount: z.number().int().nonnegative(),
  nonbinaryCount: z.number().int().nonnegative().default(0),
});

export const datasetImportSchema = z.object({
  categoryId: z.string().uuid(),
  apiSourceId: z.string().uuid().optional(),
  title: z.string().min(3),
  periodLabel: z.string().min(4),
  replaceDatasetId: z.string().uuid().optional(),
  records: z.array(statisticRecordSchema).min(1),
});

export type NewSourceCategory = z.infer<typeof newSourceCategorySchema>;
