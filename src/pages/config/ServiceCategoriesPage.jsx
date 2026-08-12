import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { supabase } from '../../lib/supabase'
import { Plus, Trash2, X, Search, FileText, Settings, ShieldCheck, Box } from 'lucide-react'

function CategoryModal({ cat, company, onClose, onSuccess }) {
  const [form, setForm] = useState(cat || { 
    name: '', 
    description: '', 
    form_type: 'simple', 
    keeps_decimals: true,
    is_active: true
  })
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    if (cat?.id) {
      const { error } = await supabase.from('service_categories').update(form).eq('id', cat.id)
      if (error) toast.error('Failed to update category')
      else toast.success('Category updated successfully')
    } else {
      const { error } = await supabase.from('service_categories').insert({ ...form, company_id: company.id })
      if (error) toast.error('Failed to create category')
      else toast.success('Category created successfully')
    }
    setLoading(false)
    onSuccess?.(); onClose()
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{cat ? 'Edit' : 'New'} Service Category</h2>
          <button className="modal-close" onClick={onClose}><X /></button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit} id="cat-form">
            <div className="form-group">
              <label className="form-label">Category Name *</label>
              <input name="name" className="form-control" value={form.name} onChange={handleChange} required placeholder="e.g. Large Format, Branding" />
            </div>
            <div className="form-group">
              <label className="form-label">Form Type</label>
              <select name="form_type" className="form-control" value={form.form_type} onChange={handleChange}>
                <option value="simple">Simple (Standard qty & price)</option>
                <option value="large_format">Large Format (Dimensions based)</option>
                <option value="outsourced">Outsourced (Third-party routing)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea name="description" className="form-control" value={form.description || ''} onChange={handleChange} rows={2} />
            </div>
            
            <div className="form-row">
              <div className="toggle-wrap" style={{ flex: 1 }}>
                <span style={{ fontWeight: 600 }}>Keeps Decimals</span>
                <label className="toggle-switch">
                  <input type="checkbox" name="keeps_decimals" checked={form.keeps_decimals} onChange={handleChange} />
                  <span className="toggle-slider"></span>
                </label>
              </div>
              <div className="toggle-wrap" style={{ flex: 1 }}>
                <span style={{ fontWeight: 600 }}>Active</span>
                <label className="toggle-switch">
                  <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
          </form>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" form="cat-form" type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  )
}

function getFormTypePill(type) {
  switch (type) {
    case 'large_format':
      return <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '12px', fontWeight: 600, background: '#dcfce7', color: '#166534', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Maximize2Icon size={12} /> Large Format</span>
    case 'simple':
      return <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '12px', fontWeight: 600, background: '#dbeafe', color: '#1e40af', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><FileText size={12} /> Simple</span>
    case 'outsourced':
    default:
      return <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '12px', fontWeight: 600, background: '#f1f5f9', color: '#475569', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><UsersIcon size={12} /> Outsourced</span>
  }
}

// Minimal icons so we don't overcrowd imports
const Maximize2Icon = ({size}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></svg>
const UsersIcon = ({size}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>

export default function ServiceCategoriesPage() {
  const { company } = useAuth()
  const [categories, setCategories] = useState([])
  const [services, setServices] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editCat, setEditCat] = useState(null)
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('active')
  const [search, setSearch] = useState('')

  useEffect(() => { if (company) load() }, [company])

  async function load() {
    setLoading(true)
    const [{ data: catData }, { data: svcData }] = await Promise.all([
      supabase.from('service_categories').select('*').eq('company_id', company.id).order('name'),
      supabase.from('services').select('id,service_category_id').eq('company_id', company.id)
    ])
    setCategories(catData || [])
    setServices(svcData || [])
    setLoading(false)
  }

  async function deleteCategory(cat) {
    const svcsCount = services.filter(s => s.service_category_id === cat.id).length
    const msg = svcsCount > 0
      ? `This category has ${svcsCount} service(s) linked to it. Deleting it will unlink those services. Are you sure?`
      : `Delete category "${cat.name}"? This cannot be undone.`
    if (!confirm(msg)) return
    const { error } = await supabase.from('service_categories').delete().eq('id', cat.id)
    if (error) toast.error('Failed to delete category')
    else {
      toast.success('Category deleted')
      load()
    }
  }

  const actCount = categories.filter(c => c.is_active !== false).length
  const inCt = categories.length - actCount
  
  const displayedCategories = categories.filter(c => {
    const matchesTab = activeTab === 'active' ? c.is_active !== false : c.is_active === false
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || (c.description || '').toLowerCase().includes(search.toLowerCase())
    return matchesTab && matchesSearch
  })

  return (
    <div>
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="page-title">Service Categories</h1>
          <p className="page-subtitle">Manage your service categories and form types</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-primary" onClick={() => { setEditCat(null); setShowModal(true) }}>
            <Plus size={16} /> Add Custom Category
          </button>
          <button className="btn btn-secondary" style={{ background: 'white' }}>
            <FileText size={16} /> Request Custom Form
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, borderRadius: '12px', overflow: 'hidden' }}>
        
        {/* Search Bar Row */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="form-control" style={{ paddingLeft: '36px', background: '#f8fafc', padding: '10px 10px 10px 36px', fontSize: '13px' }} 
              placeholder={`Search categories...`} 
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', padding: '10px 24px 0', borderBottom: '1px solid var(--border)', background: '#fff' }}>
          <button 
            style={{ padding: '8px 16px', background: 'transparent', border: 'none', borderBottom: activeTab === 'active' ? '2px solid var(--error)' : '2px solid transparent', cursor: 'pointer', fontWeight: 600, color: activeTab === 'active' ? 'var(--text-primary)' : 'var(--text-secondary)', fontSize: '13px' }}
            onClick={() => setActiveTab('active')}
          >
            Active ({actCount})
          </button>
          <button 
            style={{ padding: '8px 16px', background: 'transparent', border: 'none', borderBottom: activeTab === 'inactive' ? '2px solid var(--error)' : '2px solid transparent', cursor: 'pointer', fontWeight: 600, color: activeTab === 'inactive' ? 'var(--text-primary)' : 'var(--text-secondary)', fontSize: '13px' }}
            onClick={() => setActiveTab('inactive')}
          >
            Inactive ({inCt})
          </button>
        </div>

        {/* Table Content */}
        <div className="table-container" style={{ margin: 0, borderRadius: 0, border: 'none' }}>
          <table style={{ margin: 0 }}>
            <thead>
              <tr style={{ background: '#fff' }}>
                <th style={{ paddingLeft: '24px', width: '40px' }}>#</th>
                <th style={{ width: '25%' }}>Category Name</th>
                <th style={{ width: '35%' }}>Description</th>
                <th style={{ width: '15%' }}>Form Type</th>
                <th style={{ width: '10%', textAlign: 'center' }}>Services</th>
                <th style={{ width: '10%', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}>Loading...</td></tr>
              ) : displayedCategories.length === 0 ? (
                <tr><td colSpan={6}><div className="empty-state" style={{ padding: '40px' }}><Box /><h3>No categories found</h3></div></td></tr>
              ) : displayedCategories.map((c, index) => {
                const svcsCount = services.filter(s => s.service_category_id === c.id).length
                return (
                  <tr key={c.id}>
                    <td style={{ paddingLeft: '24px', color: 'var(--text-muted)' }}>{index + 1}</td>
                    <td style={{ fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Box size={14} color="var(--primary)" /> {c.name}
                    </td>
                    <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{c.description || '-'}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                        {getFormTypePill(c.form_type || 'simple')}
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500, paddingLeft: '2px' }}>
                          {c.keeps_decimals !== false ? 'Keeps decimals' : 'No decimals'}
                        </span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', background: '#f1f5f9', color: '#64748b', fontWeight: 600 }}>{svcsCount}</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div className="action-btns" style={{ justifyContent: 'center' }}>
                        <button className="action-btn" onClick={() => { setEditCat(c); setShowModal(true) }} title="Edit">•••</button>
                        <button className="action-btn" onClick={() => deleteCategory(c)} title="Delete" style={{ color: '#ef4444' }}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && <CategoryModal cat={editCat} company={company} onClose={() => setShowModal(false)} onSuccess={load} />}
    </div>
  )
}
