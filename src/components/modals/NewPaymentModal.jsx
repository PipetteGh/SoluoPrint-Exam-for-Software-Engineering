import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { supabase } from '../../lib/supabase'
import Select from 'react-select'

const PAYMENT_METHODS = ['Cash', 'Mobile Money', 'Bank Transfer', 'Cheque', 'Card']

export default function NewPaymentModal({ onClose, onSuccess, preSelectedCustomerId, preSelectedJobId }) {
  const { company } = useAuth()
  const [customers, setCustomers] = useState([])
  const [accounts, setAccounts] = useState([])
  const [jobsForCustomer, setJobsForCustomer] = useState([])
  const [form, setForm] = useState({
    customer_id: preSelectedCustomerId || '',
    job_id: preSelectedJobId || '',
    amount: '',
    payment_method: 'Cash',
    payment_account_id: '',
    payment_date: new Date().toISOString().split('T')[0],
    notes: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const toast = useToast()
  const [selectedJob, setSelectedJob] = useState(null)

  useEffect(() => {
    if (!company) return
    supabase.from('customers').select('id,name,balance').eq('company_id', company.id).order('name').then(({ data }) => setCustomers(data || []))
    supabase.from('payment_accounts').select('*').eq('company_id', company.id).then(({ data }) => {
      setAccounts(data || [])
      if (data?.length) setForm(f => ({ ...f, payment_account_id: data[0].id }))
    })
  }, [company])

  useEffect(() => {
    if (!form.customer_id) { setJobsForCustomer([]); setSelectedJob(null); return }
    supabase.from('print_jobs').select('id,job_number,total_price,balance,status').eq('company_id', company.id).eq('customer_id', form.customer_id).neq('status', 'Cancelled').order('created_at', { ascending: false })
      .then(({ data }) => {
        setJobsForCustomer(data || [])
      })
  }, [form.customer_id])

  useEffect(() => {
    if (!form.job_id) { setSelectedJob(null); return }
    const job = jobsForCustomer.find(j => j.id === form.job_id)
    setSelectedJob(job || null)
    if (job) setForm(f => ({ ...f, amount: String(job.balance || job.total_price || '') }))
  }, [form.job_id, jobsForCustomer])

  useEffect(() => {
    // If a specific job is selected, its balance takes precedence
    if (form.job_id) return
    if (form.customer_id && customers.length > 0) {
      const customer = customers.find(c => c.id === form.customer_id)
      if (customer && customer.balance > 0) {
        setForm(f => ({ ...f, amount: String(customer.balance) }))
      }
    }
  }, [form.customer_id, form.job_id, customers])

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.customer_id) { setError("Please select a customer"); return }
    if (!form.amount) { setError("Please enter an amount"); return }
    setLoading(true)
    setError('')
    const amount = parseFloat(form.amount)

    const { error: err } = await supabase.from('payments').insert({
      ...form,
      company_id: company.id,
      amount,
      job_id: form.job_id || null,
      payment_account_id: form.payment_account_id || null
    })

    if (!err) {
      // Update job balance if a job was selected
      if (form.job_id && selectedJob) {
        const newBalance = Math.max(0, (selectedJob.balance || selectedJob.total_price || 0) - amount)
        const updateData = { balance: newBalance }
        
        // Auto-complete job if fully paid
        if (newBalance === 0) {
          updateData.status = 'Completed'
        }
        
        await supabase.from('print_jobs').update(updateData).eq('id', form.job_id)
      }
      // Update customer balance
      const customer = customers.find(c => c.id === form.customer_id)
      if (customer) {
        const newBalance = Math.max(0, (customer.balance || 0) - amount)
        await supabase.from('customers').update({ balance: newBalance }).eq('id', form.customer_id)
      }
    }

    setLoading(false)
    if (err) {
      setError(err.message)
      toast.error('Failed to record payment: ' + err.message)
    } else {
      // Send SMS Notification
      if (form.customer_id) {
        const customer = customers.find(c => c.id === form.customer_id)
        const currencyCode = (company?.currency || 'GHS').split(' ')[0]
        // Calculate the actual remaining balance after this payment
        let remainingBalance
        if (form.job_id && selectedJob) {
          // Job-specific payment: remaining = job balance - payment amount
          remainingBalance = Math.max(0, (selectedJob.balance || selectedJob.total_price || 0) - amount)
        } else {
          // General payment: remaining = customer overall balance - payment amount
          remainingBalance = Math.max(0, (customer?.balance || 0) - amount)
        }
        const msg = `your payment of: ${currencyCode} ${amount.toFixed(2)} via ${form.payment_method || 'Cash'} has been received. Your remaining balance is ${currencyCode} ${remainingBalance.toFixed(2)}.`
        import('../../lib/sms').then(({ notifyCustomer }) => {
          notifyCustomer(company.id, form.customer_id, 'payment_received', msg)
        })
      }

      toast.success('Payment recorded successfully')
      onSuccess?.(); onClose()
    }
  }

  const currency = company?.currency_symbol || '¢'
  const selectedCustomer = customers.find(c => c.id === form.customer_id)

  const selectStyles = {
    control: (base) => ({
      ...base,
      fontSize: '13px',
      minHeight: '38px',
      borderRadius: '8px',
      borderColor: 'var(--border)',
      boxShadow: 'none',
      cursor: 'text',
      '&:hover': { borderColor: 'var(--border-dark)' }
    }),
    option: (base) => ({
      ...base,
      fontSize: '13px',
      cursor: 'pointer'
    })
  }

  const customerOptions = customers.map(c => ({
    value: c.id, 
    label: `${c.name} ${(c.balance || 0) > 0 ? ` — Balance: ${currency}${c.balance.toFixed(2)}` : ''}`
  }))

  const jobOptions = jobsForCustomer.map(j => ({
    value: j.id,
    label: `${j.job_number} — ${j.status} — Balance: ${currency}${(j.balance||j.total_price||0).toFixed(2)}`
  }))

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">Record Payment</h2>
          <button className="modal-close" onClick={onClose}><X /></button>
        </div>
        <div className="modal-body">
          {error && <div className="error-alert">{error}</div>}
          <form onSubmit={handleSubmit} id="payment-form">
            <div className="form-group">
              <label className="form-label">Customer *</label>
              <Select 
                options={customerOptions}
                styles={selectStyles}
                placeholder="Select or search customer..."
                value={customerOptions.find(o => o.value === form.customer_id) || null}
                onChange={(option) => handleChange({ target: { name: 'customer_id', value: option?.value || '' } })}
                isClearable
              />
            </div>

            {form.customer_id && jobsForCustomer.length > 0 && (
              <div className="form-group">
                <label className="form-label">Apply to Job (optional)</label>
                <Select 
                  options={jobOptions}
                  styles={selectStyles}
                  placeholder="General payment (not linked to job)"
                  value={jobOptions.find(o => o.value === form.job_id) || null}
                  onChange={(option) => handleChange({ target: { name: 'job_id', value: option?.value || '' } })}
                  isClearable
                />
              </div>
            )}

            {selectedJob && (
              <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:'8px',padding:'10px 14px',marginBottom:'16px',fontSize:'13px'}}>
                <div style={{display:'flex',justifyContent:'space-between'}}>
                  <span style={{color:'#1e40af',fontWeight:600}}>Job {selectedJob.job_number}</span>
                  <span style={{color:'#dc2626',fontWeight:700}}>{currency}{(selectedJob.balance || selectedJob.total_price || 0).toFixed(2)} outstanding</span>
                </div>
              </div>
            )}
            
            {!selectedJob && selectedCustomer && selectedCustomer.balance > 0 && (
              <div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:'8px',padding:'10px 14px',marginBottom:'16px',fontSize:'13px'}}>
                <div style={{display:'flex',justifyContent:'space-between'}}>
                  <span style={{color:'#92400e',fontWeight:600}}>Total Customer Balance</span>
                  <span style={{color:'#dc2626',fontWeight:700}}>{currency}{(selectedCustomer.balance).toFixed(2)} outstanding</span>
                </div>
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Amount ({currency}) *</label>
                <input type="number" name="amount" className="form-control" placeholder="0.00" value={form.amount} onChange={handleChange} required step="0.01" min="0.01" />
              </div>
              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <select name="payment_method" className="form-control" value={form.payment_method} onChange={handleChange}>
                  {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Payment Account</label>
                <select name="payment_account_id" className="form-control" value={form.payment_account_id} onChange={handleChange}>
                  <option value="">Select account</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Payment Date</label>
                <input type="date" name="payment_date" className="form-control" value={form.payment_date} onChange={handleChange} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea name="notes" className="form-control" placeholder="Any notes about this payment..." value={form.notes} onChange={handleChange} rows={2} />
            </div>
          </form>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" form="payment-form" type="submit" disabled={loading}>
            {loading ? 'Recording...' : 'Record Payment'}
          </button>
        </div>
      </div>
    </div>
  )
}
