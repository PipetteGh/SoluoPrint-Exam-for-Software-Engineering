import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { X, CreditCard, Smartphone, CheckCircle } from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'
import Preloader from '../ui/Preloader'

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
    <div className="modal-overlay" style={{ zIndex: 1100, backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)' }}>
      <div className="modal-content" style={{ backgroundColor: '#ffffff', padding: '32px', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)', maxWidth: '400px', width: '90%' }}>
        <Preloader />
      </div>
    </div>
  )

  const hasGateways = gateways.paystack || gateways.hubtel || gateways.flutterwave

  return (
    <div className="modal-overlay" style={{ zIndex: 1100, backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)' }}>
      <div className="modal-content" style={{ maxWidth: '480px', width: '90%', backgroundColor: '#ffffff', color: '#0f172a', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)', padding: '28px', border: '1px solid #cbd5e1' }}>
        <div className="modal-header" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '20px' }}>
          <h2 className="modal-title" style={{ color: '#0f172a', fontSize: '20px', fontWeight: 700 }}>
            {job ? `Pay for Job #${job.job_number || 'N/A'}` : 'Pay Outstanding Balance'}
          </h2>
          <button className="btn-close" onClick={onClose} style={{ color: '#64748b' }}><X size={20} /></button>
        </div>

        <form onSubmit={handlePayment} className="modal-body" style={{ padding: 0 }}>
          <div style={{ textAlign: 'center', marginBottom: '24px', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <p style={{ color: '#64748b', margin: '0 0 4px', fontSize: '13px', fontWeight: 500 }}>Total Outstanding Balance</p>
            <h2 style={{ margin: 0, fontSize: '32px', color: '#1e293b', fontWeight: 800 }}>
              {currency} {Number(maxAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h2>
          </div>

          {!hasGateways ? (
            <div className="error-alert" style={{ textAlign: 'center', padding: '16px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '8px' }}>
              No payment gateways are currently enabled by the shop. Please contact staff to settle payment.
            </div>
          ) : (
            <>
              <div className="form-group">
                <label className="form-label" style={{ color: '#1e293b', fontWeight: 600, fontSize: '14px', marginBottom: '8px' }}>Amount to Pay</label>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden', backgroundColor: 'white' }}>
                  <span style={{ backgroundColor: '#f1f5f9', padding: '10px 16px', fontWeight: 700, color: '#334155', borderRight: '1px solid #cbd5e1', fontSize: '15px' }}>
                    {currency}
                  </span>
                  <input
                    type="number"
                    className="form-control"
                    style={{ border: 'none', height: '44px', paddingLeft: '14px', fontSize: '16px', fontWeight: 600, width: '100%', outline: 'none' }}
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    max={balance}
                    min="1"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '20px' }}>
                <label className="form-label" style={{ color: '#1e293b', fontWeight: 600, fontSize: '14px', marginBottom: '10px' }}>Select Payment Method</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  
                  {gateways.paystack && (
                    <label style={{
                      display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px',
                      border: `2px solid ${selectedMethod === 'Paystack' ? '#2563eb' : '#cbd5e1'}`,
                      borderRadius: '10px', cursor: 'pointer',
                      backgroundColor: selectedMethod === 'Paystack' ? '#eff6ff' : 'white',
                      transition: 'all 0.15s ease'
                    }}>
                      <input type="radio" name="method" checked={selectedMethod === 'Paystack'} onChange={() => setSelectedMethod('Paystack')} style={{ accentColor: '#2563eb', width: '18px', height: '18px' }} />
                      <CreditCard size={20} style={{ color: '#0ea5e9' }} />
                      <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '14px' }}>Pay with Paystack (Card / MoMo)</span>
                    </label>
                  )}

                  {gateways.hubtel && (
                    <label style={{
                      display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px',
                      border: `2px solid ${selectedMethod === 'Hubtel' ? '#2563eb' : '#cbd5e1'}`,
                      borderRadius: '10px', cursor: 'pointer',
                      backgroundColor: selectedMethod === 'Hubtel' ? '#eff6ff' : 'white',
                      transition: 'all 0.15s ease'
                    }}>
                      <input type="radio" name="method" checked={selectedMethod === 'Hubtel'} onChange={() => setSelectedMethod('Hubtel')} style={{ accentColor: '#2563eb', width: '18px', height: '18px' }} />
                      <Smartphone size={20} style={{ color: '#f59e0b' }} />
                      <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '14px' }}>Pay with Hubtel Mobile Money</span>
                    </label>
                  )}

                  {gateways.flutterwave && (
                    <label style={{
                      display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px',
                      border: `2px solid ${selectedMethod === 'Flutterwave' ? '#2563eb' : '#cbd5e1'}`,
                      borderRadius: '10px', cursor: 'pointer',
                      backgroundColor: selectedMethod === 'Flutterwave' ? '#eff6ff' : 'white',
                      transition: 'all 0.15s ease'
                    }}>
                      <input type="radio" name="method" checked={selectedMethod === 'Flutterwave'} onChange={() => setSelectedMethod('Flutterwave')} style={{ accentColor: '#2563eb', width: '18px', height: '18px' }} />
                      <CreditCard size={20} style={{ color: '#f43f5e' }} />
                      <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '14px' }}>Pay with Flutterwave</span>
                    </label>
                  )}

                </div>
              </div>
            </>
          )}

          <div className="modal-footer" style={{ marginTop: '28px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={processing} style={{ borderRadius: '8px', padding: '10px 18px' }}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={processing || !hasGateways} style={{ backgroundColor: '#2563eb', color: 'white', borderRadius: '8px', padding: '10px 22px', fontWeight: 600 }}>
              {processing ? 'Processing Payment...' : `Pay ${currency}${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
