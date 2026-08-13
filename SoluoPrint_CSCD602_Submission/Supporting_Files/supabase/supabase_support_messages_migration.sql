-- ================================================================
-- SoluoPrint ERP: Create support_messages table for Live Chat
-- Run this SQL in your Supabase SQL Editor (Dashboard > SQL)
-- ================================================================

-- Step 1: Create the support_messages table
CREATE TABLE IF NOT EXISTS support_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
    sender_type VARCHAR(10) CHECK (sender_type IN ('customer', 'staff')) NOT NULL,
    sender_name VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Step 2: Enable Row Level Security (RLS)
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- Step 3: Create RLS policies for Select and Insert
-- Allow inserts from anyone (enables anonymous customer chat portal inserts)
CREATE POLICY "Allow anonymous and authenticated inserts" ON support_messages
    FOR INSERT
    WITH CHECK (true);

-- Allow selects for anyone (enables customers and staff to read chat history)
CREATE POLICY "Allow anonymous and authenticated selects" ON support_messages
    FOR SELECT
    USING (true);

-- Step 4: Enable Realtime tracking for support_messages
-- This is critical so that admins and customers see new messages instantly without refreshing!
ALTER PUBLICATION supabase_realtime ADD TABLE support_messages;
