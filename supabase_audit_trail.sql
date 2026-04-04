-- Audit Trail Setup for SafeQMS

-- 1. Create the audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
  old_data JSONB,
  new_data JSONB,
  changed_by UUID REFERENCES auth.users(id),
  company_id UUID REFERENCES public.companies(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policy
-- Users can see logs for their own company
CREATE POLICY "Users can view audit logs for their company" ON public.audit_logs
  FOR SELECT USING (
    auth.role() = 'authenticated' AND 
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.company_id = audit_logs.company_id
    )
  );

-- 4. Create the audit trigger function
CREATE OR REPLACE FUNCTION public.handle_audit_log()
RETURNS TRIGGER AS $$
DECLARE
  current_user_id UUID;
  current_company_id UUID;
BEGIN
  -- Get the current user ID from the auth context
  current_user_id := auth.uid();
  
  -- Determine company_id
  IF (TG_OP = 'DELETE') THEN
    -- For DELETE, we use the OLD record
    -- Check if company_id exists in the table
    BEGIN
      current_company_id := OLD.company_id;
    EXCEPTION WHEN OTHERS THEN
      current_company_id := NULL;
    END;
  ELSE
    -- For INSERT/UPDATE, we use the NEW record
    BEGIN
      current_company_id := NEW.company_id;
    EXCEPTION WHEN OTHERS THEN
      current_company_id := NULL;
    END;
  END IF;

  -- Insert the log entry
  INSERT INTO public.audit_logs (
    table_name,
    record_id,
    action,
    old_data,
    new_data,
    changed_by,
    company_id
  ) VALUES (
    TG_TABLE_NAME,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
    TG_OP,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
    current_user_id,
    current_company_id
  );
  
  -- Triggers on AFTER don't need to return the record
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Apply triggers to tables
-- Avvikelser
DROP TRIGGER IF EXISTS audit_avvikelser ON public.avvikelser;
CREATE TRIGGER audit_avvikelser
AFTER INSERT OR UPDATE OR DELETE ON public.avvikelser
FOR EACH ROW EXECUTE PROCEDURE public.handle_audit_log();

-- Risker
DROP TRIGGER IF EXISTS audit_risker ON public.risker;
CREATE TRIGGER audit_risker
AFTER INSERT OR UPDATE OR DELETE ON public.risker
FOR EACH ROW EXECUTE PROCEDURE public.handle_audit_log();

-- Tasks
DROP TRIGGER IF EXISTS audit_tasks ON public.tasks;
CREATE TRIGGER audit_tasks
AFTER INSERT OR UPDATE OR DELETE ON public.tasks
FOR EACH ROW EXECUTE PROCEDURE public.handle_audit_log();

-- Documents
DROP TRIGGER IF EXISTS audit_documents ON public.documents;
CREATE TRIGGER audit_documents
AFTER INSERT OR UPDATE OR DELETE ON public.documents
FOR EACH ROW EXECUTE PROCEDURE public.handle_audit_log();
