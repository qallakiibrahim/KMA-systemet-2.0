-- 1. Create Tables

-- Profiles table (linked to auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT,
  username TEXT,
  email TEXT,
  role TEXT DEFAULT 'user',
  company_id UUID, -- Added for SaaS
  company TEXT,
  permissions TEXT[] DEFAULT '{viewer}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  status TEXT DEFAULT 'todo',
  priority TEXT DEFAULT 'Medium',
  created_by UUID REFERENCES auth.users ON DELETE CASCADE,
  company_id UUID, -- Added for SaaS
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Risker table
CREATE TABLE IF NOT EXISTS risker (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'Allmän',
  status TEXT DEFAULT 'Ej påbörjad',
  likelihood INTEGER,
  impact INTEGER,
  risk_score INTEGER,
  risk_level TEXT,
  responsible_uid UUID REFERENCES auth.users ON DELETE SET NULL,
  company_id UUID, -- Added for SaaS
  is_template BOOLEAN DEFAULT FALSE,
  is_global BOOLEAN DEFAULT FALSE,
  deadline DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Avvikelser table
CREATE TABLE IF NOT EXISTS avvikelser (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titel TEXT NOT NULL,
  beskrivning TEXT,
  status TEXT DEFAULT 'open',
  priority TEXT DEFAULT 'Medium',
  discovery_date DATE,
  ansvarig_uid UUID REFERENCES auth.users ON DELETE SET NULL,
  author_uid UUID REFERENCES auth.users ON DELETE CASCADE,
  company_id UUID, -- Added for SaaS
  avdelning TEXT,
  what TEXT,
  who TEXT,
  when_text TEXT,
  where_text TEXT,
  why TEXT,
  how TEXT,
  how_much TEXT,
  ai_rekommendation TEXT,
  deadline DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Calendar Events table
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN DEFAULT FALSE,
  recurrence TEXT DEFAULT 'none',
  created_by UUID REFERENCES auth.users ON DELETE CASCADE,
  company_id UUID, -- Added for SaaS
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security (RLS)

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE risker ENABLE ROW LEVEL SECURITY;
ALTER TABLE avvikelser ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies

-- Profiles: Users can read all profiles, but only update their own (unless superadmin)
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (
  auth.uid() = id OR 
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() AND p.role = 'superadmin'
  )
);

-- Tasks: Authenticated users can read all, but only modify their own (or all if admin - simplified for now)
CREATE POLICY "Tasks are viewable by authenticated users" ON tasks FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can insert tasks" ON tasks FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update their own tasks" ON tasks FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete their own tasks" ON tasks FOR DELETE USING (auth.uid() = created_by);

-- Risker: Similar policies
CREATE POLICY "Risker are viewable by authenticated users" ON risker FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can insert risker" ON risker FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update risker" ON risker FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Users can delete risker" ON risker FOR DELETE USING (auth.role() = 'authenticated');

-- Avvikelser: Similar policies
CREATE POLICY "Avvikelser are viewable by authenticated users" ON avvikelser FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can insert avvikelser" ON avvikelser FOR INSERT WITH CHECK (auth.uid() = author_uid);
CREATE POLICY "Users can update their own avvikelser" ON avvikelser FOR UPDATE USING (auth.uid() = author_uid);
CREATE POLICY "Users can delete their own avvikelser" ON avvikelser FOR DELETE USING (auth.uid() = author_uid);

-- Calendar Events: Similar policies
CREATE POLICY "Events are viewable by authenticated users" ON calendar_events FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can insert events" ON calendar_events FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update their own events" ON calendar_events FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete their own events" ON calendar_events FOR DELETE USING (auth.uid() = created_by);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  category TEXT DEFAULT 'general',
  version INTEGER DEFAULT 1,
  status TEXT DEFAULT 'utkast',
  creator_uid UUID REFERENCES auth.users ON DELETE CASCADE,
  company_id UUID, -- Added for SaaS
  is_template BOOLEAN DEFAULT FALSE,
  is_global BOOLEAN DEFAULT FALSE,
  next_review_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Documents are viewable by authenticated users" ON documents FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can insert documents" ON documents FOR INSERT WITH CHECK (auth.uid() = creator_uid);
CREATE POLICY "Users can update their own documents" ON documents FOR UPDATE USING (auth.uid() = creator_uid);
CREATE POLICY "Users can delete their own documents" ON documents FOR DELETE USING (auth.uid() = creator_uid);

-- Processes table
CREATE TABLE IF NOT EXISTS processes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  category TEXT, -- Added for SaaS
  parent_id UUID REFERENCES processes(id) ON DELETE CASCADE,
  steps JSONB DEFAULT '{"nodes": [], "edges": []}',
  created_by UUID REFERENCES auth.users ON DELETE CASCADE,
  company_id UUID, -- Added for SaaS
  is_template BOOLEAN DEFAULT FALSE,
  is_global BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE processes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Processes are viewable by authenticated users" ON processes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can insert processes" ON processes FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update their own processes" ON processes FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete their own processes" ON processes FOR DELETE USING (auth.uid() = created_by);

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  org_nr TEXT, -- Changed from org_number to org_nr to match frontend
  org_number TEXT, -- Keep for backward compatibility
  address TEXT,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  plan TEXT DEFAULT 'Basic', -- Added for SaaS
  status TEXT DEFAULT 'active', -- Added for SaaS
  expires_at TIMESTAMPTZ, -- Added for SaaS
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Companies are viewable by authenticated users" ON companies FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage companies" ON companies FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'superadmin')
  )
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own notifications" ON notifications FOR DELETE USING (auth.uid() = user_id);

-- Mail table (for Trigger Email equivalent)
CREATE TABLE IF NOT EXISTS mail (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "to" TEXT NOT NULL,
  message JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE mail ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert mail" ON mail FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 4. User invitations/pending profiles
CREATE TABLE IF NOT EXISTS pending_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  company_id UUID REFERENCES companies(id),
  role TEXT DEFAULT 'user',
  permissions TEXT[] DEFAULT '{read_write}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pending_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins can manage pending users" ON pending_users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'superadmin'
    )
  );

CREATE POLICY "Admins can manage pending users for their company" ON pending_users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin' AND p.company_id = pending_users.company_id
    )
  );

CREATE POLICY "Users can read their own invite" ON pending_users
  FOR SELECT USING (email = auth.jwt()->>'email');

-- 5. Create a trigger for new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  pending_role TEXT;
  pending_company_id UUID;
  pending_permissions TEXT[];
BEGIN
  -- Check if there is a pending invite for this email
  SELECT role, company_id, permissions 
  INTO pending_role, pending_company_id, pending_permissions
  FROM public.pending_users 
  WHERE email = NEW.email
  LIMIT 1;

  IF pending_company_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, display_name, role, company_id, permissions)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', pending_role, pending_company_id, pending_permissions);
    
    -- Delete the pending invite
    DELETE FROM public.pending_users WHERE email = NEW.email;
  ELSE
    INSERT INTO public.profiles (id, email, display_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
