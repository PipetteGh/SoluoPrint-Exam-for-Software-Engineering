import { createClient } from '@supabase/supabase-js'

const VITE_SUPABASE_URL = 'https://jpbzssesnbsqrnqugjqx.supabase.co'
const VITE_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwYnpzc2VzbmJzcXJucXVnanF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NTMxMDcsImV4cCI6MjA5MDAyOTEwN30.9Lbql_h9YN3Q-GGavlrH9Wf6-Cal_uMIGhtgtkAX5R4'

const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)

async function run() {
  // Get admin user (we'll just get the company from any existing profile)
  const { data: profiles, error: profErr } = await supabase.from('profiles').select('company_id').limit(1)
  if (profErr || !profiles.length) {
    console.error('No profiles found', profErr)
    return
  }
  const companyId = profiles[0].company_id

  // Create a customer type if none exists
  let { data: custTypes } = await supabase.from('customer_types').select('id').limit(1)
  let custTypeId = custTypes?.length ? custTypes[0].id : null
  if (!custTypeId) {
    const { data: newType } = await supabase.from('customer_types').insert({ company_id: companyId, name: 'General' }).select().single()
    custTypeId = newType.id
  }

  // Check if test customer exists
  const { data: existingCust } = await supabase.from('customers').select('*').eq('username', 'CUST-9999').single()
  if (existingCust) {
    console.log('Customer already exists:', existingCust)
  } else {
    // Insert test customer
    const { data: newCust, error: custErr } = await supabase.from('customers').insert({
      company_id: companyId,
      name: 'Test Customer',
      customer_type_id: custTypeId,
      phone: '0200000000',
      email: 'test@example.com',
      username: 'CUST-9999',
      password: 'password123',
      balance: 150.50
    }).select().single()
    
    if (custErr) console.error('Error creating customer:', custErr)
    else console.log('Created customer:', newCust)
  }
}
run()
