-- Migration: 001_create_content_tables.sql
-- Content Management API tables: articles, faqs, videos

-- Articles table
CREATE TABLE IF NOT EXISTS articles (
  id SERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(100) NOT NULL,
  tags TEXT[],
  embedding JSONB,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- FAQs table
CREATE TABLE IF NOT EXISTS faqs (
  id SERIAL PRIMARY KEY,
  question VARCHAR(1000) NOT NULL,
  answer TEXT NOT NULL,
  category VARCHAR(100) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  embedding JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Videos table
CREATE TABLE IF NOT EXISTS videos (
  id SERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  url VARCHAR(2000) NOT NULL,
  summary TEXT,
  key_topics JSONB,
  timestamps JSONB,
  category VARCHAR(100) NOT NULL,
  duration_seconds INTEGER,
  embedding JSONB,
  analysis_status VARCHAR(20) DEFAULT 'pending' CHECK (analysis_status IN ('pending', 'processing', 'done', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for articles
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at DESC);

-- Indexes for faqs
CREATE INDEX IF NOT EXISTS idx_faqs_category ON faqs(category);
CREATE INDEX IF NOT EXISTS idx_faqs_sort_order ON faqs(sort_order);

-- Indexes for videos
CREATE INDEX IF NOT EXISTS idx_videos_category ON videos(category);
CREATE INDEX IF NOT EXISTS idx_videos_analysis_status ON videos(analysis_status);
