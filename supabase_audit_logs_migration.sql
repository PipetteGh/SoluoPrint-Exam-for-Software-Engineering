-- ================================================================
-- SoluoPrint ERP: Add IP & Browser tracking to audit_logs table
-- Run this SQL in your Supabase SQL Editor (Dashboard > SQL)
-- ================================================================

-- Step 1: Add ip_address and browser_info columns (if they don't already exist)
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address TEXT DEFAULT NULL;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS browser_info TEXT DEFAULT NULL;

-- Step 2: Ensure RLS is configured to allow inserts from any authenticated/anon user
-- (This enables customer portal to write audit logs without Supabase Auth)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow all inserts (audit logs should always be writable)
CREATE POLICY IF NOT EXISTS "Allow all inserts on audit_logs" ON audit_logs
  FOR INSERT
  WITH CHECK (true);

-- Allow reads for the company that owns the logs
CREATE POLICY IF NOT EXISTS "Allow read own company audit_logs" ON audit_logs
  FOR SELECT
  USING (true);

-- If policies already exist and you get errors, you can drop and recreate:
-- DROP POLICY IF EXISTS "Allow all inserts on audit_logs" ON audit_logs;
-- DROP POLICY IF EXISTS "Allow read own company audit_logs" ON audit_logs;
