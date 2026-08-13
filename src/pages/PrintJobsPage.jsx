import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useConfirm } from '../contexts/ConfirmContext'
import { recalculateCustomerBalance } from '../lib/balanceUtils'
import { supabase } from '../lib/supabase'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Printer, Plus, Edit, Trash2, Search, ChevronDown, ChevronLeft, ChevronRight, ArrowLeft, X, Calendar, FileText, CreditCard, HelpCircle } from 'lucide-react'
import Select from 'react-select'
import NewCustomerModal from '../components/modals/NewCustomerModal'
import NewServiceModal from '../components/modals/NewServiceModal'
import ReceiptModal from '../components/modals/ReceiptModal'
import NewPaymentModal from '../components/modals/NewPaymentModal'
import BulkJobForm from '../components/forms/BulkJobForm'
import { TableSkeleton } from '../components/ui/Skeletons'
import SEO from '../components/ui/SEO'

// Categories are loaded dynamically from service_categories table
const JOB_STATUSES = ['Pending', 'In Progress', 'Completed', 'Cancelled', 'Overdue']
const SIZE_PRESETS = [
  { label: 'Custom Size', w: '', h: '', unit: 'ft' },
  { label: 'A4 (8.3 × 11.7 in)', w: 8.3, h: 11.7, unit: 'inch' },
  { label: 'A3 (11.7 × 16.5 in)', w: 11.7, h: 16.5, unit: 'inch' },
  { label: 'A2 (16.5 × 23.4 in)', w: 16.5, h: 23.4, unit: 'inch' },
  { label: 'A1 (23.4 × 33.1 in)', w: 23.4, h: 33.1, unit: 'inch' },
  { label: 'A0 (33.1 × 46.8 in)', w: 33.1, h: 46.8, unit: 'inch' },
  { label: 'Sticker 2 × 2 in', w: 2, h: 2, unit: 'inch' },
  { label: 'Sticker 3 × 3 in', w: 3, h: 3, unit: 'inch' },
  { label: 'Sticker 4 × 4 in', w: 4, h: 4, unit: 'inch' },
  { label: 'Sticker A4 Sheet', w: 8.3, h: 11.7, unit: 'inch' },
  { label: 'Sticker A3 Sheet', w: 11.7, h: 16.5, unit: 'inch' },
  { label: 'Banner 2 × 3 ft', w: 2, h: 3, unit: 'ft' },
  { label: 'Banner 3 × 5 ft', w: 3, h: 5, unit: 'ft' },
  { label: 'Banner 4 × 6 ft', w: 4, h: 6, unit: 'ft' },
  { label: 'Banner 6 × 10 ft', w: 6, h: 10, unit: 'ft' },
]

// ─── JOB CREATION/EDIT FORM (full page) ───────────────────────────
function JobForm({ job, company, initialCategory, onBack, onSuccess }) {
  const [categories, setCategories] = useState([])
  const [activeCat, setActiveCat] = useState(job?.category || initialCategory || '')
  const [customers, setCustomers] = useState([])
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [showNewService, setShowNewService] = useState(false)
  const [services, setServices] = useState([])
  const [profiles, setProfiles] = useState([])
  const [dbPresets, setDbPresets] = useState([])
  const [tracked, setTracked] = useState(true)
  const [form, setForm] = useState({
    job_date: job?.job_date || new Date().toISOString().split('T')[0],
    customer_id: job?.customer_id || '',
    service_id: job?.service_id || '',
    assigned_to: job?.assigned_to || '',
    width: job?.width || '',
    height: job?.height || '',
    unit: job?.unit || 'ft',
    quantity: job?.quantity || 1,
    unit_price: job?.unit_price || '',
    discount: job?.discount || 0,
    premium: job?.premium || 0,
    notes: job?.notes || '',
    status: job?.status || 'Pending',
    is_custom_price: false,
    custom_total: ''
  })
  const [loading, setLoading] = useState(false)
  const toast = useToast()
  const [error, setError] = useState('')

  const currency = company?.currency_symbol || '¢'

  useEffect(() => {
    if (!company) return
    loadCustomers()
    supabase.from('services').select('id,name,unit_price,service_category_id').eq('company_id', company.id).neq('is_active', false).then(({ data }) => setServices(data || []))
    supabase.from('profiles').select('id,full_name').eq('company_id', company.id).then(({ data }) => setProfiles(data || []))
    supabase.from('service_categories').select('id,name,form_type').eq('company_id', company.id).eq('is_active', true).order('name').then(({ data }) => {
      const cats = data || []
      setCategories(cats)
      if (!activeCat && cats.length > 0) setActiveCat(initialCategory || cats[0].name)
    })
    supabase.from('preset_sizes').select('*').eq('company_id', company.id).order('sort_order', { ascending: true }).then(({ data }) => setDbPresets(data || []))
  }, [company])

  function loadCustomers() {
    supabase.from('customers').select('id,name').eq('company_id', company.id).order('name').then(({ data }) => setCustomers(data || []))
  }

  const allPresets = [
    ...dbPresets.map(p => ({
      label: p.name || `${p.width}×${p.height} ${p.unit}`,
      w: p.width,
      h: p.height,
      unit: p.unit || 'ft',
      price: p.price || p.unit_price
    })),
    ...SIZE_PRESETS
  ]

  function getSqFtDivisor(unit) {
    if (unit === 'ft' || unit === 'feet') return 1
    if (unit === 'inch' || unit === 'inches' || unit === 'in') return 144
    if (unit === 'cm') return 929.0304
    if (unit === 'mm') return 92903.04
    if (unit === 'm') return 0.09290304
    return 1
  }

  // Price calculation
  const price = parseFloat(form.unit_price) || 0
  const qty = parseInt(form.quantity) || 1
  const w = parseFloat(form.width) || 0
  const h = parseFloat(form.height) || 0
  const divisor = getSqFtDivisor(form.unit)
  const area = (w * h) / divisor || 1
  const subtotal = price * area * qty
  const discountAmt = subtotal * (parseFloat(form.discount) || 0) / 100
  const premiumAmt = subtotal * (parseFloat(form.premium) || 0) / 100
  const total = form.is_custom_price 
    ? (parseFloat(form.custom_total) || 0)
    : Math.max(0, subtotal - discountAmt + premiumAmt)

  function handleChange(e) {
    const { name, value } = e.target
    let updated = { ...form, [name]: value }
    if (name === 'service_id') {
      const svc = services.find(s => s.id === value)
      if (svc) updated.unit_price = svc.unit_price
    }
    if (name === 'is_custom_price') {
      updated.is_custom_price = e.target.checked
    }
    setForm(updated)
  }

  function handlePreset(e) {
    const idx = parseInt(e.target.value)
    const preset = allPresets[idx]
    if (!preset) return
    setForm(f => ({
      ...f,
      width: preset.w !== '' && preset.w !== undefined && preset.w !== null ? String(preset.w) : f.width,
      height: preset.h !== '' && preset.h !== undefined && preset.h !== null ? String(preset.h) : f.height,
      unit: preset.unit || f.unit,
      unit_price: (preset.price || preset.unit_price) ? String(preset.price || preset.unit_price) : f.unit_price
    }))
  }

  async function handleSubmit(createNew = false) {
    if (!form.customer_id) { setError('Please select a customer'); return }
    setLoading(true)
    setError('')

    const jobNumber = 'PD-' + Date.now().toString().slice(-6)
    const payload = {
      ...form,
      category: activeCat,
      company_id: company.id,
      total_price: total,
      balance: job ? (job.balance || 0) : total,
      quantity: parseInt(form.quantity) || 1,
      unit_price: parseFloat(form.unit_price) || 0,
      width: parseFloat(form.width) || null,
      height: parseFloat(form.height) || null,
      discount: parseFloat(form.discount) || 0,
      premium: parseFloat(form.premium) || 0,
    }
    
    delete payload.is_custom_price
    delete payload.custom_total

    let err
    if (job?.id) {
      delete payload.company_id
      delete payload.balance;
      ({ error: err } = await supabase.from('print_jobs').update({ ...payload, total_price: total }).eq('id', job.id))
    } else {
      payload.job_number = jobNumber;
      ({ error: err } = await supabase.from('print_jobs').insert(payload))
    }

    setLoading(false)
    if (err) { 
      setError(err.message)
      toast.error('Failed to save job: ' + err.message)
      return 
    }
    toast.success(job ? 'Job updated' : 'Job created')
    
    // Recalculate customer balance with 100% financial integrity
    if (form.customer_id) {
      recalculateCustomerBalance(form.customer_id)
    }
    
    // SMS Notification on update
    if (job?.id && form.status !== job.status) {
      const msg = `Status Update: Your job ${job.job_number} is now ${form.status}.`
      import('../lib/sms').then(({ notifyCustomer }) => {
        notifyCustomer(company.id, form.customer_id, 'job_completed', msg)
      })
    } else if (!job?.id) {
       // Send SMS Notification
       if (form.customer_id) {
         const currencyCode = (company?.currency || 'GHS').split(' ')[0]
         const msg = `Your print job ${jobNumber} has been received. Total: ${currencyCode} ${total.toFixed(2)}.`
         import('../lib/sms').then(({ notifyCustomer }) => {
           notifyCustomer(company.id, form.customer_id, 'job_created', msg)
         })
       }
    }

    onSuccess?.()
    if (createNew) {
      setForm(f => ({ ...f, customer_id: '', service_id: '', width: '', height: '', unit_price: '', notes: '', quantity: 1, discount: 0, premium: 0 }))
      setError('')
    } else { onBack() }
  }

  // react-select custom styles to match interface
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

  const customerOptions = customers.map(c => ({ value: c.id, label: c.name }))

  // Determine active category object and filter services
  const selectedCategory = categories.find(c => c.name === activeCat)
  const isLargeFormat = selectedCategory?.form_type === 'large_format' || activeCat === 'Large Format'
  const filteredServices = selectedCategory
    ? services.filter(s => s.service_category_id === selectedCategory.id)
    : services
  const serviceOptions = filteredServices.map(s => ({ value: s.id, label: s.name }))

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700 }}>Job Details</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Status</span>
          <label className="toggle-switch">
            <input type="checkbox" checked={tracked} onChange={e => setTracked(e.target.checked)} />
            <span className="toggle-slider"></span>
          </label>
          <span style={{ fontSize: '13px', fontWeight: 500 }}>Tracked</span>
          <button className="btn btn-ghost" onClick={onBack} style={{ marginLeft: '4px' }}><X size={18} /></button>
        </div>
      </div>

      {/* Category tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '12px' }}>
        <button className="btn btn-ghost btn-xs" style={{ padding: '6px' }}><ChevronLeft size={14} /></button>
        <div className="tabs" style={{ marginBottom: 0 }}>
          {categories.map(cat => (
            <button key={cat.id} className={`tab ${activeCat === cat.name ? 'active' : ''}`} onClick={() => { setActiveCat(cat.name); setForm(f => ({ ...f, service_id: '', unit_price: '' })) }} style={{ fontSize: '12px', padding: '6px 14px' }}>
              {cat.name}
            </button>
          ))}
        </div>
        <button className="btn btn-ghost btn-xs" style={{ padding: '6px' }}><ChevronRight size={14} /></button>
      </div>

      <p style={{ fontSize: '12px', color: '#f59e0b', marginBottom: '16px' }}>
        Showing {categories.length} categories
      </p>

      {error && <div className="error-alert" style={{ marginBottom: '16px' }}>{error}</div>}

      {/* Main form layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 250px', gap: '20px' }}>
        {/* Left - main form */}
        <div>
          {/* Job Date */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <Calendar size={14} color="var(--text-muted)" />
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Job Date:</span>
            <Calendar size={14} color="var(--text-muted)" />
            <input type="date" name="job_date" className="form-control" style={{ width: 'auto', fontSize: '13px' }} value={form.job_date} onChange={handleChange} />
          </div>

          {/* Customer, Service, Unit Price */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Customer
                <button type="button" className="btn btn-ghost btn-xs" style={{ padding: '0 4px', fontSize: '11px', color: 'var(--primary)' }} onClick={() => setShowNewCustomer(true)}>
                  <Plus size={12} /> New Customer
                </button>
              </label>
              <Select 
                options={customerOptions}
                styles={selectStyles}
                placeholder="Select or search..."
                value={customerOptions.find(o => o.value === form.customer_id) || null}
                onChange={(option) => handleChange({ target: { name: 'customer_id', value: option?.value || '' } })}
                isClearable
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Service
                <button type="button" className="btn btn-ghost btn-xs" style={{ padding: '0 4px', fontSize: '11px', color: 'var(--primary)' }} onClick={() => setShowNewService(true)}>
                  <Plus size={12} /> New Service
                </button>
              </label>
              <Select 
                options={serviceOptions}
                styles={selectStyles}
                placeholder="Select or search..."
                value={serviceOptions.find(o => o.value === form.service_id) || null}
                onChange={(option) => {
                  const svc = services.find(s => s.id === option?.value)
                  setForm({ ...form, service_id: option?.value || '', unit_price: svc ? svc.unit_price : '' })
                }}
                isClearable
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Unit Price ({currency})</label>
              <input type="number" name="unit_price" className="form-control" placeholder="0.00" value={form.unit_price} onChange={handleChange} step="0.01" />
            </div>
          </div>

          {/* Dimensions box - only for Large Format */}
          {isLargeFormat ? (
            <div style={{ border: '2px solid #f59e0b', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
              <div style={{ fontWeight: 600, color: '#92400e', fontSize: '13px', marginBottom: '12px' }}>Dimensions</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px', gap: '10px', alignItems: 'end' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '11px' }}>Size Preset</label>
                  <select className="form-control" onChange={handlePreset} style={{ fontSize: '12px' }}>
                    {allPresets.map((p, i) => <option key={i} value={i}>{p.label}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '11px' }}>W</label>
                  <input type="number" name="width" className="form-control" style={{ fontSize: '12px' }} placeholder="W" value={form.width} onChange={handleChange} step="0.1" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '11px' }}>H</label>
                  <input type="number" name="height" className="form-control" style={{ fontSize: '12px' }} placeholder="H" value={form.height} onChange={handleChange} step="0.1" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '11px' }}>Unit</label>
                  <select name="unit" className="form-control" style={{ fontSize: '12px' }} value={form.unit} onChange={handleChange} disabled={form.is_custom_price}>
                    {['ft', 'inch', 'cm', 'mm', 'm'].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
              <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '8px', color: 'var(--text-primary)' }}>Service Details</div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>Standard service pricing applies based on quantity.</p>
            </div>
          )}

          <div style={{ alignItems: 'center', marginBottom: '20px', padding: '12px 16px', background: 'var(--bg-lighter)', borderRadius: '10px', display: 'flex' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 500, fontSize: '13px' }}>
              <input 
                type="checkbox" 
                name="is_custom_price" 
                checked={form.is_custom_price} 
                onChange={handleChange} 
                style={{ width: '16px', height: '16px', cursor: 'pointer' }} 
              />
              Override with Custom Total Price
            </label>
            
            {form.is_custom_price && (
              <div style={{ flex: 1, marginLeft: '20px' }}>
                <input 
                  type="number" 
                  name="custom_total" 
                  className="form-control" 
                  style={{ fontSize: '13px' }}
                  placeholder="Enter final total price" 
                  value={form.custom_total} 
                  onChange={handleChange} 
                  step="0.01" 
                  autoFocus
                />
              </div>
            )}
          </div>

          {/* Quantity & Assign To + Total */}
          <div style={{ border: '2px solid #f59e0b', borderRadius: '10px', padding: '16px', marginBottom: '20px', display: 'grid', gridTemplateColumns: '100px 1fr auto', gap: '16px', alignItems: 'center' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '11px' }}>Quantity</label>
              <input type="number" name="quantity" className="form-control" value={form.quantity} onChange={handleChange} min="1" style={{ fontSize: '13px' }} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '11px' }}>Assign To</label>
              <select name="assigned_to" className="form-control" value={form.assigned_to} onChange={handleChange} style={{ fontSize: '12px' }}>
                <option value="">Unassigned</option>
                {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: 'var(--error)' }}>Total</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--success)' }}>{currency} {total.toFixed(2)}</div>
            </div>
          </div>

          {/* Notes */}
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label">Notes</label>
            <textarea name="notes" className="form-control" value={form.notes} onChange={handleChange} rows={3} placeholder="Special instructions or requirements..." />
          </div>

          {/* Footer buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button className="btn btn-secondary" onClick={onBack}>Cancel</button>
            <button className="btn btn-primary" onClick={() => handleSubmit(false)} disabled={loading}>
              {loading ? 'Creating...' : (job ? 'Save Changes' : 'Create and Close')}
            </button>
            {!job && (
              <button className="btn btn-secondary" style={{ border: '2px solid var(--primary)', color: 'var(--primary)' }} onClick={() => handleSubmit(true)} disabled={loading}>
                Create and New
              </button>
            )}
          </div>
        </div>

        {/* Right sidebar - Price Adjustments */}
        <div>
          <div style={{ border: '2px solid #f59e0b', borderRadius: '10px', padding: '16px' }}>
            <div style={{ fontWeight: 600, color: '#92400e', fontSize: '13px', marginBottom: '12px' }}>Price Adjustments</div>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '12px' }}>Discount</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{currency}</span>
                <input type="number" name="discount" className="form-control" style={{ fontSize: '12px' }} value={form.discount} onChange={handleChange} min="0" max="100" placeholder="0" />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '12px' }}>Premium</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{currency}</span>
                <input type="number" name="premium" className="form-control" style={{ fontSize: '12px' }} value={form.premium} onChange={handleChange} min="0" placeholder="0" />
              </div>
            </div>
          </div>

          {/* Status selector (for edit) */}
          {job && (
            <div style={{ marginTop: '16px' }}>
              <div className="form-group">
                <label className="form-label">Job Status</label>
                <select name="status" className="form-control" value={form.status} onChange={handleChange}>
                  {JOB_STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {showNewCustomer && (
        <NewCustomerModal 
          onClose={() => setShowNewCustomer(false)} 
          onSuccess={(newCust) => {
            supabase.from('customers').select('id,name').eq('company_id', company.id).order('name').then(({ data }) => {
              const all = data || []
              setCustomers(all)
              if (newCust) setForm(f => ({ ...f, customer_id: newCust.id }))
            })
          }} 
        />
      )}
      {showNewService && (
        <NewServiceModal 
          onClose={() => setShowNewService(false)} 
          onSuccess={(newSvc) => {
            supabase.from('services').select('id,name,unit_price,service_category_id').eq('company_id', company.id).neq('is_active', false).then(({ data }) => {
              const all = data || []
              setServices(all)
              if (newSvc) {
                setForm(f => ({ ...f, service_id: newSvc.id, unit_price: newSvc.unit_price }))
              }
            })
          }} 
        />
      )}
    </div>
  )
}

// ─── MAIN PRINT JOBS PAGE ─────────────────────────────────────────────
export default function PrintJobsPage() {
  const { company } = useAuth()
  const [jobs, setJobs] = useState([])
  const [activeTab, setActiveTab] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [customerFilter, setCustomerFilter] = useState('All')
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0])
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0])
  const [search, setSearch] = useState('')
  const [showNewDropdown, setShowNewDropdown] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [showBulkForm, setShowBulkForm] = useState(false)
  const [editJob, setEditJob] = useState(null)
  const [formCategory, setFormCategory] = useState('Large Format')
  const [loading, setLoading] = useState(true)
  const [customers, setCustomers] = useState([])
  const [viewReceiptJob, setViewReceiptJob] = useState(null)
  const [profiles, setProfiles] = useState([])
  const [categories, setCategories] = useState([])
  const [recordPaymentJob, setRecordPaymentJob] = useState(null)
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [showHelp, setShowHelp] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20
  const { confirm } = useConfirm()
  const navigate = useNavigate()

  useEffect(() => { if (company) load() }, [company])

  // Handle conversion from Job List
  useEffect(() => {
    if (!company || !searchParams.get('fromJobList')) return
    const raw = sessionStorage.getItem('jobListConversion')
    if (!raw) return
    try {
      const conversion = JSON.parse(raw)
      sessionStorage.removeItem('jobListConversion')
      // Build a description from services + notes
      const serviceNames = (conversion.services || []).map(s => s.name || s).join(', ')
      const noteParts = []
      if (serviceNames) noteParts.push('Services requested: ' + serviceNames)
      if (conversion.description) noteParts.push(conversion.description)
      if (conversion.notes) noteParts.push(conversion.notes)
      // Pre-fill the edit job object so JobForm opens with customer + notes
      setEditJob({
        customer_id: conversion.customer_id,
        notes: noteParts.join('\n'),
        status: 'Pending',
        _sourceJobListId: conversion.source_job_list_id
      })
      setShowForm(true)
      // Clean up the URL param
      setSearchParams({}, { replace: true })
    } catch (e) {
      console.error('Failed to parse job list conversion data:', e)
    }
  }, [company, searchParams])

  async function load() {
    setLoading(true)
    
    const [{ data: jobData }, { data: custData }, { data: profData }, { data: catData }] = await Promise.all([
      supabase.from('print_jobs').select('*,customers(name),services(name)')
        .eq('company_id', company.id).order('created_at', { ascending: false }),
      supabase.from('customers').select('id,name').eq('company_id', company.id),
      supabase.from('profiles').select('id,full_name').eq('company_id', company.id),
      supabase.from('service_categories').select('id,name,form_type').eq('company_id', company.id).eq('is_active', true).order('name')
    ])
    setJobs(jobData || [])
    setCustomers(custData || [])
    setProfiles(profData || [])
    setCategories(catData || [])
    setLoading(false)
  }

  async function deleteJob(id) {
    const isConfirmed = await confirm({
      title: 'Delete Print Job',
      message: 'Are you sure you want to delete this job? Associated records will be removed. This action cannot be undone.',
      confirmText: 'Yes, Delete Job',
      cancelText: 'Cancel',
      type: 'danger'
    })
    if (!isConfirmed) return
    
    try {
      const targetJob = jobs.find(j => j.id === id)
      
      // 1. Delete associated payments if foreign key constraint exists
      await supabase.from('payments').delete().eq('job_id', id)
      
      // 2. Delete associated notifications if any
      await supabase.from('notifications').delete().eq('job_id', id)
      
      // 3. Delete from print_jobs
      const { error } = await supabase.from('print_jobs').delete().eq('id', id)
      
      if (error) {
        toast.error('Failed to delete job: ' + error.message)
      } else {
        toast.success('Job deleted successfully')
        
        // Recalculate customer balance after deletion
        if (targetJob?.customer_id) {
          await recalculateCustomerBalance(targetJob.customer_id)
        }
        
        // Audit log
        import('../lib/auditLogger').then(({ logAudit }) => {
          logAudit({
            companyId: company?.id,
            userId: profile?.id,
            actorName: profile?.full_name || 'Admin User',
            actorRole: profile?.role || 'Owner',
            action: 'JOB_DELETE',
            details: `Deleted print job ${targetJob?.job_number || id}`
          })
        })
        
        load()
      }
    } catch (err) {
      toast.error('Delete error: ' + err.message)
    }
  }

  async function updateJobStatus(id, newStatus) {
    // Optimistic update
    setJobs(prev => prev.map(j => j.id === id ? { ...j, status: newStatus } : j))
    const { error } = await supabase.from('print_jobs').update({ status: newStatus }).eq('id', id)
    if (error) {
      toast.error('Failed to update status')
      load() // Revert to server state if failed
    } else {
      toast.success(`Status updated to ${newStatus}`)
      
      // Send SMS on status change
      const job = jobs.find(j => j.id === id)
      if (job) {
        if (job.customer_id) recalculateCustomerBalance(job.customer_id)
        const msg = `Status Update: Your job ${job.job_number} is now ${newStatus}. Thank you!`
        import('../lib/sms').then(({ notifyCustomer }) => {
          notifyCustomer(company.id, job.customer_id, 'job_completed', msg)
        })
      }
    }
  }

  function openNewForm(cat) {
    setFormCategory(cat)
    setEditJob(null)
    setShowForm(true)
    setShowNewDropdown(false)
  }

  const categoryNames = categories.map(c => c.name)
  const jobCategories = [...new Set(jobs.map(j => j.category))].filter(Boolean)
  const allCategories = ['All', ...new Set([...categoryNames, ...jobCategories])]
  const filtered = jobs.filter(j => {
    if (activeTab !== 'All' && j.category !== activeTab) return false
    if (statusFilter !== 'All' && j.status !== statusFilter) return false
    if (customerFilter !== 'All' && j.customer_id !== customerFilter) return false
    if (dateFrom && j.job_date < dateFrom) return false
    if (dateTo && j.job_date > dateTo) return false
    if (search) {
      const q = search.toLowerCase()
      if (!j.job_number?.toLowerCase().includes(q) && !j.customers?.name?.toLowerCase().includes(q)) return false
    }
    return true
  })

  // Pagination logic
  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedJobs = filtered.slice(startIndex, startIndex + itemsPerPage)

  const currency = company?.currency_symbol || '¢'

  function statusClass(s) {
    if (s === 'Completed') return 'completed'
    if (s === 'In Progress') return 'in-progress'
    if (s === 'Cancelled') return 'cancelled'
    if (s === 'Overdue') return 'overdue'
    return 'pending'
  }

  // Tab counts and totals
  function tabInfo(cat) {
    const list = cat === 'All' ? jobs : jobs.filter(j => j.category === cat)
    return { count: list.length, total: list.reduce((s, j) => s + (j.total_price || 0), 0) }
  }

  if (showForm) {
    return (
      <JobForm
        job={editJob}
        company={company}
        initialCategory={formCategory}
        onBack={() => { setShowForm(false); setEditJob(null) }}
        onSuccess={() => {
          // If this job was converted from a job list item, mark it as 'Converted'
          if (editJob?._sourceJobListId) {
            supabase.from('job_list').update({ status: 'Converted' }).eq('id', editJob._sourceJobListId)
              .then(() => console.log('Job list item marked as Converted'))
          }
          setEditJob(null)
          load()
        }}
      />
    )
  }

  if (showBulkForm) {
    return (
      <BulkJobForm
        company={company}
        onBack={() => setShowBulkForm(false)}
        onSuccess={() => { setShowBulkForm(false); load() }}
      />
    )
  }

  return (
    <div className="print-jobs-page">
      <SEO title="Print Jobs" description="Track and manage all your print orders, status, and production workflow." />
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            Job Management
            <button onClick={() => setShowHelp(!showHelp)} className="btn btn-ghost" style={{ padding: '4px', minHeight: 'auto', borderRadius: '50%' }} title="About Print Jobs"><HelpCircle size={18} color="var(--primary)" /></button>
          </h1>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px' }}>
            <span className="pill pill-blue" style={{ fontSize: '11px' }}>Today's Jobs</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date().toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button className="btn" onClick={() => setShowBulkForm(true)} style={{ background: '#111827', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={16} /> Bulk Job
          </button>
          <div style={{ position: 'relative' }}>
            <button className="btn btn-primary" onClick={() => setShowNewDropdown(!showNewDropdown)}>
              <Plus size={16} /> New <ChevronDown size={14} />
            </button>
            {showNewDropdown && (
            <>
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }} onClick={() => setShowNewDropdown(false)} />
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: '4px', background: 'white',
                border: '1px solid var(--border)', borderRadius: '10px', boxShadow: '0 8px 20px rgba(0,0,0,0.12)',
                padding: '6px', minWidth: '200px', zIndex: 100
              }}>
                {categories.map(cat => (
                  <button key={cat.id} onClick={() => openNewForm(cat.name)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px',
                      border: 'none', background: 'none', cursor: 'pointer', borderRadius: '6px', fontSize: '13px',
                      color: 'var(--text-primary)', textAlign: 'left', transition: 'background 0.1s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <Plus size={14} color="var(--primary)" /> {cat.name}
                  </button>
                ))}
              </div>
            </>
          )}
          </div>
        </div>
      </div>

      {showHelp && (
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '16px 20px', marginBottom: '16px', position: 'relative' }}>
          <button onClick={() => setShowHelp(false)} style={{ position: 'absolute', top: '8px', right: '8px', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}><X size={14} color="#64748b" /></button>
          <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e40af', marginBottom: '8px' }}>🖨️ About Print Jobs</div>
          <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: '#334155', lineHeight: 1.8 }}>
            <li><strong>Print Jobs</strong> are finalized work orders with pricing, dimensions, and tracking.</li>
            <li>Create a new job by selecting a category, customer, service, and entering pricing details.</li>
            <li>Track job status (Pending → In Progress → Completed), record payments, and view receipts.</li>
            <li>You can also <strong>convert a Job List item</strong> into a Print Job — the customer and notes will be pre-filled for you.</li>
            <li><strong>Tip:</strong> Use <strong>Job List</strong> to book jobs first, then convert them here when ready to process with full pricing.</li>
          </ul>
        </div>
      )}

      {/* Category tabs with counts */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflowX: 'auto', marginBottom: '16px', background: 'white', border: '1px solid var(--border)', borderRadius: '10px', padding: '8px' }}>
        <button className="btn btn-ghost btn-xs" style={{ padding: '6px', flexShrink: 0 }}><ChevronLeft size={14} /></button>
        {allCategories.map(cat => {
          const info = tabInfo(cat)
          return (
            <button key={cat} onClick={() => setActiveTab(cat)}
              style={{
                padding: '10px 16px', borderRadius: '8px', border: '1px solid transparent', cursor: 'pointer',
                background: activeTab === cat ? '#eff6ff' : 'transparent',
                borderColor: activeTab === cat ? '#bfdbfe' : 'transparent',
                textAlign: 'center', minWidth: '100px', transition: 'all 0.15s', flexShrink: 0
              }}
            >
              <div style={{ fontWeight: 600, fontSize: '13px', color: activeTab === cat ? 'var(--primary)' : 'var(--text-primary)' }}>{cat}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{info.count} jobs</div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--success)' }}>{currency}{info.total.toFixed(2)}</div>
            </button>
          )
        })}
        <button className="btn btn-ghost btn-xs" style={{ padding: '6px', flexShrink: 0 }}><ChevronRight size={14} /></button>
      </div>

      {/* Filters row */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
        <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="All">All Statuses</option>
          {JOB_STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="filter-select" value={customerFilter} onChange={e => setCustomerFilter(e.target.value)}>
          <option value="All">All Customers</option>
          {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
          <Calendar size={14} color="var(--text-muted)" />
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>From:</span>
          <input type="date" className="filter-select" style={{ fontSize: '12px' }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>to</span>
          <input type="date" className="filter-select" style={{ fontSize: '12px' }} value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
      </div>

      {/* Search + count */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="form-control" style={{ paddingLeft: '32px', width: '260px', fontSize: '12px' }} placeholder="Search jobs or customers..." value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1) }} />
        </div>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          Showing {filtered.length > 0 ? startIndex + 1 : 0} to {Math.min(startIndex + itemsPerPage, filtered.length)} of {filtered.length} jobs
        </span>
      </div>

      {/* Jobs table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th style={{ width: '40px' }}>S/N</th>
              <th>Job #</th><th>Customer</th><th>Service</th><th>Category</th><th>Date</th>
              <th>Size</th><th>Total</th><th>Balance</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableSkeleton columns={10} rows={5} />
            ) : filtered.length === 0 ? (
              <tr><td colSpan={10}>
                <div className="empty-state" style={{ padding: '60px 0' }}>
                  <Printer />
                  <h3>No jobs found</h3>
                  <p style={{ color: 'var(--text-muted)' }}>for {new Date().toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Try adjusting your filters or create a new job.</p>
                </div>
              </td></tr>
            ) : paginatedJobs.map((j, index) => (
              <tr key={j.id}>
                <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{startIndex + index + 1}</td>
                <td>
                  {j.job_number ? (
                    <button className="btn btn-ghost" style={{ fontWeight: 600, color: 'var(--primary)', padding: 0, minHeight: 0, textDecoration: 'underline' }} onClick={() => setViewReceiptJob(j)}>
                      {j.job_number}
                    </button>
                  ) : '-'}
                  {j.design_file_url && (
                    <a 
                      href={j.design_file_url.split(',')[0]} 
                      target="_blank" 
                      rel="noreferrer" 
                      style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '3px', 
                        marginLeft: '6px', 
                        fontSize: '11px', 
                        fontWeight: 600,
                        background: '#eff6ff', 
                        color: '#2563eb', 
                        border: '1px solid #bfdbfe',
                        padding: '1px 6px', 
                        borderRadius: '10px',
                        textDecoration: 'none'
                      }}
                      title="View/Download attached files"
                    >
                      📄 Artwork ({j.design_file_url.split(',').length})
                    </a>
                  )}
                </td>
                <td style={{ fontWeight: 500 }}>{j.customers?.name || '-'}</td>
                <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{j.services?.name || '-'}</td>
                <td><span className="pill pill-blue">{j.category}</span></td>
                <td style={{ fontSize: '12px' }}>
                  {new Date(j.created_at).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}<br/>
                  <span style={{color: 'var(--text-muted)'}}>{new Date(j.created_at).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                </td>
                <td style={{ fontSize: '12px' }}>{j.width && j.height ? `${j.width}×${j.height} ${j.unit}` : '-'}</td>
                <td style={{ fontWeight: 600 }}>{currency}{(j.total_price || 0).toFixed(2)}</td>
                <td style={{ color: (j.balance || 0) > 0 ? 'var(--error)' : 'var(--success)', fontWeight: 600 }}>{currency}{(j.balance || 0).toFixed(2)}</td>
                <td>
                  <select 
                    className={`status-badge ${statusClass(j.status)}`}
                    style={{ appearance: 'none', border: 'none', cursor: 'pointer', outline: 'none', paddingRight: '8px' }}
                    value={j.status}
                    onChange={(e) => updateJobStatus(j.id, e.target.value)}
                  >
                    {JOB_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td>
                  <div className="action-btns">
                    {j.balance > 0 && (
                      <button className="action-btn" title="Record Payment" onClick={() => setRecordPaymentJob(j)}><CreditCard color="var(--success)" /></button>
                    )}
                    <button className="action-btn" title="View Receipt" onClick={() => setViewReceiptJob(j)}><FileText /></button>
                    <button className="action-btn" title="Edit" onClick={() => { setEditJob(j); setShowForm(true) }}><Edit /></button>
                    <button className="action-btn danger" title="Delete" onClick={() => deleteJob(j.id)}><Trash2 /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '20px', paddingBottom: '20px' }}>
          <button 
            className="btn btn-secondary btn-sm" 
            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px' }}
            disabled={currentPage === 1}
            onClick={() => { setCurrentPage(prev => prev - 1); window.scrollTo(0, 0) }}
          >
            <ChevronLeft size={16} /> Previous
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              // Show pages around current page
              let pageNum = i + 1
              if (totalPages > 5) {
                if (currentPage > 3) pageNum = currentPage - 3 + i
                if (pageNum > totalPages) pageNum = totalPages - 4 + i
              }
              if (pageNum <= 0) pageNum = i + 1

              return (
                <button
                  key={pageNum}
                  onClick={() => { setCurrentPage(pageNum); window.scrollTo(0, 0) }}
                  style={{
                    width: '32px', height: '32px', borderRadius: '6px', border: '1px solid var(--border)',
                    background: currentPage === pageNum ? 'var(--primary)' : 'white',
                    color: currentPage === pageNum ? 'white' : 'var(--text-primary)',
                    fontSize: '13px', fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  {pageNum}
                </button>
              )
            })}
          </div>
          <button 
            className="btn btn-secondary btn-sm" 
            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px' }}
            disabled={currentPage === totalPages}
            onClick={() => { setCurrentPage(prev => prev + 1); window.scrollTo(0, 0) }}
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}
      
      {viewReceiptJob && (
        <ReceiptModal 
          job={{
            ...viewReceiptJob,
            profiles: { full_name: (profiles || []).find(p => p.id === viewReceiptJob.assigned_to)?.full_name || 'Staff' }
          }} 
          company={company} 
          onClose={() => setViewReceiptJob(null)} 
        />
      )}

      {recordPaymentJob && (
        <NewPaymentModal 
          onClose={() => setRecordPaymentJob(null)} 
          onSuccess={() => { setRecordPaymentJob(null); load() }} 
          preSelectedCustomerId={recordPaymentJob.customer_id}
          preSelectedJobId={recordPaymentJob.id}
        />
      )}
    </div>
  )
}
