import { useState, useEffect, useRef } from 'react'
import { X, Plus, CheckSquare, Square, ImagePlus, Trash2, FileText, Loader2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { supabase } from '../../lib/supabase'
import Select from 'react-select'
import NewCustomerModal from './NewCustomerModal'

export default function NewJobListModal({ item, onClose, onSuccess }) {
  const { company } = useAuth()
  const [customers, setCustomers] = useState([])
  const [services, setServices] = useState([])
  const [categories, setCategories] = useState([])
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [fileLoading, setFileLoading] = useState(false)
  const [form, setForm] = useState({
    customer_id: item?.customer_id || '',
    selectedServices: item?.services || [],
    description: item?.description || '',
    notes: item?.notes || '',
    status: item?.status || 'Pending',
    width: '',
    height: '',
    unit: 'ft'
  })
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStep, setUploadStep] = useState('')
  const [error, setError] = useState('')
  const [imageFiles, setImageFiles] = useState([])
  const [existingImages, setExistingImages] = useState(item?.images || [])
  const [removedImages, setRemovedImages] = useState([])
  const fileInputRef = useRef(null)
  const toast = useToast()

  useEffect(() => {
    if (!company) return
    loadData()
  }, [company])

  async function loadData() {
    const [{ data: custData }, { data: svcData }, { data: catData }] = await Promise.all([
      supabase.from('customers').select('id,name,phone').eq('company_id', company.id).order('name'),
      supabase.from('services').select('id,name,unit_price,service_category_id').eq('company_id', company.id).neq('is_active', false),
      supabase.from('service_categories').select('id,name').eq('company_id', company.id).eq('is_active', true).order('name')
    ])
    setCustomers(custData || [])
    setServices(svcData || [])
    setCategories(catData || [])
  }

  function toggleService(svc) {
    setForm(f => {
      const exists = f.selectedServices.some(s => (s.id || s) === svc.id)
      if (exists) {
        return { ...f, selectedServices: f.selectedServices.filter(s => (s.id || s) !== svc.id) }
      } else {
        return { ...f, selectedServices: [...f.selectedServices, { id: svc.id, name: svc.name }] }
      }
    })
  }

  function isServiceSelected(svcId) {
    return form.selectedServices.some(s => (s.id || s) === svcId)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.customer_id) { setError('Please select a customer'); return }
    if (form.selectedServices.length === 0) { setError('Please select at least one service'); return }
    setLoading(true)
    setError('')
    setUploadProgress(10)
    setUploadStep('Preparing file upload configurations...')

    // Determine API base dynamically
    const API_BASE = window.location.origin

    // Upload new images to PHP API
    let uploadedUrls = []
    if (imageFiles.length > 0) {
      setUploadProgress(25)
      setUploadStep(`Uploading ${imageFiles.length} file(s) to server...`)
      
      const formData = new FormData()
      formData.append('company_id', company.id)
      for (const file of imageFiles) {
        formData.append('images[]', file)
      }

      try {
        const uploadRes = await fetch(`${API_BASE}/api/upload.php`, {
          method: 'POST',
          body: formData
        })
        const uploadData = await uploadRes.json()
        if (uploadData.success && uploadData.uploaded) {
          uploadedUrls = uploadData.uploaded.map(u => u.url)
          setUploadProgress(65)
          setUploadStep('Upload succeeded. Syncing data...')
        } else {
          console.error('Upload error:', uploadData.errors)
        }
      } catch (err) {
        console.error('Upload failed:', err)
      }
    }

    // Remove deleted images from PHP API
    if (removedImages.length > 0) {
      setUploadProgress(70)
      setUploadStep('Deleting removed attachments from server...')
      for (const url of removedImages) {
        // Extract the relative path regardless of the base URL
        const match = url.match(/\/uploads\/joblist\/(.+)$/)
        if (match && match[1]) {
          try {
            await fetch(`${API_BASE}/api/upload.php`, {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ path: match[1] })
            })
          } catch (e) {
            console.error('Delete error:', e)
          }
        }
      }
    }

    // Combine existing (minus removed) + newly uploaded
    setUploadProgress(75)
    setUploadStep('Formatting metadata registry payload...')
    const finalImages = [
      ...existingImages.filter(url => !removedImages.includes(url)),
      ...uploadedUrls
    ]

    const capturedWidth = form.width
    const capturedHeight = form.height
    const capturedUnit = form.unit
    
    let baseDescription = form.description.trim()
    if (!baseDescription && form.selectedServices.length > 0) {
      baseDescription = form.selectedServices[0].name || form.selectedServices[0]
    }
    
    let finalDescription = baseDescription
    if (capturedWidth && capturedHeight) {
      finalDescription = `${finalDescription} (${capturedWidth}x${capturedHeight} ${capturedUnit})`.trim()
    }

    const payload = {
      company_id: company.id,
      customer_id: form.customer_id,
      services: form.selectedServices,
      description: finalDescription,
      notes: form.notes,
      status: form.status,
      images: finalImages
    }

    setUploadProgress(85)
    setUploadStep(item?.id ? 'Updating job list registry...' : 'Inserting job specifications into queue...')

    let err
    if (item?.id) {
      delete payload.company_id
      ;({ error: err } = await supabase.from('job_list').update(payload).eq('id', item.id))
    } else {
      ;({ error: err } = await supabase.from('job_list').insert(payload))
    }

    setUploadProgress(100)
    setLoading(false)
    if (err) {
      setError(err.message)
      toast.error('Failed to save: ' + err.message)
    } else {
      // Send SMS notification for new job list items
      if (!item?.id && form.customer_id) {
        const serviceNames = form.selectedServices.map(s => s.name || s).join(', ')
        const msg = `Your job has been booked for: ${serviceNames}. We will notify you when it's ready. Thank you for choosing us!`
        import('../../lib/sms').then(({ notifyCustomer }) => {
          notifyCustomer(company.id, form.customer_id, 'job_list_created', msg)
        })
      }

      toast.success(item ? 'Job list item updated' : 'Job added to list')
      onSuccess?.()
    }
  }

  function handleFileSelect(e) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    setFileLoading(true)
    setTimeout(() => {
      setImageFiles(prev => [...prev, ...files])
      setFileLoading(false)
    }, 500)
    e.target.value = '' // Reset input
  }

  function removeNewImage(index) {
    setImageFiles(prev => prev.filter((_, i) => i !== index))
  }

  function removeExistingImage(url) {
    setExistingImages(prev => prev.filter(u => u !== url))
    setRemovedImages(prev => [...prev, url])
  }

  const isImageFile = (urlOrFile) => {
    const name = typeof urlOrFile === 'string' ? urlOrFile : urlOrFile?.name
    if (!name) return false
    const lower = name.toLowerCase()
    return (
      lower.endsWith('.png') ||
      lower.endsWith('.jpg') ||
      lower.endsWith('.jpeg') ||
      lower.endsWith('.webp') ||
      lower.endsWith('.gif') ||
      lower.endsWith('.svg') ||
      lower.startsWith('data:image/')
    )
  }

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

  // Group services by category
  const servicesByCategory = categories.map(cat => ({
    ...cat,
    services: services.filter(s => s.service_category_id === cat.id)
  })).filter(cat => cat.services.length > 0)

  // Ungrouped services
  const ungroupedServices = services.filter(s => !categories.some(c => c.id === s.service_category_id))

  const currency = company?.currency_symbol || '¢'

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '650px', position: 'relative', overflow: 'hidden' }}>
        <div className="modal-header">
          <h2 className="modal-title">{item ? 'Edit Job List Item' : 'Add to Job List'}</h2>
          <button className="modal-close" onClick={onClose}><X /></button>
        </div>

        {/* Live Upload Progress Overlay */}
        {loading && (
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px',
            backdropFilter: 'blur(4px)'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #2563eb, #10b981)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px',
              boxShadow: '0 4px 16px rgba(37,99,235,0.25)'
            }}>
              <Loader2 size={32} color="white" style={{ animation: 'soluoSpin 1s linear infinite' }} />
            </div>

            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>
              {item ? 'Updating Job List Item' : 'Adding Job to Job List'}
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#64748b', textAlign: 'center' }}>
              {uploadStep || 'Uploading files and processing job specifications...'}
            </p>

            <div style={{
              width: '100%',
              maxWidth: '400px',
              height: '10px',
              backgroundColor: '#e2e8f0',
              borderRadius: '10px',
              overflow: 'hidden',
              position: 'relative',
              marginBottom: '12px'
            }}>
              <div style={{
                height: '100%',
                width: `${uploadProgress}%`,
                background: 'linear-gradient(90deg, #2563eb, #10b981)',
                borderRadius: '10px',
                transition: 'width 0.3s ease-in-out'
              }} />
            </div>

            <div style={{ fontSize: '13px', fontWeight: 700, color: '#2563eb' }}>
              {uploadProgress}% Completed
            </div>

            <style>{`
              @keyframes soluoSpin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        )}

        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {error && <div className="error-alert">{error}</div>}
          <form onSubmit={handleSubmit} id="joblist-form">
            {/* Customer Selection */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label className="form-label" style={{ margin: 0 }}>Customer *</label>
                <button type="button" className="btn btn-ghost" onClick={() => setShowNewCustomer(true)} style={{ padding: '2px 8px', height: 'auto', color: '#2563eb', fontSize: '12px' }}>
                  <Plus size={12} /> New Customer
                </button>
              </div>
              <Select
                options={customerOptions}
                styles={selectStyles}
                placeholder="Select or search customer..."
                value={customerOptions.find(o => o.value === form.customer_id) || null}
                onChange={(option) => setForm(f => ({ ...f, customer_id: option?.value || '' }))}
                isClearable
              />
            </div>

            {/* Services Selection (Checkboxes) */}
            <div className="form-group">
              <label className="form-label">Services * <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>({form.selectedServices.length} selected)</span></label>
              
              <div style={{ border: '1px solid var(--border)', borderRadius: '10px', maxHeight: '250px', overflowY: 'auto' }}>
                {servicesByCategory.map(cat => (
                  <div key={cat.id}>
                    <div style={{ padding: '8px 14px', background: '#f8fafc', fontSize: '12px', fontWeight: 600, color: '#475569', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0 }}>
                      {cat.name}
                    </div>
                    {cat.services.map(svc => (
                      <button
                        type="button"
                        key={svc.id}
                        onClick={() => toggleService(svc)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          width: '100%',
                          padding: '10px 14px',
                          border: 'none',
                          borderBottom: '1px solid #f1f5f9',
                          background: isServiceSelected(svc.id) ? '#eff6ff' : 'white',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'background 0.1s'
                        }}
                      >
                        {isServiceSelected(svc.id) ? (
                          <CheckSquare size={16} color="#2563eb" />
                        ) : (
                          <Square size={16} color="#cbd5e1" />
                        )}
                        <span style={{ flex: 1, fontSize: '13px', fontWeight: isServiceSelected(svc.id) ? 600 : 400, color: isServiceSelected(svc.id) ? '#1e40af' : '#334155' }}>
                          {svc.name}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {currency}{svc.unit_price?.toFixed(2)}
                        </span>
                      </button>
                    ))}
                  </div>
                ))}
                {ungroupedServices.length > 0 && (
                  <div>
                    <div style={{ padding: '8px 14px', background: '#f8fafc', fontSize: '12px', fontWeight: 600, color: '#475569', borderBottom: '1px solid var(--border)' }}>
                      Other Services
                    </div>
                    {ungroupedServices.map(svc => (
                      <button
                        type="button"
                        key={svc.id}
                        onClick={() => toggleService(svc)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          width: '100%',
                          padding: '10px 14px',
                          border: 'none',
                          borderBottom: '1px solid #f1f5f9',
                          background: isServiceSelected(svc.id) ? '#eff6ff' : 'white',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'background 0.1s'
                        }}
                      >
                        {isServiceSelected(svc.id) ? (
                          <CheckSquare size={16} color="#2563eb" />
                        ) : (
                          <Square size={16} color="#cbd5e1" />
                        )}
                        <span style={{ flex: 1, fontSize: '13px', fontWeight: isServiceSelected(svc.id) ? 600 : 400 }}>
                          {svc.name}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {currency}{svc.unit_price?.toFixed(2)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {services.length === 0 && (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                    No services configured. Add services in Configuration → Services.
                  </div>
                )}
              </div>
            </div>

            {/* Selected Services Summary */}
            {form.selectedServices.length > 0 && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#166534', marginBottom: '6px' }}>Selected Services:</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {form.selectedServices.map((s, i) => (
                    <span key={i} style={{ padding: '4px 10px', background: '#dcfce7', color: '#166534', borderRadius: '6px', fontSize: '12px', fontWeight: 500 }}>
                      {s.name || s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Dimensions (Optional) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Width (Optional)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  className="form-control" 
                  placeholder="Width" 
                  value={form.width} 
                  onChange={e => setForm(f => ({ ...f, width: e.target.value }))} 
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Height (Optional)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  className="form-control" 
                  placeholder="Height" 
                  value={form.height} 
                  onChange={e => setForm(f => ({ ...f, height: e.target.value }))} 
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Unit</label>
                <select className="form-control" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                  <option value="ft">ft</option>
                  <option value="in">in</option>
                  <option value="cm">cm</option>
                  <option value="m">m</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea 
                className="form-control" 
                placeholder="Describe what the customer wants (e.g., design a flyer for their event, print 100 business cards...)" 
                value={form.description} 
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>

            {/* Notes */}
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea 
                className="form-control" 
                placeholder="Internal notes, deadlines, special requirements..." 
                value={form.notes} 
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={2}
              />
            </div>

            {/* File Upload */}
            <div className="form-group">
              <label className="form-label">Files <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>(PDF, TIFF, TIF, JPG, JPEG, PNG, etc.)</span></label>
              <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".pdf,.png,.jpg,.jpeg,.tiff,.tif" multiple style={{ display: 'none' }} />
              
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: existingImages.length > 0 || imageFiles.length > 0 ? '12px' : 0 }}>
                {/* Existing files */}
                {existingImages.map((url, i) => {
                  const isImg = isImageFile(url)
                  const imgSrc = window.location.hostname === 'localhost' && !url.startsWith('http') ? `http://localhost${url}` : url
                  const fileName = url.split('/').pop().split('?')[0]
                  return (
                    <div key={`existing-${i}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', width: '80px' }}>
                      <div style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {isImg ? (
                          <img src={imgSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '4px' }}>
                            <FileText size={24} color="#64748b" />
                          </div>
                        )}
                        <button type="button" onClick={() => removeExistingImage(url)} style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(220,38,38,0.9)', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, zIndex: 5 }}>
                          <X size={12} color="white" />
                        </button>
                      </div>
                      <span 
                        style={{ 
                          fontSize: '10px', 
                          color: 'var(--text-secondary)', 
                          textAlign: 'center', 
                          maxWidth: '80px', 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis', 
                          whiteSpace: 'nowrap',
                          fontWeight: 500
                        }} 
                        title={fileName}
                      >
                        {fileName}
                      </span>
                    </div>
                  )
                })}
                {/* New file previews */}
                {imageFiles.map((file, i) => {
                  const isImg = isImageFile(file)
                  const fileName = file.name
                  return (
                    <div key={`new-${i}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', width: '80px' }}>
                      <div style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', border: '2px solid #bfdbfe', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {isImg ? (
                          <img src={URL.createObjectURL(file)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '4px' }}>
                            <FileText size={24} color="#3b82f6" />
                          </div>
                        )}
                        <button type="button" onClick={() => removeNewImage(i)} style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(220,38,38,0.9)', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, zIndex: 5 }}>
                          <X size={12} color="white" />
                        </button>
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(37,99,235,0.85)', color: 'white', fontSize: '9px', textAlign: 'center', padding: '2px' }}>NEW</div>
                      </div>
                      <span 
                        style={{ 
                          fontSize: '10px', 
                          color: 'var(--text-secondary)', 
                          textAlign: 'center', 
                          maxWidth: '80px', 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis', 
                          whiteSpace: 'nowrap',
                          fontWeight: 500
                        }} 
                        title={fileName}
                      >
                        {fileName}
                      </span>
                    </div>
                  )
                })}
              </div>

              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()} 
                disabled={loading || fileLoading} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  padding: '10px 16px', 
                  border: '2px dashed #cbd5e1', 
                  borderRadius: '10px', 
                  background: '#f8fafc', 
                  cursor: (loading || fileLoading) ? 'not-allowed' : 'pointer', 
                  width: '100%', 
                  justifyContent: 'center', 
                  color: '#475569', 
                  fontSize: '13px', 
                  transition: 'all 0.15s' 
                }}
                onMouseEnter={e => { if(!loading && !fileLoading) { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.background = '#eff6ff' } }}
                onMouseLeave={e => { if(!loading && !fileLoading) { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc' } }}
              >
                {fileLoading ? (
                  <>
                    <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Processing & generating thumbnails...</span>
                  </>
                ) : (
                  <>
                    <Plus size={18} />
                    {existingImages.length + imageFiles.length > 0 ? 'Add More Files' : 'Click to Upload Files'}
                  </>
                )}
              </button>
            </div>

            {/* Status (for editing) */}
            {item && (
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-control" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  <option>Pending</option>
                  <option>In Progress</option>
                  <option>Ready</option>
                  <option>Converted</option>
                  <option>Cancelled</option>
                </select>
              </div>
            )}
          </form>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" form="joblist-form" type="submit" disabled={loading}>
            {loading ? 'Saving...' : (item ? 'Update Item' : 'Add to Job List')}
          </button>
        </div>
      </div>

      {/* Inline New Customer Modal */}
      {showNewCustomer && (
        <NewCustomerModal
          onClose={() => setShowNewCustomer(false)}
          onSuccess={(newCust) => {
            supabase.from('customers').select('id,name,phone').eq('company_id', company.id).order('name').then(({ data }) => {
              setCustomers(data || [])
              if (newCust) setForm(f => ({ ...f, customer_id: newCust.id }))
            })
          }}
        />
      )}
    </div>
  )
}
