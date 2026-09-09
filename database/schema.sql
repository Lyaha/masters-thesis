CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE source_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE api_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES source_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  base_url TEXT,
  import_type TEXT NOT NULL DEFAULT 'csv' CHECK (import_type IN ('csv', 'api', 'manual')),
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE datasets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES source_categories(id),
  api_source_id UUID REFERENCES api_sources(id),
  title TEXT NOT NULL,
  period_label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE gender_statistics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  institution TEXT NOT NULL,
  region TEXT NOT NULL,
  specialty TEXT NOT NULL,
  education_level TEXT NOT NULL,
  year SMALLINT NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  women_count INTEGER NOT NULL CHECK (women_count >= 0),
  men_count INTEGER NOT NULL CHECK (men_count >= 0),
  nonbinary_count INTEGER NOT NULL DEFAULT 0 CHECK (nonbinary_count >= 0),
  UNIQUE(dataset_id, institution, region, specialty, education_level, year)
);

CREATE TABLE voluntary_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  gender_identity TEXT NOT NULL CHECK (gender_identity IN ('woman', 'man', 'nonbinary', 'prefer_not_to_say')),
  institution TEXT NOT NULL,
  specialty TEXT NOT NULL,
  education_level TEXT NOT NULL,
  consent_given_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
