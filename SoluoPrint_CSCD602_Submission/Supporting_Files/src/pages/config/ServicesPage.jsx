import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { useConfirm } from '../../contexts/ConfirmContext'
import { supabase } from '../../lib/supabase'
import { Wrench, Plus, Edit, Trash2, Search, ArrowLeft, FolderOpen, Download, Upload, MoreVertical, Calculator, CheckCircle, XCircle } from 'lucide-react'
import PriceCalculatorModal from '../../components/modals/PriceCalculatorModal'

const DEFAULT_CATEGORIES = ['Large Format', 'Press/Secretarial', 'Design', 'Embroidery', 'Photography', 'Outsourced Services']

// ─── NEW/EDIT SERVICE FORM (full-page) ─────────────────────────
function ServiceForm({ service, company, categories, onBack, onSuccess }) {
  const [form, setForm] = useState({
    name: service?.name || '',
    description: service?.description || '',
    service_category_id: service?.service_category_id || '',
    unit_price: service?.unit_price || 0,
    agency_price: service?.agency_price || 0,
    corporate_price: service?.corporate_price || 0,
    unit: service?.unit || 'sqft',
    is_active: service?.is_active !== false,
  })
  const [useHelper, setUseHelper] = useState(true)
  const [baseRate, setBaseRate] = useState(service?.unit_price || 0)
  const [resellerDiscount, setResellerDiscount] = useState(20)
  const [corporateMarkup, setCorporateMarkup] = useState(20)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const toast = useToast()

  const currency = company?.currency_symbol || '¢'

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
    setLoading(true)
    setError('')

    const payload = {
      name: form.name,
      description: form.description,
      service_category_id: form.service_category_id || null,
      unit_price: parseFloat(form.unit_price) || 0,
      agency_price: parseFloat(form.agency_price) || 0,
      corporate_price: parseFloat(form.corporate_price) || 0,
      unit: form.unit,
      is_active: form.is_active,
    }

    let err
    if (service?.id) {
      ({ error: err } = await supabase.from('services').update(payload).eq('id', service.id))
    } else {
      ({ error: err } = await supabase.from('services').insert({ ...payload, company_id: company.id }))
    }

    setLoading(false)
    if (err) {
      setError(err.message)
      toast.error('Failed to save service: ' + err.message)
    } else {
      toast.success(service ? 'Service updated' : 'Service created')
      onSuccess?.(); onBack()
    }
  }

  return (
    <div>
      <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: '16px', gap: '6px' }}>
        <ArrowLeft size={16} /> Back to Services
      </button>

      <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>{service ? 'Edit' : 'New'} Service</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '24px' }}>
        Create a new service with different pricing tiers for each customer type
      </p>

      {error && <div className="error-alert" style={{ marginBottom: '16px' }}>{error}</div>}

      <div className="card" style={{ maxWidth: '700px' }}>
        <div className="card-body">
          {/* Service Information */}
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Service Information</h3>

          <div className="form-row" style={{ marginBottom: '16px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Service Name *</label>
              <input name="name" className="form-control" placeholder="e.g., Banner Printing, Logo Design, etc." value={form.name} onChange={handleChange} required />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Category *</label>
              <select name="service_category_id" className="form-control" value={form.service_category_id} onChange={handleChange}>
                <option value="">Select category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {/* Pricing Tiers */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', marginTop: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Pricing Tiers</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Use Pricing Helper</span>
                <label className="toggle-switch">
                  <input type="checkbox" checked={useHelper} onChange={e => setUseHelper(e.target.checked)} />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>

            {useHelper ? (
              <>
                {/* Base Rate */}
                <div className="form-group">
                  <label className="form-label">Base Rate (Individual/Consumer Rate) *</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input type="number" className="form-control" placeholder="0.00" value={baseRate} onChange={e => setBaseRate(e.target.value)} step="0.01" min="0" style={{ flex: 1 }} />
                    <span style={{ color: 'var(--text-muted)', fontSize: '13px', whiteSpace: 'nowrap' }}>{currency} 0</span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    This is the standard price for individual/consumer customers.
                  </p>
                </div>

                {/* Sliders */}
                <div className="form-row" style={{ marginBottom: '16px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <label className="form-label" style={{ marginBottom: 0 }}>Artist/Reseller Discount</label>
                      <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{resellerDiscount}%</span>
                    </div>
                    <input type="range" min="0" max="50" value={resellerDiscount} onChange={e => setResellerDiscount(parseInt(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--primary)' }} />
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Discount applied for resellers and strategic partners
                    </p>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <label className="form-label" style={{ marginBottom: 0 }}>Institution/Corporate Markup</label>
                      <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{corporateMarkup}%</span>
                    </div>
                    <input type="range" min="0" max="50" value={corporateMarkup} onChange={e => setCorporateMarkup(parseInt(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--primary)' }} />
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Markup applied for corporate clients and institutions
                    </p>
                  </div>
                </div>

                {/* Calculated prices */}
                <div className="form-row" style={{ marginBottom: '16px' }}>
                  <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ fontSize: '11px', color: '#1e40af', marginBottom: '4px' }}>Artist/Reseller Price:</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#1e40af' }}>{currency} {resellerRate.toFixed(2)}</div>
                  </div>
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ fontSize: '11px', color: '#059669', marginBottom: '4px' }}>Institution/Corporate Rate:</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#059669' }}>{currency} {corporateRate.toFixed(2)}</div>
                  </div>
                </div>

                {/* Summary row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', padding: '12px 0', borderTop: '1px solid var(--border)' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Consumer/Individual Rate</div>
                    <div style={{ fontWeight: 700, marginTop: '2px' }}>{currency} {consumerRate.toFixed(2)}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Reseller/Artist Rate</div>
                    <div style={{ fontWeight: 700, marginTop: '2px' }}>{currency} {resellerRate.toFixed(2)}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Corporate/Institution Rate</div>
                    <div style={{ fontWeight: 700, marginTop: '2px' }}>{currency} {corporateRate.toFixed(2)}</div>
                  </div>
                </div>
              </>
            ) : (
              /* Manual pricing */
              <div className="form-row" style={{ marginBottom: '16px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Consumer/Individual Rate *</label>
                  <input type="number" name="unit_price" className="form-control" value={form.unit_price} onChange={handleChange} step="0.01" min="0" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Reseller/Artist Rate</label>
                  <input type="number" name="agency_price" className="form-control" value={form.agency_price} onChange={handleChange} step="0.01" min="0" />
                </div>
              </div>
            )}
          </div>

          {/* Service Status */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', marginTop: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>Service Status</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Control whether this service is active and available
            </p>
            <div className="toggle-wrap">
              <span style={{ fontWeight: 600 }}>Active</span>
              <label className="toggle-switch">
                <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>

          {/* Footer buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--border)', paddingTop: '20px', marginTop: '20px' }}>
            <button className="btn btn-secondary" onClick={onBack}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Saving...' : (service ? 'Save Changes' : 'Create Service')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── MAIN SERVICES PAGE (two-panel layout) ─────────────────────────
export default function ServicesPage() {
  const { company } = useAuth()
  const toast = useToast()
  const { confirm } = useConfirm()
  const [categories, setCategories] = useState([])
  const [services, setServices] = useState([])
  const [selectedCat, setSelectedCat] = useState('all')
  const [activeFilter, setActiveFilter] = useState('active')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editService, setEditService] = useState(null)
  const [loading, setLoading] = useState(true)
  const [newCatName, setNewCatName] = useState('')
  const [showAddCat, setShowAddCat] = useState(false)
  const [activeMenuId, setActiveMenuId] = useState(null)
  const [showCalculator, setShowCalculator] = useState(false)
  const [calculatorService, setCalculatorService] = useState(null)
  const [stats, setStats] = useState({ total: 0, active: 0, categories: 0, inactive: 0 })
  const currency = company?.currency_symbol || '¢'

  useEffect(() => {
    if (company?.id) {
      loadAll()
    }
  }, [company?.id])

  async function loadAll() {
    if (!company?.id) return
    setLoading(true)
    try {
      const { data: catData } = await supabase.from('service_categories').select('*').eq('company_id', company.id).neq('is_active', false).order('name')
      setCategories(catData || [])
        
      const { data: svcData } = await supabase
        .from('services')
        .select(`
          *,
          service_categories!service_category_id (name)
        `)
        .eq('company_id', company.id)
      
      const allSvcs = svcData || []
      setServices(allSvcs)
      
      // Calculate stats
      setStats({
        total: allSvcs.length,
        active: allSvcs.filter(s => s.is_active !== false).length,
        inactive: allSvcs.filter(s => s.is_active === false).length,
        categories: catData?.length || 0
      })
    } catch (err) {
      console.error('loadAll error:', err)
      toast.error('Failed to load services')
    } finally {
      setLoading(false)
    }
  }

  async function addCategory() {
    if (!newCatName.trim()) return
    const { error } = await supabase.from('service_categories').insert({ name: newCatName.trim(), company_id: company.id })
    if (error) {
      toast.error('Failed to add category')
    } else {
      toast.success('Category added')
      setNewCatName('')
      setShowAddCat(false)
      loadAll()
    }
  }

  // Filter services
  const filtered = services.filter(s => {
    if (selectedCat !== 'all') {
      const cat = categories.find(c => c.id === selectedCat)
      if (cat && s.service_categories?.name !== cat.name) return false
    }
    if (activeFilter === 'active' && !s.is_active) return false
    if (activeFilter === 'inactive' && s.is_active) return false
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  // Count per category
  function catCount(catId) {
    if (catId === 'all') return services.length
    const cat = categories.find(c => c.id === catId)
    return services.filter(s => s.service_categories?.name === cat?.name).length
  }

  if (showForm) {
    return (
      <ServiceForm
        service={editService}
        company={company}
        categories={categories}
        onBack={() => { setShowForm(false); setEditService(null) }}
        onSuccess={loadAll}
      />
    )
  }

  return (
    <div style={{ padding: '0px' }}>
      {/* Stat Cards */}
      <div className="stat-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
            <Wrench size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-label">Total Services</div>
            <div className="stat-value">{stats.total}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>
            <CheckCircle size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-label">Active Services</div>
            <div className="stat-value">{stats.active}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--info-bg)', color: 'var(--info)' }}>
            <FolderOpen size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-label">Categories</div>
            <div className="stat-value">{stats.categories}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--error-bg)', color: 'var(--error)' }}>
            <XCircle size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-label">Inactive</div>
            <div className="stat-value">{stats.inactive}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '20px' }}>
      {/* Left sidebar - Service Categories */}
      <div className="card" style={{ padding: '0', background: 'white', alignSelf: 'start' }}>
        <div style={{ padding: '20px 16px 12px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Categories</h3>
        </div>
        <div style={{ padding: '8px' }}>
          {/* All Services */}
          <button
            onClick={() => setSelectedCat('all')}
            style={{
              width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              background: selectedCat === 'all' ? '#eff6ff' : 'transparent',
              color: selectedCat === 'all' ? 'var(--primary)' : 'var(--text-primary)',
              fontWeight: selectedCat === 'all' ? 600 : 400, fontSize: '13px', textAlign: 'left',
              transition: 'all 0.15s'
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FolderOpen size={14} /> All Services
            </span>
            <span style={{ background: selectedCat === 'all' ? '#dbeafe' : '#f1f5f9', borderRadius: '10px', padding: '2px 8px', fontSize: '11px', fontWeight: 600 }}>
              {catCount('all')}
            </span>
          </button>

          {/* Category list */}
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCat(cat.id)}
              style={{
                width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                background: selectedCat === cat.id ? '#eff6ff' : 'transparent',
                color: selectedCat === cat.id ? 'var(--primary)' : 'var(--text-primary)',
                fontWeight: selectedCat === cat.id ? 600 : 400, fontSize: '13px', textAlign: 'left',
                transition: 'all 0.15s'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FolderOpen size={14} /> {cat.name}
              </span>
              <span style={{ background: selectedCat === cat.id ? '#dbeafe' : '#f1f5f9', borderRadius: '10px', padding: '2px 8px', fontSize: '11px', fontWeight: 600 }}>
                {catCount(cat.id)}
              </span>
            </button>
          ))}
        </div>

        {/* Add Category */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', marginTop: 'auto' }}>
          {showAddCat ? (
            <div style={{ display: 'flex', gap: '6px' }}>
              <input className="form-control" style={{ fontSize: '12px', padding: '6px 8px' }} placeholder="Category name" value={newCatName} onChange={e => setNewCatName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCategory()} autoFocus />
              <button className="btn btn-primary" style={{ padding: '6px 10px', fontSize: '11px' }} onClick={addCategory}>Add</button>
            </div>
          ) : (
            <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', fontSize: '13px' }} onClick={() => setShowAddCat(true)}>
              <Plus size={14} /> Add Category
            </button>
          )}
        </div>
      </div>

      {/* Right panel - Services list */}
      <div className="card" style={{ flex: 1, padding: '0', background: 'white', borderRadius: '12px' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>
                {selectedCat === 'all' ? 'All Services' : categories.find(c => c.id === selectedCat)?.name || 'Services'}
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '4px 0 0' }}>
                Manage your printing services and pricing
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-secondary" style={{ fontSize: '12px' }}><Upload size={14} /> Import</button>
              <button className="btn btn-secondary" style={{ fontSize: '12px' }}><Download size={14} /> Export CSV</button>
              <button className="btn btn-primary" style={{ fontSize: '12px' }} onClick={() => { setEditService(null); setShowForm(true) }}>
                <Plus size={14} /> New Service
              </button>
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <div style={{ padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontWeight: 600, fontSize: '14px' }}>Services ({filtered.length})</span>
            <div style={{ marginLeft: '12px', display: 'flex', gap: '0' }}>
              <button onClick={() => setActiveFilter('active')} style={{
                padding: '5px 14px', fontSize: '12px', fontWeight: 500, border: '1px solid var(--border)', cursor: 'pointer',
                borderRadius: '6px 0 0 6px',
                background: activeFilter === 'active' ? 'var(--primary)' : 'white',
                color: activeFilter === 'active' ? 'white' : 'var(--text-secondary)',
              }}>Active</button>
              <button onClick={() => setActiveFilter('inactive')} style={{
                padding: '5px 14px', fontSize: '12px', fontWeight: 500, border: '1px solid var(--border)', borderLeft: 0, cursor: 'pointer',
                borderRadius: '0 6px 6px 0',
                background: activeFilter === 'inactive' ? 'var(--primary)' : 'white',
                color: activeFilter === 'inactive' ? 'white' : 'var(--text-secondary)',
              }}>Inactive</button>
            </div>
          </div>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="form-control" style={{ paddingLeft: '32px', width: '200px', fontSize: '12px' }} placeholder="Search services..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {/* Services list */}
        <div style={{ padding: '16px 24px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <Wrench />
              <h3>No services found.</h3>
              <p>Add your first service to get started</p>
              <button className="btn btn-primary" style={{ marginTop: '12px' }} onClick={() => { setEditService(null); setShowForm(true) }}>
                <Plus size={14} /> Add First Service
              </button>
            </div>
          ) : (
            <div className="table-container" style={{ borderRadius: '8px' }}>
              <table>
                <thead>
                  <tr>
                    <th>Service Name</th><th>Category</th><th>Consumer Rate</th><th>Reseller Rate</th><th>Corporate Rate</th><th>Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(s => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 600 }}>{s.name}</td>
                      <td><span className="pill pill-blue">{s.service_categories?.name || '-'}</span></td>
                      <td style={{ fontWeight: 600 }}>{currency}{(s.unit_price || 0).toFixed(2)}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{currency}{(s.agency_price || 0).toFixed(2)}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{currency}{(s.corporate_price || 0).toFixed(2)}</td>
                      <td><span className={`status-badge ${s.is_active ? 'completed' : 'cancelled'}`}>{s.is_active ? 'Active' : 'Inactive'}</span></td>
                      <td>
                        <div style={{ position: 'relative' }}>
                          <button 
                            className="action-btn" 
                            onClick={(e) => {
                              e.stopPropagation()
                              setActiveMenuId(activeMenuId === s.id ? null : s.id)
                            }}
                          >
                            <MoreVertical size={16} />
                          </button>
                          
                          {activeMenuId === s.id && (
                            <>
                              <div 
                                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }} 
                                onClick={() => setActiveMenuId(null)} 
                              />
                              <div style={{
                                position: 'absolute', top: '100%', right: 0, 
                                background: 'white', borderRadius: '8px', 
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)', 
                                padding: '6px', minWidth: '160px', zIndex: 11,
                                border: '1px solid var(--border)'
                              }}>
                                <button className="dropdown-item" onClick={() => { setEditService(s); setShowForm(true); setActiveMenuId(null) }}>
                                  <Edit size={14} /> Edit Service
                                </button>
                                <button className="dropdown-item" onClick={() => { setCalculatorService(s); setShowCalculator(true); setActiveMenuId(null) }}>
                                  <Calculator size={14} /> Price Calculator
                                </button>
                                <button className="dropdown-item" onClick={async () => {
                                  const { error } = await supabase.from('services').update({ is_active: !s.is_active }).eq('id', s.id)
                                  if (error) toast.error('Failed to update status')
                                  else {
                                    toast.success(s.is_active ? 'Service deactivated' : 'Service activated')
                                    loadAll()
                                  }
                                  setActiveMenuId(null)
                                }}>
                                  {s.is_active ? <XCircle size={14} /> : <CheckCircle size={14} />} 
                                  {s.is_active ? 'Deactivate' : 'Activate'}
                                </button>
                                <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />
                                <button className="dropdown-item danger" onClick={async () => { 
                                  const isConfirmed = await confirm({
                                    title: 'Delete Printing Service',
                                    message: 'Are you sure you want to delete this service?',
                                    confirmText: 'Yes, Delete Service',
                                    cancelText: 'Cancel',
                                    type: 'danger'
                                  })
                                  if (isConfirmed) { 
                                    const { error } = await supabase.from('services').delete().eq('id', s.id)
                                    if (error) toast.error('Failed to delete service')
                                    else {
                                      toast.success('Service deleted')
                                      loadAll()
                                    }
                                  } 
                                  setActiveMenuId(null)
                                }}>
                                  <Trash2 size={14} /> Delete
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>

    {showCalculator && (
        <PriceCalculatorModal 
          service={calculatorService} 
          currency={currency} 
          onClose={() => { setShowCalculator(false); setCalculatorService(null) }} 
        />
      )}
    </div>
  )
}
