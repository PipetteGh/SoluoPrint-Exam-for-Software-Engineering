import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { X, CreditCard, Smartphone, CheckCircle } from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'

export default function CustomerPaymentModal({ onClose, onSuccess, customer, balance, job }) {
  const [amount, setAmount] = useState(job ? job.balance : (balance || 0))
  const [gateways, setGateways] = useState({ paystack: false, hubtel: false, flutterwave: false })
  const [selectedMethod, setSelectedMethod] = useState('')
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const { showToast } = useToast()
  
  const currency = customer?.companies?.currency_symbol || '¢'
  const maxAmount = job ? job.balance : balance

  useEffect(() => {
    async function loadGateways() {
      const { data, error } = await supabase
        .from('payment_gateways')
        .select('*')
        .eq('company_id', customer.company_id)
        .single()
        
      if (!error && data) {
        setGateways({
          paystack: data.paystack_active,
          hubtel: data.hubtel_active,
          flutterwave: data.flutterwave_active
        })
        
        // Auto-select first available method
        if (data.paystack_active) setSelectedMethod('Paystack')
        else if (data.hubtel_active) setSelectedMethod('Hubtel')
        else if (data.flutterwave_active) setSelectedMethod('Flutterwave')
      }
      setLoading(false)
    }
    loadGateways()
  }, [customer.company_id])

  async function handlePayment(e) {
    e.preventDefault()
    if (!selectedMethod) {
      showToast('Please select a payment method', 'error')
      return
    }
    if (amount <= 0 || amount > maxAmount) {
      showToast('Please enter a valid amount', 'error')
      return
    }

    setProcessing(true)

    // Simulate payment delay
    await new Promise(r => setTimeout(r, 2000))

    try {
      // 1. We need to find a payment account to credit this to. Let's just pick the first active one, or create a 'Portal Payments' one if needed.
      // But for simplicity, let's find the first one.
      const { data: accounts } = await supabase
        .from('payment_accounts')
        .select('id')
        .eq('company_id', customer.company_id)
        .eq('is_active', true)
        .limit(1)

      const accountId = accounts && accounts.length > 0 ? accounts[0].id : null

      // 2. Insert Payment Record
      const { data: newPayment, error: payErr } = await supabase
        .from('payments')
        .insert({
          company_id: customer.company_id,
          customer_id: customer.id,
          job_id: job ? job.id : null,
          payment_account_id: accountId,
          amount: parseFloat(amount),
          payment_method: selectedMethod,
          notes: `Paid via Customer Portal (${selectedMethod})`
        })
        .select()
        .single()

      if (payErr) throw payErr

      // 3. Update Customer Balance
      const newCustomerBalance = Number(customer.balance) - parseFloat(amount)
      await supabase
        .from('customers')
        .update({ balance: newCustomerBalance })
        .eq('id', customer.id)
        
      // 3.5 Update Job Balance if applicable
      if (job) {
        const newJobBalance = Number(job.balance) - parseFloat(amount)
        const newJobAmountPaid = Number(job.amount_paid || 0) + parseFloat(amount)
        const jobStatus = newJobBalance <= 0 ? (job.status === 'Pending' ? 'In Progress' : job.status) : job.status
        
        await supabase
          .from('print_jobs')
          .update({ balance: newJobBalance, amount_paid: newJobAmountPaid, status: jobStatus })
          .eq('id', job.id)
      }

      // 4. Send Confirmation Notification to Admin
      await supabase.from('notifications').insert({
        company_id: customer.company_id,
        title: 'Payment Received (Portal)',
        message: `${customer.name} just paid ${currency}${amount} via ${selectedMethod}${job ? ` for Job #${job.job_number}` : ''}.`,
        type: 'payment_received'
      })

      // 5. Optionally trigger the SMS / Email via the backend...
      try {
        const { notifyCustomer } = await import('../../lib/sms')
        const msg = job 
          ? `your payment of ${currency} ${amount} for job ${job.job_number} via ${selectedMethod} has been received.` 
          : `your payment of ${currency} ${amount} via ${selectedMethod} has been received. Your remaining balance is ${currency} ${newCustomerBalance.toFixed(2)}.`
        await notifyCustomer(customer.company_id, customer.id, 'payment_received', msg)
      } catch (e) {
        console.error('Failed to send sms', e)
      }

      showToast('Payment successful!', 'success')
      if (onSuccess) onSuccess(newPayment)
    } catch (err) {
      showToast(err.message || 'Payment failed.', 'error')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) return (
    <div className="modal-overlay">
      <div className="modal-content"><div className="spinner"></div></div>
    </div>
  )

  const hasGateways = gateways.paystack || gateways.hubtel || gateways.flutterwave

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '450px' }}>
        <div className="modal-header">
          <h2 className="modal-title">{job ? `Pay for Job #${job.job_number || 'N/A'}` : 'Pay Outstanding Balance'}</h2>
          <button className="btn-close" onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handlePayment} className="modal-body">
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <p style={{ color: 'var(--text-muted)', margin: '0 0 8px' }}>Total Outstanding</p>
            <h2 style={{ margin: 0, fontSize: '32px' }}>{currency} {Number(maxAmount).toFixed(2)}</h2>
          </div>

          {!hasGateways ? (
            <div className="error-alert" style={{ textAlign: 'center' }}>
              No payment gateways are currently enabled by the shop. Please contact them to make a payment.
            </div>
          ) : (
            <>
              <div className="form-group">
                <label className="form-label">Amount to Pay</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }}>{currency}</span>
                  <input
                    type="number"
                    className="form-control"
                    style={{ paddingLeft: '32px' }}
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    max={balance}
                    min="1"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '24px' }}>
                <label className="form-label">Select Payment Method</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  
                  {gateways.paystack && (
                    <label style={{
                      display: 'flex', alignItems: 'center', gap: '12px', padding: '16px',
                      border: `1px solid ${selectedMethod === 'Paystack' ? 'var(--primary)' : 'var(--border)'}`,
                      borderRadius: '8px', cursor: 'pointer',
                      backgroundColor: selectedMethod === 'Paystack' ? 'rgba(37,99,235,0.05)' : 'white'
                    }}>
                      <input type="radio" name="method" checked={selectedMethod === 'Paystack'} onChange={() => setSelectedMethod('Paystack')} style={{ accentColor: 'var(--primary)' }} />
                      <CreditCard size={20} style={{ color: '#0ea5e9' }} />
                      <span style={{ fontWeight: 500 }}>Pay with Paystack</span>
                    </label>
                  )}

                  {gateways.hubtel && (
                    <label style={{
                      display: 'flex', alignItems: 'center', gap: '12px', padding: '16px',
                      border: `1px solid ${selectedMethod === 'Hubtel' ? 'var(--primary)' : 'var(--border)'}`,
                      borderRadius: '8px', cursor: 'pointer',
                      backgroundColor: selectedMethod === 'Hubtel' ? 'rgba(37,99,235,0.05)' : 'white'
                    }}>
                      <input type="radio" name="method" checked={selectedMethod === 'Hubtel'} onChange={() => setSelectedMethod('Hubtel')} style={{ accentColor: 'var(--primary)' }} />
                      <Smartphone size={20} style={{ color: '#f59e0b' }} />
                      <span style={{ fontWeight: 500 }}>Pay with Hubtel (MoMo)</span>
                    </label>
                  )}

                  {gateways.flutterwave && (
                    <label style={{
                      display: 'flex', alignItems: 'center', gap: '12px', padding: '16px',
                      border: `1px solid ${selectedMethod === 'Flutterwave' ? 'var(--primary)' : 'var(--border)'}`,
                      borderRadius: '8px', cursor: 'pointer',
                      backgroundColor: selectedMethod === 'Flutterwave' ? 'rgba(37,99,235,0.05)' : 'white'
                    }}>
                      <input type="radio" name="method" checked={selectedMethod === 'Flutterwave'} onChange={() => setSelectedMethod('Flutterwave')} style={{ accentColor: 'var(--primary)' }} />
                      <CreditCard size={20} style={{ color: '#f43f5e' }} />
                      <span style={{ fontWeight: 500 }}>Pay with Flutterwave</span>
                    </label>
                  )}

                </div>
              </div>
            </>
          )}

          <div className="modal-footer" style={{ marginTop: '24px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={processing}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={processing || !hasGateways}>
              {processing ? 'Processing...' : `Pay ${currency}${Number(amount).toFixed(2)}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
