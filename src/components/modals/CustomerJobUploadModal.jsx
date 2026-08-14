import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { X, Upload, File as FileIcon, XCircle, Loader2, Plus, FileText, CheckSquare, Square } from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'
import { sendSms, notifyCustomer } from '../../lib/sms'
import { sendEmail } from '../../lib/email'
import { logAudit } from '../../lib/auditLogger'
import { recalculateCustomerBalance } from '../../lib/balanceUtils'

export default function CustomerJobUploadModal({ onClose, onSuccess, customer, jobToEdit = null }) {
  const [form, setForm] = useState({ 
    selectedServices: jobToEdit?.services || [],
    description: jobToEdit?.description || '',
    notes: jobToEdit?.notes || '',
    width: '',
    height: '',
    unit: 'ft'
  })
  const [files, setFiles] = useState([])
  const [existingImages, setExistingImages] = useState(jobToEdit?.images || [])
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStep, setUploadStep] = useState('')
  const [services, setServices] = useState([])
  const [categories, setCategories] = useState([])
  const [fileLoading, setFileLoading] = useState(false)
  const toast = useToast()
  const fileInputRef = useRef(null)

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

  const [companyCurrency, setCompanyCurrency] = useState('¢')

  // Load service categories and services from the company's configuration
  useEffect(() => {
    async function loadData() {
      if (!customer?.company_id) return
      const [{ data: svcData }, { data: catData }, { data: compData }] = await Promise.all([
        supabase.from('services').select('id,name,unit_price,service_category_id').eq('company_id', customer.company_id).neq('is_active', false),
        supabase.from('service_categories').select('id,name').eq('company_id', customer.company_id).eq('is_active', true).order('name'),
        supabase.from('companies').select('currency_symbol').eq('id', customer.company_id).single()
      ])
      setServices(svcData || [])
      setCategories(catData || [])
      if (compData?.currency_symbol) {
        setCompanyCurrency(compData.currency_symbol)
      }
    }
    loadData()
  }, [customer?.company_id])

  function toggleService(svc) {
    setForm(f => {
      const exists = f.selectedServices.some(s => (s.id || s) === svc.id)
      if (exists) {
        return { ...f, selectedServices: f.selectedServices.filter(s => (s.id || s) !== svc.id) }
      } else {
        return { ...f, selectedServices: [...f.selectedServices, svc] }
      }
    })
  }

  function isServiceSelected(svcId) {
    return form.selectedServices.some(s => (s.id || s) === svcId)
  }

  // Group services by category
  const servicesByCategory = categories.map(cat => ({
    ...cat,
    services: services.filter(s => s.service_category_id === cat.id)
  })).filter(cat => cat.services.length > 0)

  // Ungrouped services
  const ungroupedServices = services.filter(s => !categories.some(c => c.id === s.service_category_id))

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFileLoading(true)
      const selected = Array.from(e.target.files)
      
      setTimeout(() => {
        setFiles(prev => {
          const combined = [...prev, ...selected]
          const unique = []
          const keys = new Set()
          for (const f of combined) {
            const key = `${f.name}_${f.size}`
            if (!keys.has(key)) {
              keys.add(key)
              unique.push(f)
            }
          }
          return unique
        })
        setFileLoading(false)
      }, 500)
      e.target.value = ''
    }
  }

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index))
  }

  const removeExistingImage = (index) => {
    setExistingImages(existingImages.filter((_, i) => i !== index))
  }

  // Primary: PHP upload (production server)
  async function uploadViaPhp(fileArray) {
    setUploadProgress(30)
    setUploadStep(`Sending ${fileArray.length} file(s) to server...`)
    
    const formData = new FormData()
    fileArray.forEach(f => formData.append('images[]', f))
    formData.append('company_id', customer.company_id)
    
    const baseUrl = window.location.origin
    const url = `${baseUrl}/api/upload.php`
    
    const response = await fetch(url, { method: 'POST', body: formData })
    
    setUploadProgress(60)
    setUploadStep('Analyzing server response...')
    
    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      throw new Error('PHP_UNAVAILABLE')
    }
    
    const data = await response.json()
    if (data.success && data.uploaded && data.uploaded.length > 0) {
      setUploadProgress(75)
      setUploadStep('Syncing attachments to job registry...')
      return data.uploaded.map(u => u.url)
    }
    throw new Error('Upload failed')
  }

  // Fallback: Supabase Storage upload
  async function uploadViaSupabase(fileArray) {
    const urls = []
    let completedCount = 0

    for (const file of fileArray) {
      const ext = file.name.split('.').pop()
      const uniqueName = `${customer.company_id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
      
      const { error } = await supabase.storage
        .from('job-files')
        .upload(uniqueName, file, {
          cacheControl: '3600',
          upsert: false
        })
      
      if (error) {
        console.error('Supabase storage upload error:', error)
        throw error
      }
      
      const { data: urlData } = supabase.storage
        .from('job-files')
        .getPublicUrl(uniqueName)
      
      urls.push(urlData.publicUrl)
      completedCount++
      const pct = Math.round((completedCount / fileArray.length) * 60) + 20
      setUploadProgress(pct)
      setUploadStep(`Uploading artwork (${completedCount}/${fileArray.length})...`)
    }
    return urls
  }

  function generateFormattedFileName(custName, originalFileName, index = 0) {
    const cleanName = (custName || 'Customer')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_')
    
    const now = new Date()
    const pad = n => String(n).padStart(2, '0')
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
    const timeStr = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`
    
    const ext = originalFileName.includes('.') ? originalFileName.split('.').pop() : 'png'
    const suffix = index > 0 ? `_${index + 1}` : ''
    return `${cleanName}_${dateStr}_${timeStr}${suffix}.${ext}`
  }

  function readFileAsDataUrl(file, index = 0) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result
        const formattedName = generateFormattedFileName(customer?.name, file.name, index)
        if (dataUrl && dataUrl.startsWith('data:')) {
          const parts = dataUrl.split(';base64,')
          const mime = parts[0].replace('data:', '')
          const base64Data = parts[1]
          // Embed customer_date_time.ext filename inside custom data URL scheme
          resolve(`data:${mime};name=${encodeURIComponent(formattedName)};base64,${base64Data}`)
        } else {
          resolve(dataUrl)
        }
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  async function uploadFiles(fileArray) {
    if (!fileArray || fileArray.length === 0) return []
    
    setUploadProgress(15)
    setUploadStep('Connecting to secure upload storage...')

    try {
      const result = await uploadViaPhp(fileArray)
      setUploadProgress(70)
      return result
    } catch (phpErr) {
      console.warn('PHP upload unavailable, trying Supabase Storage:', phpErr.message)
      try {
        const result = await uploadViaSupabase(fileArray)
        setUploadProgress(70)
        return result
      } catch (storageErr) {
        console.warn('Supabase Storage failed, converting file to Base64 Data URL:', storageErr.message)
        setUploadProgress(50)
        setUploadStep('Encoding artwork for instant cloud preview...')
        const dataUrls = await Promise.all(fileArray.map((f, i) => readFileAsDataUrl(f, i)))
        setUploadProgress(70)
        return dataUrls
      }
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.selectedServices.length === 0) {
      toast.error('Please select at least one service for your print job.')
      return
    }
    if (files.length === 0 && existingImages.length === 0) {
      toast.error('Please attach at least one file for your print job.')
      return
    }

    setLoading(true)
    setUploadProgress(5)
    setUploadStep('Initializing job upload...')

    // Capture form values BEFORE any state resets
    const capturedNotes = form.notes
    const capturedDescription = form.description
    const capturedFileCount = files.length
    const capturedCategory = form.selectedServices.length > 0 
      ? (form.selectedServices[0].name || form.selectedServices[0]) 
      : 'General'

    try {
      const newFileUrls = await uploadFiles(files)
      const combinedImages = [...existingImages, ...newFileUrls]

      if (combinedImages.length === 0) {
        toast.error('Please attach at least one file for your print job.')
        setLoading(false)
        return
      }

      setUploadProgress(80)
      setUploadStep(jobToEdit ? 'Updating your uploaded job...' : 'Submitting to shop Job List for review...')

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
        company_id: customer.company_id,
        customer_id: customer.id,
        services: form.selectedServices,
        description: finalDescription,
        notes: form.notes || '',
        status: jobToEdit?.status || 'Pending',
        images: combinedImages
      }

      let savedJob = null
      if (jobToEdit) {
        const { data: updatedJob, error: updateErr } = await supabase
          .from('job_list')
          .update(payload)
          .eq('id', jobToEdit.id)
          .select()
          .single()

        if (updateErr) throw updateErr
        savedJob = updatedJob
      } else {
        const { data: newJob, error: insertErr } = await supabase
          .from('job_list')
          .insert(payload)
          .select()
          .single()

        if (insertErr) throw insertErr
        savedJob = newJob
      }

      setUploadProgress(100)
      setUploadStep(jobToEdit ? 'Update Complete!' : 'Upload Complete!')

      // Show success toast BEFORE closing
      toast.success(
        jobToEdit
          ? 'Uploaded job updated successfully!'
          : 'Job uploaded to shop Job List successfully! The shop will review and convert it shortly.'
      )

      // Reset form state
      setForm({
        selectedServices: [],
        description: '',
        notes: '',
        width: '',
        height: '',
        unit: 'ft'
      })
      setFiles([])
      setExistingImages([])
      setLoading(false)

      // Close the modal — use setTimeout to ensure React commits the toast before unmount
      setTimeout(() => {
        if (onSuccess) onSuccess(savedJob)
        if (onClose) onClose()
      }, 150)

      // Fire-and-forget side effects using captured values
      ;(async () => {
        try {
          await recalculateCustomerBalance(customer.id).catch(() => {})

          await logAudit({
            companyId: customer.company_id,
            userId: customer.id,
            actorName: customer.name || 'Customer',
            actorRole: 'Customer',
            action: 'CUSTOMER_JOB_UPLOAD',
            details: `Uploaded new staged job with ${capturedFileCount} file(s). Description: "${capturedDescription || 'None'}". Notes: "${capturedNotes || 'None'}"`
          })

          await supabase.from('notifications').insert({
            company_id: customer.company_id,
            title: 'New Customer Job Upload',
            message: `${customer.name} uploaded a new job with ${capturedFileCount} file(s). Description: "${capturedDescription || ''}". ${capturedNotes ? `Notes: "${capturedNotes}"` : ''}`,
            type: 'job_created',
            read: false
          }).catch(e => console.warn('Notification insert warn:', e))

          const [{ data: companyData }, { data: smsSettings }] = await Promise.all([
            supabase.from('companies').select('name, email, phone').eq('id', customer.company_id).single(),
            supabase.from('sms_settings').select('*').eq('company_id', customer.company_id).maybeSingle()
          ])

          if (companyData) {
            // 1. Alert Company (Admin)
            if (companyData.phone && smsSettings) {
              const alertText = `Alert: ${customer.name} has uploaded a new ${capturedCategory} job to your Job List with ${capturedFileCount} artwork file(s).`
              sendSms(companyData.phone, alertText, smsSettings).catch(console.error)
            }

            if (companyData.email) {
              const emailSubject = `[SoluoPrint] New Job List Upload from ${customer.name}`
              const emailHtml = `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; padding: 40px 20px; max-width: 600px; margin: 0 auto; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                  <div style="text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px;">
                    <img src="${companyData.logo_url || (window.location.origin + '/logo.png')}" alt="Logo" style="max-height: 50px; width: auto; margin-bottom: 10px;" onerror="this.style.display='none'" />
                    <div style="font-size: 20px; font-weight: 800; color: #1e293b; letter-spacing: -0.5px;">New Artwork Upload Received</div>
                  </div>
                  <p style="font-size: 15px; color: #334155; line-height: 1.6;">
                    Hello admin, a new artwork job upload has been submitted.
                  </p>
                  <div style="background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                    <p style="margin: 0 0 10px 0;"><strong>Customer:</strong> ${customer.name}</p>
                    <p style="margin: 0 0 10px 0;"><strong>Description:</strong> ${capturedDescription || capturedCategory}</p>
                    <p style="margin: 0;"><strong>Files Uploaded:</strong> ${capturedFileCount} file(s)</p>
                  </div>
                  <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 12px; color: #64748b; text-align: center;">
                    Regards,<br><b>SoluoPrint System</b>
                  </div>
                </div>
              `
              sendEmail(companyData.email, emailSubject, emailHtml, companyData.name || 'SoluoPrint Alerts').catch(console.error)
            }

            // 2. Alert Customer (Confirmation)
            if (customer.phone) {
              const customerSmsText = `we have received your job upload for "${capturedCategory}". We will review and convert it shortly. Thank you!`
              notifyCustomer(customer.company_id, customer.id, 'job_created', customerSmsText).catch(console.error)
            }

            if (customer.email) {
              const customerEmailSubject = `Artwork Upload Confirmation`
              const customerEmailHtml = `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; padding: 40px 20px; max-width: 600px; margin: 0 auto; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                  <div style="text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px;">
                    <img src="${companyData.logo_url || (window.location.origin + '/logo.png')}" alt="Logo" style="max-height: 50px; width: auto; margin-bottom: 10px;" onerror="this.style.display='none'" />
                    <div style="font-size: 20px; font-weight: 800; color: #1e293b; letter-spacing: -0.5px;">Artwork Upload Received</div>
                  </div>
                  <p style="font-size: 15px; color: #334155; line-height: 1.6;">
                    Hello <b>${customer.name}</b>,
                  </p>
                  <p style="font-size: 15px; color: #334155; line-height: 1.6;">
                    Thank you for uploading your artwork to <b>${companyData.name || 'our shop'}</b>. We have successfully received it and our team will review it shortly.
                  </p>
                  <div style="background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                    <p style="margin: 0 0 10px 0;"><strong>Job:</strong> ${capturedDescription || capturedCategory}</p>
                    <p style="margin: 0;"><strong>Files Uploaded:</strong> ${capturedFileCount} file(s)</p>
                  </div>
                  <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 12px; color: #64748b; text-align: center;">
                    Regards,<br>
                    <b>${companyData.name || 'Print Shop'} Team</b><br>
                    Phone: ${companyData.phone || 'N/A'}<br>
                    <div style="margin-top: 10px; font-size: 11px; color: #94a3b8;">Powered by: Soluotech</div>
                  </div>
                </div>
              `
              sendEmail(customer.email, customerEmailSubject, customerEmailHtml, companyData.name || 'SoluoPrint Alerts').catch(console.error)
            }
          }
        } catch (e) {
          console.warn('Background notification alert warn:', e)
        }
      })()

    } catch (err) {
      console.error('Job submit error:', err)
      toast.error(err.message || 'Failed to submit job.')
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '700px', position: 'relative', overflow: 'hidden' }}>
        <div className="modal-header">
          <h2 className="modal-title">Upload New Job</h2>
          <button className="btn-close" onClick={onClose} disabled={loading}><X size={20} /></button>
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
              Submitting Job to Job List
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
        
        <form onSubmit={handleSubmit} className="modal-body" style={{ padding: '24px 32px' }}>
          {/* Services Selection (Checkboxes) */}
          <div className="form-group">
            <label className="form-label">Services * <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>({form.selectedServices.length} selected)</span></label>
            
            <div style={{ border: '1px solid var(--border)', borderRadius: '10px', maxHeight: '200px', overflowY: 'auto' }}>
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
                        {companyCurrency}{svc.unit_price?.toFixed(2)}
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
                      <span style={{ flex: 1, fontSize: '13px', fontWeight: isServiceSelected(svc.id) ? 600 : 400, color: isServiceSelected(svc.id) ? '#1e40af' : '#334155' }}>
                        {svc.name}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {companyCurrency}{svc.unit_price?.toFixed(2)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {services.length === 0 && (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  No services configured.
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
                disabled={loading}
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
                disabled={loading}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Unit</label>
              <select className="form-control" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} disabled={loading}>
                <option value="ft">ft</option>
                <option value="in">in</option>
                <option value="cm">cm</option>
                <option value="m">m</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label">Description <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>(Optional)</span></label>
            <textarea 
              className="form-control" 
              placeholder="Describe your job details, sizes, quantities, and instructions..." 
              value={form.description} 
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              disabled={loading}
              rows={3}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Files <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>(PDF, TIFF, TIF, JPG, JPEG, PNG, etc.)</span></label>
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange} 
              accept=".pdf,.png,.jpg,.jpeg,.tiff,.tif"
              multiple
              disabled={loading}
              style={{ display: 'none' }} 
            />
            
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: existingImages.length > 0 || files.length > 0 ? '12px' : 0 }}>
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
                      <button type="button" onClick={() => removeExistingImage(i)} disabled={loading} style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(220,38,38,0.9)', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, zIndex: 5 }}>
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
              {files.map((file, i) => {
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
                      <button type="button" onClick={() => removeFile(i)} disabled={loading} style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(220,38,38,0.9)', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, zIndex: 5 }}>
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
                  {existingImages.length + files.length > 0 ? 'Add More Files' : 'Click to Upload Files'}
                </>
              )}
            </button>
          </div>

          <div className="form-group" style={{ marginTop: '16px' }}>
            <label className="form-label">Notes or Instructions (Optional)</label>
            <textarea
              className="form-control"
              placeholder="E.g., I need 5 copies on glossy paper..."
              value={form.notes}
              onChange={e => setForm({...form, notes: e.target.value})}
              disabled={loading}
              rows={3}
            />
          </div>

          <div className="modal-footer" style={{ marginTop: '32px', borderTop: 'none', padding: 0 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading || files.length === 0}>
              {loading ? 'Uploading & Submitting...' : 'Submit to Job List'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
