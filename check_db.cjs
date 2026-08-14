const fs = require('fs');
const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && !k.startsWith('#')) {
    env[k.trim()] = v.join('=').trim().replace(/[\'\"]/g, '');
  }
});

import('@supabase/supabase-js').then(({createClient}) => {
  const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
  const cid = '108232ce-aa7d-48ee-84db-321e584b18b4';
  return Promise.all([
    supabase.from('print_jobs').select('total_price').eq('customer_id', cid).neq('status', 'Cancelled'),
    supabase.from('payments').select('amount').eq('customer_id', cid),
    supabase.from('customers').select('balance, credit_balance').eq('id', cid).single()
  ]).then(([jobs, payments, customer]) => {
    const totalJobs = jobs.data.reduce((sum, j) => sum + Number(j.total_price), 0);
    const totalPays = payments.data.reduce((sum, p) => sum + Number(p.amount), 0);
    console.log('Total Jobs Cost:', totalJobs);
    console.log('Total Payments Made:', totalPays);
    console.log('Customer Row:', customer.data);
  });
}).catch(console.error);
