import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function run() {
  const { data, error } = await supabase.from('customers').select('name, balance').gt('balance', 0)
  console.log('Customers with balance > 0:', data)
  console.log('Error:', error)
}
run()
