import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { supabase } from '../../lib/supabase'

export default function NewCustomerModal({ onClose, onSuccess }) {
  const { company } = useAuth()
  const [customerTypes, setCustomerTypes] = useState([])
  const [form, setForm] = useState({ name: '', customer_type_id: '', phone: '', email: '', address: '', sms_notifications: false })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successData, setSuccessData] = useState(null)
  const toast = useToast()

  useEffect(() => {
    if (!company) return
    supabase.from('customer_types').select('*').eq('company_id', company.id).then(({ data }) => setCustomerTypes(data || []))
  }, [company])

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  const generateUniqueUsername = async (name) => {
    const cleanName = name.replace(/[^a-zA-Z]/g, '').substring(0, 4).toUpperCase();
    let isUnique = false;
    let username = '';
    
    while (!isUnique) {
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      username = `CUST-${cleanName || 'USER'}-${randomNum}`;
      
      const { data } = await supabase
        .from('customers')
        .select('id')
        .eq('username', username)
        .maybeSingle();
        
      if (!data) {
        isUnique = true;
      }
    }
    return username;
  }

  const generatePassword = () => {
    return Math.random().toString(36).slice(-8);
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const payload = { ...form, company_id: company.id }
    if (!payload.customer_type_id) payload.customer_type_id = null
    
    // Auto-generate portal credentials and ensure it is unique globally
    const username = await generateUniqueUsername(form.name)
    const password = generatePassword()
    payload.username = username
    payload.password = password
    
    const { data: newCust, error: err } = await supabase.from('customers').insert(payload).select().single()
    
    if (!err && newCust) {
      const loginUrl = window.location.origin + '/login'
      
      // If phone is provided, send SMS with credentials
      if (form.phone) {
          const { data: smsSettings } = await supabase.from('sms_settings').select('*').eq('company_id', company.id).single()
          if (smsSettings && smsSettings.customer_welcome !== false) {
            const { sendSms } = await import('../../lib/sms')
            await sendSms(form.phone, `Welcome! Login to your portal at ${loginUrl} | User: ${username} | Pass: ${password}`, smsSettings)
          }
      }
      
      // If email is provided, send Email with credentials
      if (form.email) {
          const { sendEmail } = await import('../../lib/email')
          await sendEmail(
             form.email, 
             'Your Customer Portal Credentials', 
             `<p>Welcome to ${company?.name || 'SoluoPrint'}!</p><p>You can track your print jobs and bills in our customer portal.</p><p>Login at: <a href="${loginUrl}">${loginUrl}</a></p><p>Username: <b>${username}</b></p><p>Password: <b>${password}</b></p>`,
             company?.name || 'SoluoPrint'
          )
      }
    }
    
    setLoading(false)
    if (err) {
      setError(err.message)
      toast.error('Failed to add customer: ' + err.message)
    } else {
      toast.success('Customer added successfully')
      onSuccess?.(newCust)
      setSuccessData({ username, password })
    }
  }

  if (successData) {
    return (
      <div className="modal-overlay">
        <div className="modal" style={{ maxWidth: '400px', textAlign: 'center' }}>
          <div className="modal-body" style={{ padding: '32px 24px' }}>
            <div style={{ color: '#16a34a', fontSize: '48px', marginBottom: '16px' }}>✓</div>
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>Customer Created!</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '14px' }}>
              The customer can log in to their portal using these credentials. Please share them securely if no email or phone was provided.
            </p>
            
            <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', textAlign: 'left', marginBottom: '24px' }}>
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Username</div>
                <div style={{ fontSize: '16px', fontWeight: '600', letterSpacing: '1px' }}>{successData.username}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Password</div>
                <div style={{ fontSize: '16px', fontWeight: '600', letterSpacing: '1px' }}>{successData.password}</div>
              </div>
            </div>

            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">Add Customer</h2>
          <button className="modal-close" onClick={onClose}><X /></button>
        </div>
        <div className="modal-body">
          {error && <div className="error-alert">{error}</div>}
          <form onSubmit={handleSubmit} id="customer-form">
            <div className="form-group">
              <label className="form-label">Customer Name *</label>
              <input name="name" className="form-control" placeholder="Full name or business name" value={form.name} onChange={handleChange} required />
            </div>
            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Customer Type</label>
                <select name="customer_type_id" className="form-control" value={form.customer_type_id} onChange={handleChange}>
                  <option value="">Select type</option>
                  {customerTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input name="phone" className="form-control" placeholder="+1 234 567 890" value={form.phone} onChange={handleChange} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input name="email" type="email" className="form-control" placeholder="customer@email.com" value={form.email} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Address</label>
              <textarea name="address" className="form-control" placeholder="Street address" value={form.address} onChange={handleChange} rows={2} />
            </div>
            <div className="toggle-wrap">
              <div>
                <div className="toggle-label">SMS Notifications</div>
                <div className="toggle-desc">Send SMS updates to this customer</div>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" name="sms_notifications" checked={form.sms_notifications} onChange={handleChange} />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </form>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" form="customer-form" type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Add Customer'}
          </button>
        </div>
      </div>
    </div>
  )
}
