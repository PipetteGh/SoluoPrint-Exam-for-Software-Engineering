import { useState, useEffect } from 'react'
import { X, ArrowLeft } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { supabase } from '../../lib/supabase'

export default function NewServiceModal({ onClose, onSuccess }) {
  const { company } = useAuth()
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState({
    name: '',
    description: '',
    service_category_id: '',
    unit_price: 0,
    agency_price: 0,
    corporate_price: 0,
    unit: 'sqft',
    is_active: true,
  })
  const [useHelper, setUseHelper] = useState(true)
  const [baseRate, setBaseRate] = useState(0)
  const [resellerDiscount, setResellerDiscount] = useState(20)
  const [corporateMarkup, setCorporateMarkup] = useState(20)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const toast = useToast()

  const currency = company?.currency_symbol || '¢'

  useEffect(() => {
    if (!company) return
    supabase.from('service_categories')
      .select('*')
      .eq('company_id', company.id)
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => setCategories(data || []))
  }, [company])

  // Calculate tiered prices from helper
  const consumerRate = parseFloat(baseRate) || 0
  const resellerRate = consumerRate * (1 - resellerDiscount / 100)
  const corporateRate = consumerRate * (1 + corporateMarkup / 100)

  useEffect(() => {
    if (useHelper) {
      setForm(f => ({
        ...f,
        unit_price: consumerRate,
        agency_price: parseFloat(resellerRate.toFixed(2)),
        corporate_price: parseFloat(corporateRate.toFixed(2)),
      }))
    }
  }, [baseRate, resellerDiscount, corporateMarkup, useHelper])

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Service name is required'); return }
    if (!form.service_category_id) { setError('Please select a category'); return }
    
    setLoading(true)
    setError('')

    const payload = {
      ...form,
      company_id: company.id,
      unit_price: parseFloat(form.unit_price) || 0,
      agency_price: parseFloat(form.agency_price) || 0,
      corporate_price: parseFloat(form.corporate_price) || 0,
    }

    const { data, error: err } = await supabase.from('services').insert(payload).select().single()

    setLoading(false)
    if (err) {
      setError(err.message)
      toast.error('Failed to create service: ' + err.message)
    } else {
      toast.success('Service created successfully')
      onSuccess?.(data)
      onClose()
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal modal-lg">
        <div className="modal-header">
          <h2 className="modal-title">Add New Service</h2>
          <button className="modal-close" onClick={onClose}><X /></button>
        </div>
        <div className="modal-body">
          {error && <div className="error-alert" style={{ marginBottom: '16px' }}>{error}</div>}
          
          <div className="form-row" style={{ marginBottom: '16px' }}>
            <div className="form-group" style={{ flex: 2 }}>
              <label className="form-label">Service Name *</label>
              <input name="name" className="form-control" placeholder="e.g., Banner Printing" value={form.name} onChange={handleChange} required />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Category *</label>
              <select name="service_category_id" className="form-control" value={form.service_category_id} onChange={handleChange} required>
                <option value="">Select category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>Pricing Configuration</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Use Helper</span>
                <label className="toggle-switch">
                  <input type="checkbox" checked={useHelper} onChange={e => setUseHelper(e.target.checked)} />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>

            {useHelper ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Base Rate ({currency})</label>
                  <input type="number" className="form-control" value={baseRate} onChange={e => setBaseRate(e.target.value)} step="0.01" min="0" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                   <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ fontSize: '11px', color: '#1e40af' }}>Reseller Price:</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#1e40af' }}>{currency} {resellerRate.toFixed(2)}</div>
                  </div>
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ fontSize: '11px', color: '#059669' }}>Corporate Rate:</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#059669' }}>{currency} {corporateRate.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Consumer Rate</label>
                  <input type="number" name="unit_price" className="form-control" value={form.unit_price} onChange={handleChange} step="0.01" />
                </div>
                <div className="form-group">
                  <label className="form-label">Reseller Rate</label>
                  <input type="number" name="agency_price" className="form-control" value={form.agency_price} onChange={handleChange} step="0.01" />
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Creating...' : 'Create Service'}
          </button>
        </div>
      </div>
    </div>
  )
}
