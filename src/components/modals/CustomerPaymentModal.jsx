import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { X, CreditCard, Smartphone, CheckCircle } from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'
import Preloader from '../ui/Preloader'

export default function CustomerPaymentModal({ onClose, onSuccess, customer, balance, job }) {
  const [amount, setAmount] = useState(job ? job.balance : (balance || 0))
  const [gateways, setGateways] = useState({ 
    paystack: false, paystackKey: '', 
    hubtel: false, hubtelClientId: '', hubtelClientSecret: '', hubtelMerchantId: '',
    flutterwave: false 
  })
  const [selectedMethod, setSelectedMethod] = useState('')
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const { showToast } = useToast()
  
  const currency = customer?.companies?.currency_symbol || '¢'
  const maxAmount = job ? Number(job.balance || 0) : Number(balance || 0)

  useEffect(() => {
    async function loadGateways() {
      if (!customer?.company_id) {
        setLoading(false)
        return
      }
      const { data, error } = await supabase
        .from('payment_gateways')
        .select('*')
        .eq('company_id', customer.company_id)
        .single()
        
      if (!error && data) {
        setGateways({
          paystack: data.paystack_active,
          paystackKey: data.paystack_public_key,
          hubtel: data.hubtel_active,
          hubtelClientId: data.hubtel_client_id,
          hubtelClientSecret: data.hubtel_client_secret,
          hubtelMerchantId: data.hubtel_merchant_account_number,
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
  }, [customer?.company_id])

  async function handlePayment(e) {
    e.preventDefault()
    if (!selectedMethod) {
      showToast('Please select a payment method', 'error')
      return
    }
    if (amount <= 0 || (maxAmount > 0 && amount > maxAmount)) {
      showToast('Please enter a valid amount', 'error')
      return
    }

    setProcessing(true)

    const processBackendPayment = async (reference) => {
      try {
        const { data: accounts } = await supabase
          .from('payment_accounts')
          .select('id')
          .eq('company_id', customer.company_id)
          .eq('is_active', true)
          .limit(1)

        const accountId = accounts && accounts.length > 0 ? accounts[0].id : null

        const { data: newPayment, error: payErr } = await supabase
          .from('payments')
          .insert({
            company_id: customer.company_id,
            customer_id: customer.id,
            job_id: job ? job.id : null,
            payment_account_id: accountId,
            amount: parseFloat(amount),
            payment_method: selectedMethod,
            notes: `Paid via Customer Portal (${selectedMethod})${reference ? ` Ref: ${reference}` : ''}`
          })
          .select()
          .single()

        if (payErr) throw payErr

        const newCustomerBalance = Number(customer.balance) - parseFloat(amount)
        await supabase
          .from('customers')
          .update({ balance: newCustomerBalance })
          .eq('id', customer.id)
          
        if (job) {
          const newJobBalance = Number(job.balance) - parseFloat(amount)
          const newJobAmountPaid = Number(job.amount_paid || 0) + parseFloat(amount)
          const jobStatus = newJobBalance <= 0 ? (job.status === 'Pending' ? 'In Progress' : job.status) : job.status
          
          await supabase
            .from('print_jobs')
            .update({ balance: newJobBalance, amount_paid: newJobAmountPaid, status: jobStatus })
            .eq('id', job.id)
        }

        await supabase.from('notifications').insert({
          company_id: customer.company_id,
          title: 'Payment Received (Portal)',
          message: `${customer.name} just paid ${currency}${amount} via ${selectedMethod}${job ? ` for Job #${job.job_number}` : ''}.`,
          type: 'payment_received'
        })

        try {
          const { notifyCustomer } = await import('../../lib/sms')
          const safeCurrency = currency === '¢' || currency === 'GH¢' ? 'GHS' : currency
          const msg = job 
            ? `your payment of ${safeCurrency} ${amount} for job ${job.job_number} has been received by ${customer?.companies?.name || 'us'}. Your remaining balance is ${safeCurrency} ${newCustomerBalance.toFixed(2)}.` 
            : `your payment of ${safeCurrency} ${amount} has been received by ${customer?.companies?.name || 'us'}. Your remaining balance is ${safeCurrency} ${newCustomerBalance.toFixed(2)}.`
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

    if (selectedMethod === 'Paystack') {
      if (!gateways.paystackKey) {
        showToast('Paystack is not fully configured by the shop.', 'error')
        setProcessing(false)
        return
      }

      // Dynamically load Paystack script if not present
      if (!window.PaystackPop) {
        const script = document.createElement('script')
        script.src = 'https://js.paystack.co/v1/inline.js'
        script.onload = () => {
          triggerPaystack()
        }
        script.onerror = () => {
          showToast('Failed to load Paystack payment gateway', 'error')
          setProcessing(false)
        }
        document.body.appendChild(script)
      } else {
        triggerPaystack()
      }

      function triggerPaystack() {
        const handler = window.PaystackPop.setup({
          key: gateways.paystackKey,
          email: customer.email || 'customer@soluoprint.com',
          amount: Math.round(parseFloat(amount) * 100), // convert to smallest currency unit (pesewas/cents)
          currency: customer?.companies?.currency || 'GHS',
          ref: 'SP_' + Math.floor((Math.random() * 1000000000) + 1),
          callback: function(response) {
            processBackendPayment(response.reference)
          },
          onClose: function() {
            setProcessing(false)
            showToast('Payment was cancelled', 'info')
          }
        })
        handler.openIframe()
      }
    } else if (selectedMethod === 'Hubtel') {
      if (!gateways.hubtelClientId || !gateways.hubtelClientSecret || !gateways.hubtelMerchantId) {
        showToast('Hubtel is not fully configured by the shop.', 'error')
        setProcessing(false)
        return
      }

      try {
        const reference = 'SP_' + Date.now() + '_' + Math.floor(Math.random() * 100000)
        const returnUrl = `${window.location.origin}/customer?hubtel_ref=${encodeURIComponent(reference)}&hubtel_status=success`
        const cancelUrl = `${window.location.origin}/customer?hubtel_ref=${encodeURIComponent(reference)}&hubtel_status=cancelled`

        // Store the pending payment reference in Supabase so we can process it when the customer returns
        const { error: upsertErr } = await supabase.from('pending_payments').upsert({
          client_reference: reference,
          company_id: customer.company_id,
          customer_id: customer.id,
          job_id: job ? job.id : null,
          amount: parseFloat(amount),
          gateway: 'Hubtel',
          status: 'pending',
          created_at: new Date().toISOString()
        }, { onConflict: 'client_reference' })
        
        if (upsertErr) {
          // Table may not exist yet — store in localStorage as fallback
          localStorage.setItem(`hubtel_pending_${reference}`, JSON.stringify({
            companyId: customer.company_id,
            customerId: customer.id,
            jobId: job ? job.id : null,
            amount: parseFloat(amount),
            gateway: 'Hubtel'
          }))
        }

        // Also always store in localStorage as immediate fallback
        localStorage.setItem(`hubtel_pending_${reference}`, JSON.stringify({
          companyId: customer.company_id,
          customerId: customer.id,
          jobId: job ? job.id : null,
          amount: parseFloat(amount),
          gateway: 'Hubtel'
        }))

        // Call server-side proxy to initiate Hubtel checkout (avoids CORS)
        const baseUrl = window.location.origin
        const response = await fetch(`${baseUrl}/api/hubtel/initiate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: gateways.hubtelClientId,
            clientSecret: gateways.hubtelClientSecret,
            totalAmount: parseFloat(amount),
            title: `Payment to ${customer?.companies?.name || 'Shop'}`,
            description: job ? `Payment for Job #${job.job_number}` : 'Outstanding Balance Payment',
            clientReference: reference,
            callbackUrl: `${baseUrl}/api/hubtel/callback`,
            returnUrl: returnUrl,
            cancellationUrl: cancelUrl,
            merchantAccountNumber: gateways.hubtelMerchantId
          })
        })

        const result = await response.json()

        if (result.success && result.data?.data?.checkoutUrl) {
          showToast('Redirecting to Hubtel secure checkout...', 'info')
          setTimeout(() => {
            window.location.href = result.data.data.checkoutUrl
          }, 1000)
        } else if (result.data?.data?.checkoutUrl) {
          // Some Hubtel responses nest differently
          showToast('Redirecting to Hubtel secure checkout...', 'info')
          setTimeout(() => {
            window.location.href = result.data.data.checkoutUrl
          }, 1000)
        } else {
          // Extract specific Hubtel error details if available
          let details = ''
          if (result.data?.errors) {
            details = ': ' + JSON.stringify(result.data.errors)
          } else if (result.data?.message) {
            details = ': ' + result.data.message
          }
          const errMsg = 'Hubtel Error' + details || result.error || 'Failed to initiate Hubtel checkout. Please check your Hubtel credentials.'
          throw new Error(errMsg)
        }
      } catch (err) {
        console.error('Hubtel checkout error:', err)
        showToast(err.message || 'Error processing Hubtel payment.', 'error')
        setProcessing(false)
      }
    } else {
      // Handle other methods (simulate for now if not implemented)
      await new Promise(r => setTimeout(r, 2000))
      processBackendPayment()
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
                    max={maxAmount > 0 ? maxAmount : undefined}
                    min="0.01"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '20px' }}>
                <label className="form-label" style={{ color: '#1e293b', fontWeight: 600, fontSize: '14px', marginBottom: '10px' }}>Payment Method</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', border: '1px solid #cbd5e1', borderRadius: '10px', backgroundColor: '#f8fafc' }}>
                  {selectedMethod === 'Paystack' && <CreditCard size={20} style={{ color: '#0ea5e9' }} />}
                  {selectedMethod === 'Hubtel' && <Smartphone size={20} style={{ color: '#f59e0b' }} />}
                  {selectedMethod === 'Flutterwave' && <CreditCard size={20} style={{ color: '#f43f5e' }} />}
                  
                  <span style={{ fontWeight: 600, color: '#334155', fontSize: '14px' }}>
                    {selectedMethod ? `Secure checkout via ${selectedMethod}` : 'No payment method active'}
                  </span>
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
