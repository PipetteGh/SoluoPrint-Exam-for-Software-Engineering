import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { supabase } from '../../lib/supabase'
import { Users, X, Edit, Info, Sparkles } from 'lucide-react'

function TypeModal({ type, company, onClose, onSuccess }) {
  const [form, setForm] = useState(type || { name: '', description: '', is_active: true })
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    let err
    if (type?.id) {
      ({ error: err } = await supabase.from('customer_types').update(form).eq('id', type.id))
    } else {
      ({ error: err } = await supabase.from('customer_types').insert({ ...form, company_id: company.id }))
    }
    setLoading(false)
    if (err) {
      toast.error('Failed to save customer type')
    } else {
      toast.success(type ? 'Customer type updated' : 'Customer type created')
      onSuccess?.(); onClose()
    }
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{type ? 'Edit' : 'New'} Customer Type</h2>
          <button className="modal-close" onClick={onClose}><X /></button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit} id="type-form">
            <div className="form-group">
              <label className="form-label">Type Name *</label>
              <input name="name" className="form-control" value={form.name} onChange={handleChange} required placeholder="e.g. Consumer, Business, Wholesale" />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea name="description" className="form-control" value={form.description || ''} onChange={handleChange} rows={2} />
            </div>
            <div className="toggle-wrap">
              <span style={{ fontWeight: 600 }}>Active</span>
              <label className="toggle-switch">
                <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </form>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" form="type-form" type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  )
}

export default function CustomerTypesPage() {
  const { company } = useAuth()
  const [types, setTypes] = useState([])
  const [customers, setCustomers] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editType, setEditType] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (company) load() }, [company])

  async function load() {
    setLoading(true)
    const [{ data: typeData }, { data: custData }] = await Promise.all([
      supabase.from('customer_types').select('*').eq('company_id', company.id).order('name'),
      supabase.from('customers').select('id,customer_type_id').eq('company_id', company.id)
    ])
    setTypes(typeData || [])
    setCustomers(custData || [])
    setLoading(false)
  }

  const activeTypes = types.filter(t => t.is_active !== false)

  return (
    <div>
      <div className="page-header" style={{ marginBottom: '32px', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
          <h1 className="page-title" style={{ fontSize: '24px', marginBottom: '8px' }}>Customer Types</h1>
          <p className="page-subtitle" style={{ fontSize: '14px', lineHeight: '1.5' }}>
            Customize your customer categories to match your business needs. These settings affect how customers are classified throughout your entire system.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Main Card */}
        <div className="card" style={{ padding: '0', borderRadius: '12px', overflow: 'hidden', marginBottom: '24px' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>Active Customer Types</h2>
          </div>
          
          <div className="table-container" style={{ margin: 0, borderRadius: 0, border: 'none' }}>
            <table style={{ margin: 0 }}>
              <thead>
                <tr style={{ background: '#fff' }}>
                  <th style={{ paddingLeft: '24px', width: '25%' }}>Type Name</th>
                  <th style={{ width: '45%' }}>Description</th>
                  <th style={{ width: '15%', textAlign: 'center' }}>Customers</th>
                  <th style={{ width: '15%', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: '40px' }}>Loading...</td></tr>
                ) : activeTypes.length === 0 ? (
                  <tr><td colSpan={4}><div className="empty-state" style={{ padding: '40px' }}><Users /><h3>No active customer types</h3></div></td></tr>
                ) : activeTypes.map(t => {
                  const custCount = customers.filter(c => c.customer_type_id === t.id).length
                  return (
                    <tr key={t.id}>
                      <td style={{ paddingLeft: '24px', fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>{t.name}</td>
                      <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{t.description || '-'}</td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', fontWeight: 600, fontSize: '13px' }}>
                          <Users size={14} /> {custCount}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div className="action-btns" style={{ justifyContent: 'center' }}>
                          <button className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => { setEditType(t); setShowModal(true) }}>
                            <Edit size={12} /> Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              How Customer Types Work
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <li style={{ display: 'flex', gap: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)', marginTop: '6px', flexShrink: 0 }}></div>
                <span>Standard customer categories used throughout the system</span>
              </li>
              <li style={{ display: 'flex', gap: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)', marginTop: '6px', flexShrink: 0 }}></div>
                <span>Customize display names to match your business terminology</span>
              </li>
              <li style={{ display: 'flex', gap: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)', marginTop: '6px', flexShrink: 0 }}></div>
                <span>Changes reflect in forms, reports, and customer management</span>
              </li>
              <li style={{ display: 'flex', gap: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)', marginTop: '6px', flexShrink: 0 }}></div>
                <span>Underlying data structure remains consistent for reliability</span>
              </li>
            </ul>
          </div>

          <div className="card" style={{ padding: '24px', background: '#f8fafc', border: '1px dashed #cbd5e1' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Coming Soon: Custom Types
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <li style={{ display: 'flex', gap: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#94a3b8', marginTop: '6px', flexShrink: 0 }}></div>
                <span>Create unlimited custom customer types</span>
              </li>
              <li style={{ display: 'flex', gap: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#94a3b8', marginTop: '6px', flexShrink: 0 }}></div>
                <span>Define custom fields and attributes for each type</span>
              </li>
              <li style={{ display: 'flex', gap: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#94a3b8', marginTop: '6px', flexShrink: 0 }}></div>
                <span>Set specific pricing rules and service offerings</span>
              </li>
              <li style={{ display: 'flex', gap: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#94a3b8', marginTop: '6px', flexShrink: 0 }}></div>
                <span>Generate type-specific reports and analytics</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {showModal && <TypeModal type={editType} company={company} onClose={() => setShowModal(false)} onSuccess={load} />}
    </div>
  )
}
