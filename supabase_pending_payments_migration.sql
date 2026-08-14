-- ================================================================
-- SoluoPrint ERP: Create pending_payments table for Hubtel tracking
-- Run this SQL in your Supabase SQL Editor (Dashboard > SQL)
-- ================================================================

CREATE TABLE IF NOT EXISTS public.pending_payments (
  client_reference text NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  job_id uuid NULL REFERENCES public.print_jobs(id) ON DELETE SET NULL,
  amount numeric(12, 2) NOT NULL DEFAULT 0.00,
  gateway text NOT NULL DEFAULT 'Hubtel',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT pending_payments_pkey PRIMARY KEY (client_reference)
);

-- Allow anonymous inserts (customer portal uses anon key)
ALTER TABLE public.pending_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous insert on pending_payments"
  ON public.pending_payments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow anonymous select on pending_payments"
  ON public.pending_payments FOR SELECT
  USING (true);

CREATE POLICY "Allow anonymous update on pending_payments"
  ON public.pending_payments FOR UPDATE
  USING (true);
