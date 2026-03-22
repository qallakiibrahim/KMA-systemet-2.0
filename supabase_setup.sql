-- SQL Script to set up Supabase database for the application

-- 1. Create Tables

-- Avvikelser (Deviations)
CREATE TABLE IF NOT EXISTS avvikelser (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titel TEXT NOT NULL,
  beskrivning TEXT,
  problemdefinition TEXT, -- Stores 5W2H data as text
  priority TEXT DEFAULT 'Medium',
  severity INTEGER DEFAULT 1,
  probability INTEGER DEFAULT 1,
  status TEXT DEFAULT 'open',
  deadline TIMESTAMPTZ,
  author_uid TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  uppfoljning JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Risker (Risks)
CREATE TABLE IF NOT EXISTS risker (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  likelihood INTEGER DEFAULT 1,
  impact INTEGER DEFAULT 1,
  risk_score INTEGER DEFAULT 1,
  status TEXT DEFAULT 'open',
  category TEXT DEFAULT 'general',
  deadline TIMESTAMPTZ,
  owner_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Documents (Dokument)
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  category TEXT DEFAULT 'general',
  uploaded_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Processes (Processer)
CREATE TABLE IF NOT EXISTS processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  parent_id UUID REFERENCES processes(id) ON DELETE CASCADE,
  steps JSONB DEFAULT '{"nodes": [], "edges": []}',
  created_by UUID REFERENCES auth.users ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tasks (Uppgifter)
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo',
  priority TEXT DEFAULT 'Medium',
  "dueDate" TIMESTAMPTZ,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Companies (Företag)
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  org_number TEXT,
  address TEXT,
  city TEXT,
  zip_code TEXT,
  country TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Notifications (Notiser)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Calendar Events (Kalenderhändelser)
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  user_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE avvikelser ENABLE ROW LEVEL SECURITY;
ALTER TABLE risker ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- 3. Create Policies (Allow authenticated users to perform all actions for now)
-- In a production app, you should restrict these further based on user_id/author_uid

-- Avvikelser Policies
CREATE POLICY "Allow all for authenticated users" ON avvikelser FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read" ON avvikelser FOR SELECT TO public USING (true);

-- Risker Policies
CREATE POLICY "Allow all for authenticated users" ON risker FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read" ON risker FOR SELECT TO public USING (true);

-- Documents Policies
CREATE POLICY "Allow all for authenticated users" ON documents FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read" ON documents FOR SELECT TO public USING (true);

-- Processes Policies
CREATE POLICY "Allow all for authenticated users" ON processes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read" ON processes FOR SELECT TO public USING (true);

-- Tasks Policies
CREATE POLICY "Allow all for authenticated users" ON tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read" ON tasks FOR SELECT TO public USING (true);

-- Companies Policies
CREATE POLICY "Allow all for authenticated users" ON companies FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read" ON companies FOR SELECT TO public USING (true);

-- Notifications Policies
CREATE POLICY "Allow all for authenticated users" ON notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read" ON notifications FOR SELECT TO public USING (true);

-- Calendar Events Policies
CREATE POLICY "Allow all for authenticated users" ON calendar_events FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read" ON calendar_events FOR SELECT TO public USING (true);

-- 4. Storage Buckets
-- Note: Buckets must be created via the Supabase UI or API. 
-- This script only documents the required buckets:
-- - 'avvikelser' (Public)
