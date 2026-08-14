-- ================================================================
-- SoluoPrint ERP: Create audit_logs table and add policies
-- Run this SQL in your Supabase SQL Editor (Dashboard > SQL)
-- ================================================================

-- Step 1: Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
    company_id uuid NULL,
    user_id uuid NULL,
    actor_name character varying(255) NULL,
    actor_role character varying(100) NULL,
    action character varying(255) NULL,
    details text NULL,
    ip_address text NULL,
    browser_info text NULL,
    created_at timestamp with time zone NULL DEFAULT now(),
    CONSTRAINT audit_logs_pkey PRIMARY KEY (id),
    CONSTRAINT audit_logs_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- Step 2: Ensure RLS is configured to allow inserts from any authenticated/anon user
-- (This enables customer portal to write audit logs without Supabase Auth)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow all inserts (audit logs should always be writable)
CREATE POLICY "Allow all inserts on audit_logs" ON public.audit_logs
  FOR INSERT
  WITH CHECK (true);

-- Allow reads for everyone or restrict by company if you prefer
CREATE POLICY "Allow read own company audit_logs" ON public.audit_logs
  FOR SELECT
  USING (true);
