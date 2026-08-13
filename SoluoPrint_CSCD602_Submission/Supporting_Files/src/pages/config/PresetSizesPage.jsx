import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { useConfirm } from '../../contexts/ConfirmContext'
import { supabase } from '../../lib/supabase'
import { Maximize2, Plus, Edit, Trash2, X } from 'lucide-react'

function SizeModal({ size, company, onClose, onSuccess }) {
  const [form, setForm] = useState(size || { name: '', width: '', height: '', unit: 'Inches', size_type: 'Custom', sort_order: 10 })
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    const payload = { 
      ...form, 
      width: parseFloat(form.width), 
      height: parseFloat(form.height),
      sort_order: parseInt(form.sort_order) || 10
    }
    
    
    let err
    if (size?.id) {
      ({ error: err } = await supabase.from('preset_sizes').update(payload).eq('id', size.id))
    } else {
      ({ error: err } = await supabase.from('preset_sizes').insert({ ...payload, company_id: company.id }))
    }
    setLoading(false)
    if (err) {
      toast.error('Failed to save preset size')
    } else {
      toast.success(size ? 'Size updated' : 'Size created')
      onSuccess?.(); onClose()
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{size ? 'Edit' : 'New'} Preset Size</h2>
          <button className="modal-close" onClick={onClose}><X /></button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit} id="size-form">
            <div className="form-group">
              <label className="form-label">Size Name *</label>
              <input className="form-control" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required placeholder="e.g. A4, 3x4 feet" />
            </div>
            <div className="form-row-3">
              <div className="form-group">
                <label className="form-label">Width</label>
                <input type="number" className="form-control" value={form.width} onChange={e => setForm(f => ({...f, width: e.target.value}))} required step="0.01" />
              </div>
              <div className="form-group">
                <label className="form-label">Height</label>
                <input type="number" className="form-control" value={form.height} onChange={e => setForm(f => ({...f, height: e.target.value}))} required step="0.01" />
              </div>
              <div className="form-group">
                <label className="form-label">Unit</label>
                <select className="form-control" value={form.unit} onChange={e => setForm(f => ({...f, unit: e.target.value}))}>
                  {['Inches','Feet','Centimeters','Meters'].map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row" style={{ marginTop: '16px' }}>
              <div className="form-group">
                <label className="form-label">Type</label>
                <select className="form-control" value={form.size_type} onChange={e => setForm(f => ({...f, size_type: e.target.value}))}>
                  <option value="Default">Default</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Display Order</label>
                <input type="number" className="form-control" value={form.sort_order} onChange={e => setForm(f => ({...f, sort_order: e.target.value}))} required />
              </div>
            </div>
          </form>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" form="size-form" type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  )
}

export default function PresetSizesPage() {
  const { company } = useAuth()
  const [sizes, setSizes] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editSize, setEditSize] = useState(null)
  const [loading, setLoading] = useState(true)
  const toast = useToast()
  const { confirm } = useConfirm()

  useEffect(() => { if (company) load() }, [company])

  async function load() {
    // Order by sort_order
    const { data } = await supabase.from('preset_sizes').select('*').eq('company_id', company.id).order('sort_order', { ascending: true })
    setSizes(data || [])
    setLoading(false)
  }

  async function deleteSize(id) {
    const isConfirmed = await confirm({
      title: 'Delete Preset Size',
      message: 'Are you sure you want to delete this preset size?',
      confirmText: 'Yes, Delete Preset',
      cancelText: 'Cancel',
      type: 'danger'
    })
    if (!isConfirmed) return
    const { error } = await supabase.from('preset_sizes').delete().eq('id', id)
    if (error) toast.error('Failed to delete size')
    else { toast.success('Size deleted'); load() }
  }

  return (
    <div>
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Maximize2 size={24} /> Preset Sizes
          </h1>
          <p className="page-subtitle">Manage preset sizes for large format jobs and calculators</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditSize(null); setShowModal(true) }}>
          <Plus size={16} /> Add Preset Size
        </button>
      </div>

      <div className="card" style={{ padding: 0, borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Preset Sizes</h2>
        </div>
        <div className="table-container" style={{ margin: 0, borderRadius: 0, border: 'none' }}>
          <table style={{ margin: 0 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ paddingLeft: '24px', width: '20%' }}>Name</th>
                <th style={{ width: '25%' }}>Dimensions</th>
                <th style={{ width: '15%' }}>Unit</th>
                <th style={{ width: '15%' }}>Type</th>
                <th style={{ width: '15%', textAlign: 'center' }}>Order</th>
                <th style={{ width: '10%', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{textAlign:'center',padding:'40px'}}>Loading...</td></tr>
              ) : sizes.length === 0 ? (
                <tr><td colSpan={6}><div className="empty-state"><Maximize2/><h3>No preset sizes</h3></div></td></tr>
              ) : sizes.map(s => (
                <tr key={s.id}>
                  <td style={{ paddingLeft: '24px', fontWeight: 600, fontSize: '13px' }}>{s.name}</td>
                  <td style={{ fontSize: '13px' }}>{s.width.toFixed(2)} × {s.height.toFixed(2)}</td>
                  <td style={{ fontSize: '13px' }}>{s.unit}</td>
                  <td>
                    <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '12px', fontWeight: 600, background: s.size_type === 'Default' ? '#e0e7ff' : '#f1f5f9', color: s.size_type === 'Default' ? '#4f46e5' : '#475569' }}>
                      {s.size_type || 'Custom'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 500, color: 'var(--primary)' }}>{s.sort_order || '-'}</td>
                  <td style={{ textAlign: 'center' }}>
                    <div className="action-btns" style={{ justifyContent: 'center' }}>
                      <button className="action-btn" onClick={() => { setEditSize(s); setShowModal(true) }}><Edit size={16} /></button>
                      <button className="action-btn danger" onClick={() => deleteSize(s.id)}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && <SizeModal size={editSize} company={company} onClose={() => setShowModal(false)} onSuccess={load} />}
    </div>
  )
}
