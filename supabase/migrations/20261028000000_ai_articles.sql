-- Scraped rows become private source material; only AI-written, fact-checked
-- articles are published to readers.
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'raw',
  ADD COLUMN IF NOT EXISTS ai_generated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS audio_url text,
  ADD COLUMN IF NOT EXISTS image_alt text,
  ADD COLUMN IF NOT EXISTS seo_title text,
  ADD COLUMN IF NOT EXISTS seo_description text,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS source_slug text,
  ADD COLUMN IF NOT EXISTS generation_notes jsonb;

UPDATE public.articles SET status = 'raw' WHERE ai_generated = false;

CREATE INDEX IF NOT EXISTS articles_status_published_idx
  ON public.articles (status, published_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS articles_source_slug_uidx
  ON public.articles (source_slug) WHERE source_slug IS NOT NULL;

-- Readers only ever see published articles.
DROP POLICY IF EXISTS "Articles are publicly readable" ON public.articles;
CREATE POLICY "Published articles are publicly readable" ON public.articles
  FOR SELECT TO anon, authenticated USING (status = 'published');

-- Newsletter signups (insert-only for the public).
CREATE TABLE IF NOT EXISTS public.subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.subscribers TO anon, authenticated;
GRANT ALL ON public.subscribers TO service_role;
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can subscribe" ON public.subscribers
  FOR INSERT TO anon, authenticated WITH CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');

-- Public bucket for generated images and audio.
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;
