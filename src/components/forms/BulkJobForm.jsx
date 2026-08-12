import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../contexts/ToastContext'
import { Plus, X, Calendar, Trash2 } from 'lucide-react'
import Select from 'react-select'
import NewCustomerModal from '../modals/NewCustomerModal'

const SIZE_PRESETS = [
  { label: 'Custom Size', w: '', h: '' },
  { label: 'A4 (8.3 × 11.7)', w: 8.3, h: 11.7 },
  { label: 'A3 (11.7 × 16.5)', w: 11.7, h: 16.5 },
  { label: 'A2 (16.5 × 23.4)', w: 16.5, h: 23.4 },
  { label: 'A1 (23.4 × 33.1)', w: 23.4, h: 33.1 },
  { label: '2×3 ft Banner', w: 2, h: 3 },
  { label: '3×5 ft Banner', w: 3, h: 5 },
  { label: '4×6 ft Banner', w: 4, h: 6 },
]

export default function BulkJobForm({ company, onBack, onSuccess }) {
  const [customers, setCustomers] = useState([])
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [services, setServices] = useState([])
  const [profiles, setProfiles] = useState([])
  const [categories, setCategories] = useState([])
  const [tracked, setTracked] = useState(true)
  const [loading, setLoading] = useState(false)
  const toast = useToast()
  const [error, setError] = useState('')

  const currency = company?.currency_symbol || '¢'

  const [form, setForm] = useState({
    job_date: new Date().toISOString().split('T')[0],
    customer_id: '',
    assigned_to: '',
    discount: 0,
    premium: 0,
    notes: '',
  })

  const [items, setItems] = useState([
    { id: Date.now(), service_id: '', activeCat: '', width: '', height: '', unit: 'ft', quantity: 1, unit_price: '', is_custom_price: false, custom_total: '' }
  ])

  useEffect(() => {
    if (!company) return
    supabase.from('customers').select('id,name').eq('company_id', company.id).order('name').then(({ data }) => setCustomers(data || []))
    supabase.from('services').select('id,name,unit_price,service_category_id').eq('company_id', company.id).neq('is_active', false).then(({ data }) => setServices(data || []))
    supabase.from('profiles').select('id,full_name').eq('company_id', company.id).then(({ data }) => setProfiles(data || []))
    supabase.from('service_categories').select('id,name,form_type').eq('company_id', company.id).eq('is_active', true).order('name').then(({ data }) => {
      setCategories(data || [])
    })
  }, [company])

  function getSqFtDivisor(unit) {
    if (unit === 'ft') return 1
    if (unit === 'inch') return 144
    if (unit === 'cm') return 929.03
    if (unit === 'm') return 0.0929
    return 1
  }

  function calculateItemTotal(item) {
    const price = parseFloat(item.unit_price) || 0
    const qty = parseInt(item.quantity) || 1
    const w = parseFloat(item.width) || 0
    const h = parseFloat(item.height) || 0
    
    // Check if it's large format or sticker based on category
    const selectedCategory = categories.find(c => c.name === item.activeCat)
    const isLargeFormat = selectedCategory?.form_type === 'large_format' || selectedCategory?.form_type === 'sticker' || item.activeCat === 'Large Format' || item.activeCat === 'Stickers' || item.activeCat?.toLowerCase().includes('sticker') || item.activeCat?.toLowerCase().includes('banner')

    const divisor = getSqFtDivisor(item.unit)
    const area = isLargeFormat && w > 0 && h > 0 ? ((w * h) / divisor) : 1
    
    const subtotal = price * area * qty
    return item.is_custom_price ? (parseFloat(item.custom_total) || 0) : Math.max(0, subtotal)
  }

  const itemsTotal = items.reduce((sum, item) => sum + calculateItemTotal(item), 0)
  const discountAmt = itemsTotal * (parseFloat(form.discount) || 0) / 100
  const premiumAmt = itemsTotal * (parseFloat(form.premium) || 0) / 100
  const grandTotal = Math.max(0, itemsTotal - discountAmt + premiumAmt)

  function handleFormChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  function handleItemChange(id, field, value) {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        let updated = { ...item, [field]: value }
        if (field === 'service_id') {
          const svc = services.find(s => s.id === value)
          if (svc) {
            updated.unit_price = svc.unit_price
            // Also Auto-select category
            const cat = categories.find(c => c.id === svc.service_category_id)
            if (cat) updated.activeCat = cat.name
          }
        }
        return updated
      }
      return item
    }))
  }

  function addItem() {
    setItems([...items, { id: Date.now(), service_id: '', activeCat: categories.length > 0 ? categories[0].name : '', width: '', height: '', unit: 'ft', quantity: 1, unit_price: '', is_custom_price: false, custom_total: '' }])
  }

  function removeItem(id) {
    if (items.length === 1) return
    setItems(items.filter(item => item.id !== id))
  }

  async function handleSubmit() {
    if (!form.customer_id) { setError('Please select a customer'); return }
    const invalidItem = items.find(i => !i.service_id)
    if (invalidItem) { setError('Please select a service for all items'); return }

    setLoading(true)
    setError('')

    const jobNumber = 'PD-' + Date.now().toString().slice(-6)
    
    let breakdown = items.map(i => {
      const svc = services.find(s => s.id === i.service_id)
      const selectedCategory = categories.find(c => c.name === i.activeCat)
      const isLargeFormat = selectedCategory?.form_type === 'large_format' || selectedCategory?.form_type === 'sticker' || i.activeCat === 'Large Format' || i.activeCat === 'Stickers' || i.activeCat?.toLowerCase().includes('sticker') || i.activeCat?.toLowerCase().includes('banner')
      
      let dim = (isLargeFormat && i.width && i.height) ? ` (${i.width}×${i.height} ${i.unit})` : ''
      return `- ${svc?.name || 'Service'}${dim} (Qty: ${i.quantity}) : ${currency} ${calculateItemTotal(i).toFixed(2)}`
    }).join('\n')

    const itemsJson = JSON.stringify(items.map(i => {
      const svc = services.find(s => s.id === i.service_id)
      const selectedCategory = categories.find(c => c.name === i.activeCat)
      const isLargeFormat = selectedCategory?.form_type === 'large_format' || selectedCategory?.form_type === 'sticker' || i.activeCat === 'Large Format' || i.activeCat === 'Stickers' || i.activeCat?.toLowerCase().includes('sticker') || i.activeCat?.toLowerCase().includes('banner')
      return {
        service: svc?.name || 'Service',
        dim: (isLargeFormat && i.width && i.height) ? `${i.width}×${i.height} ${i.unit}` : '-',
        qty: i.quantity,
        price: calculateItemTotal(i) / i.quantity,
        subtotal: calculateItemTotal(i)
      }
    }))

    const finalNotes = form.notes ? `${form.notes}\n\n[Bulk Job Breakdown]\n${breakdown}\n<!--BULK_JSON:${itemsJson}-->` : `[Bulk Job Breakdown]\n${breakdown}\n<!--BULK_JSON:${itemsJson}-->`

    const payload = {
      job_number: jobNumber,
      company_id: company.id,
      customer_id: form.customer_id,
      assigned_to: form.assigned_to || null,
      category: 'Bulk Order',
      status: 'Pending',
      job_date: form.job_date,
      quantity: 1,
      total_price: grandTotal,
      balance: grandTotal,
      discount: parseFloat(form.discount) || 0,
      premium: parseFloat(form.premium) || 0,
      notes: finalNotes,
      is_tracked: tracked
    }

    const { error: err } = await supabase.from('print_jobs').insert(payload)

    setLoading(false)
    if (err) { 
      setError(err.message)
      toast.error('Failed to save bulk job: ' + err.message)
      return 
    }
    toast.success('Bulk Job created')
    
    // Send SMS Notification
    if (form.customer_id) {
      const currencyCode = (company?.currency || 'GHS').split(' ')[0]
      const msg = `Your bulk print job ${jobNumber} has been received. Total: ${currencyCode} ${grandTotal.toFixed(2)}.`
      import('../../lib/sms').then(({ notifyCustomer }) => {
        notifyCustomer(company.id, form.customer_id, 'job_created', msg)
      })
    }

    onSuccess?.()
  }

  const selectStyles = {
    control: (base) => ({
      ...base, fontSize: '13px', minHeight: '38px', borderRadius: '8px', borderColor: 'var(--border)', boxShadow: 'none', cursor: 'text',
      '&:hover': { borderColor: 'var(--border-dark)' }
    }),
    option: (base) => ({ ...base, fontSize: '13px', cursor: 'pointer' })
  }

  const customerOptions = customers.map(c => ({ value: c.id, label: c.name }))
  const serviceOptions = services.map(s => ({ value: s.id, label: s.name }))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div><h1 style={{ fontSize: '22px', fontWeight: 700 }}>New Bulk Job</h1></div>
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

      {error && <div className="error-alert" style={{ marginBottom: '16px' }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <Calendar size={14} color="var(--text-muted)" />
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Job Date:</span>
            <input type="date" name="job_date" className="form-control" style={{ width: 'auto', fontSize: '13px' }} value={form.job_date} onChange={handleFormChange} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Customer
                <button type="button" className="btn btn-ghost btn-xs" style={{ padding: '0 4px', fontSize: '11px', color: 'var(--primary)' }} onClick={() => setShowNewCustomer(true)}>
                  <Plus size={12} /> New
                </button>
              </label>
              <Select 
                options={customerOptions} styles={selectStyles} placeholder="Select or search..."
                value={customerOptions.find(o => o.value === form.customer_id) || null}
                onChange={(opt) => handleFormChange({ target: { name: 'customer_id', value: opt?.value || '' } })}
                isClearable
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Assign To</label>
              <select name="assigned_to" className="form-control" value={form.assigned_to} onChange={handleFormChange} style={{ fontSize: '13px', height: '38px' }}>
                <option value="">Unassigned</option>
                {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
            </div>
          </div>

          {/* Items List */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>Services</h3>
              <button className="btn btn-xs" onClick={addItem} style={{ background: '#111827', color: 'white', border: 'none' }}><Plus size={14} /> Add Service</button>
            </div>

            {items.map((item, index) => {
              const selectedCategory = categories.find(c => c.name === item.activeCat)
              const isLargeFormat = selectedCategory?.form_type === 'large_format' || selectedCategory?.form_type === 'sticker' || item.activeCat === 'Large Format' || item.activeCat?.toLowerCase().includes('sticker')

              return (
                <div key={item.id} style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '16px', marginBottom: '16px', position: 'relative', background: '#fafafa' }}>
                  {items.length > 1 && (
                    <button className="btn btn-ghost btn-xs" onClick={() => removeItem(item.id)} style={{ position: 'absolute', top: '10px', right: '10px', color: 'var(--error)' }}>
                      <Trash2 size={14} />
                    </button>
                  )}
                  <div style={{ fontWeight: 600, fontSize: '12px', marginBottom: '12px', color: 'var(--text-muted)' }}>Item {index + 1}</div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr', gap: '16px', marginBottom: '12px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '11px' }}>Category</label>
                      <Select 
                        options={categories.map(c => ({ value: c.name, label: c.name }))}
                        styles={selectStyles}
                        placeholder="Search category..."
                        value={categories.map(c => ({ value: c.name, label: c.name })).find(o => o.value === item.activeCat) || null}
                        onChange={opt => {
                           handleItemChange(item.id, 'activeCat', opt?.value || '')
                           handleItemChange(item.id, 'service_id', '') 
                           handleItemChange(item.id, 'unit_price', '')
                        }}
                        isClearable
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '11px' }}>Service</label>
                      <Select 
                        options={services.filter(s => {
                           const cat = categories.find(c => c.name === item.activeCat)
                           return cat ? s.service_category_id === cat.id : true
                        }).map(s => ({ value: s.id, label: s.name }))} 
                        styles={selectStyles} placeholder="Search service..."
                        value={serviceOptions.find(o => o.value === item.service_id) || null}
                        onChange={(opt) => handleItemChange(item.id, 'service_id', opt?.value || '')}
                        isClearable
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '11px' }}>Unit Price ({currency})</label>
                      <input type="number" className="form-control" style={{ fontSize: '13px', height: '38px' }} value={item.unit_price} onChange={e => handleItemChange(item.id, 'unit_price', e.target.value)} step="0.01" />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: isLargeFormat ? 'auto auto auto auto 1fr' : '100px 1fr', gap: '10px', alignItems: 'end' }}>
                    {isLargeFormat && (
                      <>
                        <div className="form-group" style={{ marginBottom: 0, width: '100px' }}>
                          <label className="form-label" style={{ fontSize: '11px' }}>Size Preset</label>
                          <select className="form-control" onChange={(e) => {
                            const preset = SIZE_PRESETS[parseInt(e.target.value)]
                            if (preset.w) {
                              handleItemChange(item.id, 'width', String(preset.w))
                              handleItemChange(item.id, 'height', String(preset.h))
                            }
                          }} style={{ fontSize: '12px' }}>
                            {SIZE_PRESETS.map((p, i) => <option key={i} value={i}>{p.label}</option>)}
                          </select>
                        </div>
                        <div className="form-group" style={{ marginBottom: 0, width: '70px' }}>
                          <label className="form-label" style={{ fontSize: '11px' }}>W</label>
                          <input type="number" className="form-control" style={{ fontSize: '12px' }} value={item.width} onChange={e => handleItemChange(item.id, 'width', e.target.value)} step="0.1" />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0, width: '70px' }}>
                          <label className="form-label" style={{ fontSize: '11px' }}>H</label>
                          <input type="number" className="form-control" style={{ fontSize: '12px' }} value={item.height} onChange={e => handleItemChange(item.id, 'height', e.target.value)} step="0.1" />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0, width: '80px' }}>
                          <label className="form-label" style={{ fontSize: '11px' }}>Unit</label>
                          <select className="form-control" style={{ fontSize: '12px' }} value={item.unit} onChange={e => handleItemChange(item.id, 'unit', e.target.value)}>
                            {['ft', 'inch', 'm', 'cm'].map(u => <option key={u}>{u}</option>)}
                          </select>
                        </div>
                      </>
                    )}

                    <div className="form-group" style={{ marginBottom: 0, width: '100px' }}>
                      <label className="form-label" style={{ fontSize: '11px' }}>Quantity</label>
                      <input type="number" className="form-control" value={item.quantity} onChange={e => handleItemChange(item.id, 'quantity', e.target.value)} min="1" style={{ fontSize: '12px' }} />
                    </div>

                    <div style={{ textAlign: 'right', marginLeft: 'auto', alignSelf: 'center' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Subtotal</div>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>{currency} {calculateItemTotal(item).toFixed(2)}</div>
                    </div>
                  </div>
                  
                  <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center' }}>
                     <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px' }}>
                      <input type="checkbox" checked={item.is_custom_price} onChange={e => handleItemChange(item.id, 'is_custom_price', e.target.checked)} />
                      Override Subtotal
                    </label>
                    {item.is_custom_price && (
                      <input type="number" className="form-control" style={{ fontSize: '12px', width: '120px', marginLeft: '12px' }} placeholder="Custom total" value={item.custom_total} onChange={e => handleItemChange(item.id, 'custom_total', e.target.value)} step="0.01" />
                    )}
                  </div>
                </div>
              )
            })}
            
            {items.length > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
                <button type="button" className="btn btn-sm" onClick={addItem} style={{ background: '#111827', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Plus size={14} /> Add Service
                </button>
              </div>
            )}
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label">Order Notes</label>
            <textarea name="notes" className="form-control" value={form.notes} onChange={handleFormChange} rows={3} placeholder="Special instructions for the bulk order..." />
          </div>
        </div>

        <div>
          <div style={{ border: '2px solid #f59e0b', borderRadius: '10px', padding: '16px', position: 'sticky', top: '20px' }}>
            <div style={{ fontWeight: 600, color: '#92400e', fontSize: '14px', marginBottom: '16px' }}>Summary</div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '13px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Items Total:</span>
              <span style={{ fontWeight: 600 }}>{currency} {itemsTotal.toFixed(2)}</span>
            </div>

            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label" style={{ fontSize: '12px' }}>Discount (%)</label>
              <input type="number" name="discount" className="form-control" style={{ fontSize: '12px' }} value={form.discount} onChange={handleFormChange} min="0" max="100" />
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ fontSize: '12px' }}>Premium (%)</label>
              <input type="number" name="premium" className="form-control" style={{ fontSize: '12px' }} value={form.premium} onChange={handleFormChange} min="0" />
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '16px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Grand Total</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--success)' }}>{currency} {grandTotal.toFixed(2)}</div>
            </div>

            <div style={{ marginTop: '24px' }}>
               <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleSubmit} disabled={loading}>
                 {loading ? 'Saving...' : 'Create Bulk Job'}
               </button>
            </div>
          </div>
        </div>
      </div>

      {showNewCustomer && (
        <NewCustomerModal 
          onClose={() => setShowNewCustomer(false)} 
          onSuccess={(newCust) => {
            supabase.from('customers').select('id,name').eq('company_id', company.id).order('name').then(({ data }) => {
              setCustomers(data || [])
              if (newCust) setForm(f => ({ ...f, customer_id: newCust.id }))
            })
          }} 
        />
      )}
    </div>
  )
}
