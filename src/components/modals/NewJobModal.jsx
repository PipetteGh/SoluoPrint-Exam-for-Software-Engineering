import { useState, useEffect } from 'react'
import { X, Plus } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { recalculateCustomerBalance } from '../../lib/balanceUtils'
import { supabase } from '../../lib/supabase'
import Select from 'react-select'
import NewCustomerModal from './NewCustomerModal'
import NewServiceModal from './NewServiceModal'

const JOB_STATUSES = ['Pending', 'In Progress', 'Completed', 'Delivered', 'Cancelled', 'Overdue']
const UNITS = ['ft', 'inch', 'm', 'cm', 'px']

export default function NewJobModal({ onClose, onSuccess }) {
  const { company } = useAuth()
  const [customers, setCustomers] = useState([])
  const [services, setServices] = useState([])
  const [profiles, setProfiles] = useState([])
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState({
    category: '',
    status: 'Pending',
    job_date: new Date().toISOString().split('T')[0],
    customer_id: '',
    service_id: '',
    assigned_to: '',
    width: '',
    height: '',
    unit: 'ft',
    quantity: 1,
    unit_price: '',
    discount: '',
    premium: '',
    notes: '',
    is_custom_price: false,
    custom_total: '',
    amount_paid: '',
    payment_method: 'Cash'
  })
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [total, setTotal] = useState(0)
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [showNewService, setShowNewService] = useState(false)

  useEffect(() => {
    if (!company) return
    supabase.from('customers').select('id,name').eq('company_id', company.id).then(({ data }) => setCustomers(data || []))
    supabase.from('services').select('id,name,unit_price,service_category_id').eq('company_id', company.id).neq('is_active', false).then(({ data }) => setServices(data || []))
    supabase.from('profiles').select('id,full_name').eq('company_id', company.id).then(({ data }) => setProfiles(data || []))
    supabase.from('service_categories').select('id,name,form_type').eq('company_id', company.id).eq('is_active', true).order('name').then(({ data }) => {
      const cats = data || []
      setCategories(cats)
      if (cats.length > 0 && !form.category) {
        setForm(f => ({ ...f, category: cats[0].name }))
      }
    })
  }, [company])

  const getSqFtDivisor = (u) => {
    switch (u) {
      case 'inch': return 144
      case 'cm': return 929.03
      case 'm': return 0.0929 // 1/10.764
      case 'ft': return 1
      default: return 1
    }
  }

  useEffect(() => {
    if (form.is_custom_price) {
      setTotal(parseFloat(form.custom_total) || 0)
      return
    }
    const price = parseFloat(form.unit_price) || 0
    const qty = parseInt(form.quantity) || 1
    const rawArea = (parseFloat(form.width) || 1) * (parseFloat(form.height) || 1)
    const divisor = getSqFtDivisor(form.unit)
    const area = rawArea / divisor
    
    const discount = parseFloat(form.discount) || 0
    const premium = parseFloat(form.premium) || 0
    let t = price * area * qty
    t = t - (t * discount / 100) + (t * premium / 100)
    setTotal(Math.max(0, t))
  }, [form.unit_price, form.quantity, form.width, form.height, form.unit, form.discount, form.premium, form.is_custom_price, form.custom_total])

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

  const [isCreateAndNew, setIsCreateAndNew] = useState(false)

  async function handleSubmit(e) {
    if (e) e.preventDefault()
    setLoading(true)
    setError('')
    
    const jobNumber = 'PD-' + Date.now().toString().slice(-6)
    const amountPaid = parseFloat(form.amount_paid) || 0
    const finalBalance = Math.max(0, total - amountPaid)

    const payload = { 
      ...form,
      status: (finalBalance === 0 && amountPaid > 0) ? 'Completed' : form.status,
      company_id: company.id,
      job_number: jobNumber,
      total_price: total,
      balance: finalBalance,
      quantity: parseInt(form.quantity) || 1,
      unit_price: parseFloat(form.unit_price) || 0,
      width: parseFloat(form.width) || null,
      height: parseFloat(form.height) || null,
      discount: parseFloat(form.discount) || 0,
      premium: parseFloat(form.premium) || 0,
      assigned_to: form.assigned_to || null
    }
    delete payload.is_custom_price
    delete payload.custom_total
    delete payload.amount_paid
    delete payload.payment_method
    
    // 1. Insert Job
    const { data: insertedJob, error: err } = await supabase.from('print_jobs').insert(payload).select().single()
    
    // 2. Insert Initial Payment if any
    if (!err && amountPaid > 0 && insertedJob) {
      await supabase.from('payments').insert({
        company_id: company.id,
        customer_id: form.customer_id,
        job_id: insertedJob.id,
        amount: amountPaid,
        payment_method: form.payment_method,
        payment_date: form.job_date,
        notes: 'Initial deposit/payment upon job creation'
      })
      
      if (form.customer_id) {
        await recalculateCustomerBalance(form.customer_id)
      }
    } else if (!err && form.customer_id) {
      await recalculateCustomerBalance(form.customer_id)
    }

    setLoading(false)
    if (err) {
      setError(err.message)
      toast.error('Failed to create job: ' + err.message)
    } else {
      // Send SMS Notification
      if (insertedJob && form.customer_id) {
        const currencyCode = (company?.currency || 'GHS').split(' ')[0]
        const msg = `Hello, your print job ${insertedJob.job_number} has been received. Total: ${currencyCode} ${total.toFixed(2)}. Thank you for choosing us!`
        import('../../lib/sms').then(({ notifyCustomer }) => {
          notifyCustomer(company.id, form.customer_id, 'job_created', msg)
        })
      }

      toast.success('Job created successfully')
      onSuccess?.()
      if (isCreateAndNew) {
        setForm(prev => ({ ...prev, service_id: '', unit_price: '', quantity: 1, width: '', height: '', unit: 'ft', custom_total: '', amount_paid: '', notes: '' }))
        setIsCreateAndNew(false)
      } else {
        onClose()
      }
    }
  }

  const currency = company?.currency_symbol || '¢'

  // Determine which category is selected and its form_type
  const selectedCategory = categories.find(c => c.name === form.category)
  const isLargeFormat = selectedCategory?.form_type === 'large_format' || form.category === 'Large Format'

  // Filter services by selected category
  const filteredServices = selectedCategory
    ? services.filter(s => s.service_category_id === selectedCategory.id)
    : services

  const selectStyles = {
    control: (base) => ({ ...base, borderColor: 'var(--border)', padding: '2px', borderRadius: '8px', zIndex: 10 }),
    option: (base) => ({ ...base, fontSize: '13px', cursor: 'pointer' })
  }

  return (
    <div className="modal-overlay">
      <div className="modal modal-lg">
        <div className="modal-header" style={{ display: 'none' }}></div>
        <div className="modal-body" style={{ padding: '24px' }}>
          {error && <div className="error-alert">{error}</div>}
          <form onSubmit={handleSubmit} id="job-form">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 700, margin: 0, color: '#111827' }}>Job Details</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Status:</span>
                  <select name="status" value={form.status} onChange={handleChange} style={{ border: 'none', outline: 'none', fontWeight: 600, background: 'transparent', cursor: 'pointer' }}>
                    {JOB_STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#111827' }}><X size={20} /></button>
              </div>
            </div>

            {/* Dynamic category tabs */}
            <div style={{ display: 'flex', background: '#f8fafc', padding: '4px', borderRadius: '8px', marginBottom: '8px', overflowX: 'auto' }}>
              {categories.map(cat => (
                <button 
                  type="button"
                  key={cat.id} 
                  onClick={() => setForm({ ...form, category: cat.name, service_id: '', unit_price: '' })}
                  style={{
                    flex: 1, padding: '10px 16px', borderRadius: '6px', 
                    border: form.category === cat.name ? '1px solid #111827' : 'none',
                    background: form.category === cat.name ? '#fff' : 'transparent',
                    fontWeight: form.category === cat.name ? 600 : 500,
                    color: form.category === cat.name ? '#2563eb' : 'var(--text-muted)',
                    whiteSpace: 'nowrap', cursor: 'pointer', fontSize: '13px',
                    boxShadow: form.category === cat.name ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                  }}
                >
                  {cat.name}
                </button>
              ))}
            </div>
            <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '24px' }}>
              Showing {categories.length} categories
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '24px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>📅 Job Date:</label>
                <input type="date" name="job_date" className="form-control" value={form.job_date} onChange={handleChange} required style={{ width: '150px' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '24px', marginBottom: '24px' }}>
              {/* Left Column */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 0.6fr', gap: '16px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <label className="form-label" style={{ margin: 0 }}>Customer</label>
                      <button type="button" className="btn btn-ghost" onClick={() => setShowNewCustomer(true)} style={{ padding: '2px', height: 'auto', color: '#2563eb' }} title="Add New Customer">
                        <Plus size={14} />
                      </button>
                    </div>
                    <Select
                      options={customers.map(c => ({ value: c.id, label: c.name }))}
                      onChange={(selected) => setForm({ ...form, customer_id: selected ? selected.value : '' })}
                      value={form.customer_id ? { value: form.customer_id, label: customers.find(c => c.id === form.customer_id)?.name } : null}
                      placeholder="Select customer..."
                      isClearable
                      styles={selectStyles}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <label className="form-label" style={{ margin: 0 }}>Service</label>
                      <button type="button" className="btn btn-ghost" onClick={() => setShowNewService(true)} style={{ padding: '2px', height: 'auto', color: '#2563eb' }} title="Add New Service">
                        <Plus size={14} />
                      </button>
                    </div>
                    <Select
                      options={filteredServices.map(s => ({ value: s.id, label: `${s.name} (${currency}${s.unit_price})`, price: s.unit_price }))}
                      onChange={(selected) => setForm({ ...form, service_id: selected ? selected.value : '', unit_price: selected ? selected.price : '' })}
                      value={form.service_id ? { value: form.service_id, label: filteredServices.find(s => s.id === form.service_id)?.name } : null}
                      placeholder="Select service..."
                      isClearable
                      styles={selectStyles}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Unit Price ({currency})</label>
                    <input 
                      type="number" 
                      name="unit_price" 
                      className="form-control" 
                      placeholder="0.00" 
                      value={form.unit_price} 
                      onChange={handleChange} 
                      step="0.01" 
                    />
                  </div>
                </div>

                {isLargeFormat ? (
                  <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '20px' }}>
                    <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '16px', color: '#1e3a8a' }}>Dimensions</div>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '12px', color: '#1e3a8a' }}>Size Preset</label>
                        <select className="form-control" style={{ background: 'white' }}>
                          <option>Custom Size</option>
                        </select>
                      </div>
                      <div className="form-group" style={{ width: '80px', marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '12px', color: '#1e3a8a' }}>Width</label>
                        <input type="number" name="width" className="form-control" placeholder="W" value={form.width} onChange={handleChange} step="0.01" style={{ background: 'white' }} />
                      </div>
                      <div className="form-group" style={{ width: '80px', marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '12px', color: '#1e3a8a' }}>Height</label>
                        <input type="number" name="height" className="form-control" placeholder="H" value={form.height} onChange={handleChange} step="0.01" style={{ background: 'white' }} />
                      </div>
                      <div className="form-group" style={{ width: '100px', marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '12px', color: '#1e3a8a' }}>Unit</label>
                        <select name="unit" className="form-control" value={form.unit} onChange={handleChange} disabled={form.is_custom_price} style={{ background: 'white' }}>
                          {UNITS.map(u => <option key={u}>{u}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
                    <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '8px', color: 'var(--text-primary)' }}>Service Details</div>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>Standard service pricing applies based on customer type and quantity.</p>
                  </div>
                )}

                {/* Totals & Assign Box */}
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '20px', display: 'flex', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '20px', flex: 1 }}>
                    <div className="form-group" style={{ width: '100px', marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '12px', color: '#166534' }}>Quantity</label>
                      <input type="number" name="quantity" className="form-control" value={form.quantity} onChange={handleChange} min="1" style={{ background: 'white', textAlign: 'center', fontWeight: 600, fontSize: '16px' }} />
                    </div>
                    <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '12px', color: '#166534' }}>Assign To</label>
                      <select name="assigned_to" className="form-control" value={form.assigned_to} onChange={handleChange} style={{ background: 'white' }}>
                        <option value="">Unassigned 🔒</option>
                        {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ width: '1px', background: '#86efac', height: '50px', margin: '0 24px' }}></div>
                  <div style={{ minWidth: '120px', textAlign: 'center' }}>
                    <div style={{ fontSize: '13px', color: '#166534', marginBottom: '4px', fontWeight: 500 }}>Total</div>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: '#16a34a' }}>{currency}{total.toFixed(2)}</div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div style={{ width: '240px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ border: '1px solid #fed7aa', borderRadius: '12px', padding: '20px', background: '#fffbeb' }}>
                  <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '16px', color: '#9a3412' }}>Price Adjustments</div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '12px', color: '#9a3412' }}>Discount</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '12px', top: '9px', color: '#9a3412', fontWeight: 600 }}>C</span>
                      <input type="number" name="discount" className="form-control" placeholder="0" value={form.discount} onChange={handleChange} min="0" max="100" style={{ paddingLeft: '32px', background: 'white', border: '1px solid #fed7aa' }} />
                    </div>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '12px', color: '#9a3412' }}>Premium</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '12px', top: '9px', color: '#9a3412', fontWeight: 600 }}>C</span>
                      <input type="number" name="premium" className="form-control" placeholder="0" value={form.premium} onChange={handleChange} min="0" style={{ paddingLeft: '32px', background: 'white', border: '1px solid #fed7aa' }} />
                    </div>
                  </div>
                </div>

                <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', background: '#f8fafc' }}>
                  <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '16px', color: '#334155' }}>Initial Payment</div>
                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label className="form-label" style={{ fontSize: '12px', color: '#475569' }}>Amount Paid Now</label>
                    <input type="number" name="amount_paid" className="form-control" placeholder="0.00" value={form.amount_paid} onChange={handleChange} step="0.01" min="0" max={total} style={{ background: 'white' }} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '12px', color: '#475569' }}>Payment Method</label>
                    <select name="payment_method" className="form-control" value={form.payment_method} onChange={handleChange} style={{ background: 'white' }}>
                      <option>Cash</option>
                      <option>Mobile Money</option>
                      <option>Bank Transfer</option>
                      <option>Card</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label className="form-label" style={{ fontSize: '13px', fontWeight: 600 }}>Notes</label>
              <textarea name="notes" className="form-control" placeholder="Special instructions or requirements..." value={form.notes} onChange={handleChange} rows="3" />
            </div>

          </form>
        </div>
        <div className="modal-footer" style={{ borderTop: 'none', padding: '0 24px 24px', justifyContent: 'flex-end', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={onClose} style={{ background: 'white', border: '1px solid var(--border)' }}>Cancel</button>
          <button className="btn btn-primary" form="job-form" type="submit" disabled={loading} style={{ background: '#2563eb' }}>
            {loading ? 'Creating...' : 'Create and Close'}
          </button>
          <button className="btn" type="button" disabled={loading} style={{ background: 'white', color: '#2563eb', border: '1px solid #2563eb' }} onClick={(e) => {
            setIsCreateAndNew(true)
            handleSubmit(e)
          }}>
            Create and New
          </button>
        </div>
      </div>
      {showNewCustomer && (
        <NewCustomerModal 
          onClose={() => setShowNewCustomer(false)} 
          onSuccess={(newCust) => {
            // Re-fetch customers list
            supabase.from('customers').select('id,name').eq('company_id', company.id).then(({ data }) => {
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
            // Re-fetch services list
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
