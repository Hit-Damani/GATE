-- =====================================================================
-- GATE 2027 — Consolidated Single-File Database Setup
-- Run this once in: Supabase Dashboard → SQL Editor → New Query → Run
-- =====================================================================

-- 1. Shared updated_at Trigger Function
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- 2. Tables Definition
CREATE TABLE IF NOT EXISTS public.profiles (
    id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email           TEXT,
    display_name    TEXT NOT NULL DEFAULT 'GATE Aspirant',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subjects (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    icon            TEXT NOT NULL,
    accent          TEXT NOT NULL,
    total_tasks     INTEGER NOT NULL DEFAULT 0,
    sort_order      INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subject_progress (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id      TEXT NOT NULL REFERENCES public.subjects(id),
    completed_tasks INTEGER NOT NULL DEFAULT 0,
    total_tasks     INTEGER NOT NULL DEFAULT 0,
    percentage      INTEGER NOT NULL DEFAULT 0 CHECK (percentage BETWEEN 0 AND 100),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, subject_id)
);

CREATE TABLE IF NOT EXISTS public.task_completions (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    task_id        TEXT NOT NULL,
    subject_id     TEXT NOT NULL REFERENCES public.subjects(id),
    is_completed   BOOLEAN NOT NULL DEFAULT true,
    completed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, task_id)
);

-- Triggers for auto-updated_at
CREATE TRIGGER tr_profiles_up BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER tr_subjects_up BEFORE UPDATE ON public.subjects FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER tr_progress_up BEFORE UPDATE ON public.subject_progress FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER tr_completions_up BEFORE UPDATE ON public.task_completions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_progress_user ON public.subject_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_completions_user_subject ON public.task_completions(user_id, subject_id);

-- 3. Row Level Security Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_user" ON public.profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "subjects_read" ON public.subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "progress_user" ON public.subject_progress FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "completions_user" ON public.task_completions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. Auto-Create User Data Trigger on Signup
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$
DECLARE
    name_val TEXT := COALESCE(NULLIF(NEW.raw_user_meta_data->>'display_name', ''), 'GATE Aspirant');
BEGIN
    INSERT INTO public.profiles (id, email, display_name)
    VALUES (NEW.id, NEW.email, name_val)
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, display_name = EXCLUDED.display_name;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;

-- 6. Seed Subjects
INSERT INTO public.subjects (id, name, icon, accent, sort_order) VALUES
    ('coa',                    'Computer Organization & Architecture', 'cpu',        'purple',  1),
    ('os',                     'Operating System',                     'terminal',   'blue',    2),
    ('dbms',                   'DBMS',                                 'database',   'cyan',    3),
    ('cn',                     'Computer Networks',                    'globe',      'emerald', 4),
    ('data-structures',        'Data Structures',                      'layers',     'indigo',  5),
    ('algorithms',             'Algorithms',                           'git-branch', 'violet',  6),
    ('toc',                    'Theory of Computation',                'settings',   'teal',    7),
    ('compiler',               'Compiler Design',                      'code-2',     'rose',    8),
    ('digital-logic',          'Digital Logic',                         'binary',     'amber',   9),
    ('engineering-mathematics', 'Engineering Mathematics',              'calculator', 'orange',  10),
    ('discrete-mathematics',   'Discrete Mathematics',                 'hash',       'pink',    11),
    ('c-programming',          'C Programming',                        'file-code',  'sky',     12),
    ('aptitude',               'General Aptitude',                     'lightbulb',  'green',   13)
ON CONFLICT (id) DO NOTHING;
