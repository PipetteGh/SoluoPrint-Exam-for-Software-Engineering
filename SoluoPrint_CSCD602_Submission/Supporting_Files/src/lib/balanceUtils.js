import { supabase } from './supabase'

/**
 * Recalculates and updates the exact balance and credit_balance for a customer.
 * Financial Integrity Rule: Balance = Sum(Active Print Jobs.total_price) - Sum(Customer Payments.amount)
 */
export async function recalculateCustomerBalance(customerId) {
  if (!customerId) return 0

  try {
    // 1. Fetch all active (non-cancelled) print jobs for this customer
    const { data: jobs, error: jobsErr } = await supabase
      .from('print_jobs')
      .select('id, total_price, balance, status')
      .eq('customer_id', customerId)
      .neq('status', 'Cancelled')

    if (jobsErr) console.error('Error fetching customer jobs for balance:', jobsErr)

    // 2. Fetch all payments recorded for this customer
    const { data: payments, error: payErr } = await supabase
      .from('payments')
      .select('id, amount, job_id')
      .eq('customer_id', customerId)

    if (payErr) console.error('Error fetching customer payments for balance:', payErr)

    // 3. Compute totals
    const activeJobs = jobs || []
    const customerPayments = payments || []

    const totalJobPrice = activeJobs.reduce((sum, j) => sum + (Number(j.total_price) || 0), 0)
    const totalPaymentsMade = customerPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)

    // Net Owed Balance = Max(0, Total Job Price - Total Payments Made)
    // Credit Balance = Max(0, Total Payments Made - Total Job Price)
    const netOwed = Math.max(0, totalJobPrice - totalPaymentsMade)
    const creditBal = Math.max(0, totalPaymentsMade - totalJobPrice)

    // 4. Update the customers table row with accurate values
    const { error: updateErr } = await supabase
      .from('customers')
      .update({
        balance: netOwed,
        credit_balance: creditBal
      })
      .eq('id', customerId)

    if (updateErr) console.error('Error updating customer balance:', updateErr)

    return netOwed
  } catch (err) {
    console.error('Exception in recalculateCustomerBalance:', err)
    return 0
  }
}

/**
 * Utility to sync all customer balances for a company
 */
export async function syncAllCompanyCustomerBalances(companyId) {
  if (!companyId) return
  try {
    const { data: customers } = await supabase
      .from('customers')
      .select('id')
      .eq('company_id', companyId)

    if (customers && customers.length > 0) {
      for (const cust of customers) {
        await recalculateCustomerBalance(cust.id)
      }
    }
  } catch (e) {
    console.error('Error syncing company customer balances:', e)
  }
}
