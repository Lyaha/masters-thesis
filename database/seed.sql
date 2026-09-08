INSERT INTO source_categories (slug, name, description) VALUES
('site-users', 'Зареєстровані користувачі', 'Добровільно надані та агреговані відповіді користувачів платформи.'),
('ukraine-open-data', 'Відкриті джерела України', 'Реальні дані ЄДЕБО про вступ на ІТ-спеціальності: 121–126 у 2020–2024 роках і F2–F7 у 2025 році. Джерело не містить гендерного розподілу.'),
('test-data', 'Тестові', 'Демонстраційні дані для розробки та перевірки інтерфейсу.'),
('international-open-data', 'Міжнародні відкриті джерела', 'Порівняльні міжнародні статистичні джерела.');

INSERT INTO users (email, password_hash, role) VALUES
('admin@example.com', '$2a$10$ccpNWO5JbS12LQrHV4d1vOupT9NF.n/5ww4abXV0WNCirmx1nNbe.', 'admin');
-- Development password for the seeded administrator: admin123. Change it before real use.

WITH c AS (SELECT id FROM source_categories WHERE slug = 'test-data'),
d AS (INSERT INTO datasets (category_id, title, period_label, created_by) SELECT id, 'Демонстраційна статистика ЗВО України', '2022-2025', (SELECT id FROM users WHERE role='admin' LIMIT 1) FROM c RETURNING id)
INSERT INTO gender_statistics (dataset_id, institution, region, specialty, education_level, year, women_count, men_count, nonbinary_count)
SELECT d.id, x.institution, x.region, 'Інженерія програмного забезпечення', 'бакалавр', x.year, x.women, x.men, x.nonbinary FROM d, (VALUES
('Київський університет технологій','Київ',2022,120,280,3),
('Київський університет технологій','Київ',2023,135,294,4),
('Львівський політехнічний інститут','Львів',2022,94,203,2),
('Львівський політехнічний інститут','Львів',2023,111,218,3),
('Харківський технологічний університет','Харків',2022,77,175,2),
('Харківський технологічний університет','Харків',2023,86,188,2)
) AS x(institution, region, year, women, men, nonbinary);

INSERT INTO api_sources (category_id, name, base_url, import_type) VALUES
(
  (SELECT id FROM source_categories WHERE slug = 'ukraine-open-data'),
  'ЄДЕБО: вступ на ІТ-спеціальності',
  'https://registry.edbo.gov.ua/api/opendata/university-entrant/',
  'api'
);
