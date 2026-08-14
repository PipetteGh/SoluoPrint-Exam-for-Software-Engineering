-- ================================================================
-- SoluoPrint ERP: Update payment_gateways table
-- Run this SQL in your Supabase SQL Editor (Dashboard > SQL)
-- ================================================================

ALTER TABLE IF EXISTS public.payment_gateways ADD COLUMN IF NOT EXISTS hubtel_merchant_account_number text NULL;
