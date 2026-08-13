import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { X, Upload, File as FileIcon, XCircle, Loader2 } from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'
import { sendSms } from '../../lib/sms'
import { sendEmail } from '../../lib/email'
import { logAudit } from '../../lib/auditLogger'
import { recalculateCustomerBalance } from '../../lib/balanceUtils'

export default function CustomerJobUploadModal({ onClose, onSuccess, customer, jobToEdit = null }) {
  const [form, setForm] = useState({ 
    category: jobToEdit?.services?.[0]?.name || 'General', 
    notes: jobToEdit?.notes || '', 
    width: '', 
    height: '', 
    unit: 'ft', 
    quantity: 1 
  })
  const [files, setFiles] = useState([])
  const [existingImages, setExistingImages] = useState(jobToEdit?.images || [])
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStep, setUploadStep] = useState('')
  const [categories, setCategories] = useState([])
  const { showToast } = useToast()

  const FALLBACK_CATEGORIES = ['Banner', 'Stickers', 'General Printing', 'Picture Frame', 'Apparel', 'Others']
  const UNITS = ['ft', 'inch', 'cm', 'm']

  // Load service categories from the company's configuration
  useEffect(() => {
    async function loadCategories() {
      if (!customer?.company_id) return
      const { data } = await supabase
        .from('service_categories')
        .select('name')
        .eq('company_id', customer.company_id)
      if (data && data.length > 0) {
        setCategories(data.map(c => c.name))
        setForm(prev => ({ ...prev, category: data[0].name }))
      } else {
        setCategories(FALLBACK_CATEGORIES)
      }
    }
    loadCategories()
  }, [customer?.company_id])

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = Array.from(e.target.files)
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
    const formData = new FormData()
    fileArray.forEach(f => formData.append('images[]', f))
    formData.append('company_id', customer.company_id)
    
    const baseUrl = window.location.origin
    const url = `${baseUrl}/api/upload.php`
    
    const response = await fetch(url, { method: 'POST', body: formData })
    
    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      throw new Error('PHP_UNAVAILABLE')
    }
    
    const data = await response.json()
    if (data.success && data.uploaded && data.uploaded.length > 0) {
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
    if (files.length === 0) {
      showToast('Please attach at least one file for your print job.', 'error')
      return
    }

    setLoading(true)
    setUploadProgress(5)
    setUploadStep('Initializing job upload...')

    // Capture form values BEFORE any state resets so side effects have correct data
    const capturedCategory = form.category
    const capturedNotes = form.notes
    const capturedWidth = form.width
    const capturedHeight = form.height
    const capturedUnit = form.unit
    const capturedQuantity = form.quantity
    const capturedFileCount = files.length

    try {
      const newFileUrls = await uploadFiles(files)
      const combinedImages = [...existingImages, ...newFileUrls]

      if (combinedImages.length === 0) {
        showToast('Please attach at least one file for your print job.', 'error')
        setLoading(false)
        return
      }

      setUploadProgress(80)
      setUploadStep(jobToEdit ? 'Updating your uploaded job...' : 'Submitting to shop Job List for review...')

      const dimensionsDesc = capturedWidth && capturedHeight ? ` (${capturedWidth}x${capturedHeight} ${capturedUnit})` : ''
      const payload = {
        company_id: customer.company_id,
        customer_id: customer.id,
        services: [{ name: capturedCategory, unit_price: 0 }],
        description: `${capturedCategory}${dimensionsDesc} - Qty: ${capturedQuantity}`,
        notes: capturedNotes || '',
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
      showToast(
        jobToEdit
          ? 'Uploaded job updated successfully!'
          : 'Job uploaded to shop Job List successfully! The shop will review and convert it shortly.',
        'success'
      )

      // Reset form state
      setForm({
        category: categories[0] || 'General',
        notes: '',
        width: '',
        height: '',
        unit: 'ft',
        quantity: 1
      })
      setFiles([])
      setExistingImages([])
      setLoading(false)

      // Close the modal — use setTimeout to ensure React commits the toast before unmount
      setTimeout(() => {
        if (onSuccess) onSuccess(savedJob)
        if (onClose) onClose()
      }, 150)

      // Fire-and-forget side effects using captured values (NOT state which was already reset)
      ;(async () => {
        try {
          await recalculateCustomerBalance(customer.id).catch(() => {})

          await logAudit({
            companyId: customer.company_id,
            userId: customer.id,
            actorName: customer.name || 'Customer',
            actorRole: 'Customer',
            action: 'CUSTOMER_JOB_UPLOAD',
            details: `Uploaded new staged job (${capturedCategory}) with ${capturedFileCount} file(s). Notes: "${capturedNotes || 'None'}"`
          })

          await supabase.from('notifications').insert({
            company_id: customer.company_id,
            title: 'New Customer Job Upload',
            message: `${customer.name} uploaded a new ${capturedCategory} job to Job List with ${capturedFileCount} file(s). ${capturedNotes ? `Notes: "${capturedNotes}"` : ''}`,
            type: 'job_created',
            read: false
          }).catch(e => console.warn('Notification insert warn:', e))

          const [{ data: companyData }, { data: smsSettings }] = await Promise.all([
            supabase.from('companies').select('name, email, phone').eq('id', customer.company_id).single(),
            supabase.from('sms_settings').select('*').eq('company_id', customer.company_id).maybeSingle()
          ])

          if (companyData) {
            if (companyData.phone && smsSettings) {
              const alertText = `Alert: ${customer.name} has uploaded a new ${capturedCategory} job to your Job List with ${capturedFileCount} artwork file(s).`
              sendSms(companyData.phone, alertText, smsSettings).catch(console.error)
            }

            if (companyData.email) {
              const emailSubject = `[SoluoPrint] New Job List Upload from ${customer.name}`
              const emailHtml = `
                <h2>New Artwork Upload Received</h2>
                <p><strong>Customer:</strong> ${customer.name}</p>
                <p><strong>Category:</strong> ${capturedCategory}</p>
                <p><strong>Files Uploaded:</strong> ${capturedFileCount} artwork file(s)</p>
              `
              sendEmail(companyData.email, emailSubject, emailHtml, companyData.name || 'SoluoPrint Alerts').catch(console.error)
            }
          }
        } catch (e) {
          console.warn('Background notification alert warn:', e)
        }
      })()

    } catch (err) {
      console.error('Job submit error:', err)
      showToast(err.message || 'Failed to submit job.', 'error')
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
          <div className="form-group">
            <label className="form-label">Job Category</label>
            <select
              className="form-control"
              value={form.category}
              onChange={e => setForm({...form, category: e.target.value})}
              disabled={loading}
            >
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="form-row-3" style={{ marginBottom: '16px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Width (Optional)</label>
              <input 
                type="number" 
                step="0.01" 
                className="form-control" 
                placeholder="e.g. 10" 
                value={form.width} 
                onChange={e => setForm({...form, width: e.target.value})} 
                disabled={loading}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Height (Optional)</label>
              <input 
                type="number" 
                step="0.01" 
                className="form-control" 
                placeholder="e.g. 5" 
                value={form.height} 
                onChange={e => setForm({...form, height: e.target.value})} 
                disabled={loading}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Unit</label>
              <select className="form-control" value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} disabled={loading}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Quantity</label>
            <input 
              type="number" 
              className="form-control" 
              min="1" 
              value={form.quantity} 
              onChange={e => setForm({...form, quantity: e.target.value})} 
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Design Files (PDF, JPG, TIFF, PNG, JPEG)</label>
            
            <div style={{
              border: '2px dashed var(--border)',
              borderRadius: '8px',
              padding: '32px',
              textAlign: 'center',
              backgroundColor: 'var(--bg-light)',
              cursor: loading ? 'not-allowed' : 'pointer',
              position: 'relative',
              marginBottom: '12px'
            }}>
              <input 
                type="file" 
                multiple
                onChange={handleFileChange} 
                accept=".pdf,.png,.jpg,.jpeg,.tiff,.tif"
                disabled={loading}
                style={{ position: 'absolute', inset: 0, opacity: 0, cursor: loading ? 'not-allowed' : 'pointer', zIndex: 10 }} 
              />
              <Upload size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
              <p style={{ margin: 0, fontWeight: 500, fontSize: '15px' }}>Click or drag files to upload</p>
              <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>Upload should not exceed 50MB. Quality is preserved.</p>
            </div>

            {files.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '150px', overflowY: 'auto' }}>
                {files.map((f, i) => (
                  <div key={i} style={{
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    padding: '10px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: 'var(--bg-light)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
                      <FileIcon size={20} style={{ color: 'var(--primary)' }} />
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '13px', fontWeight: 500 }}>
                        {f.name}
                      </span>
                    </div>
                    <button type="button" onClick={() => removeFile(i)} disabled={loading} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', padding: '4px' }}>
                      <XCircle size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
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
