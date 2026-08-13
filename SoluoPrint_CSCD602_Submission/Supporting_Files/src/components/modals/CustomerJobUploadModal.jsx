import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { X, Upload, File as FileIcon, XCircle } from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'
import { sendSms } from '../../lib/sms'
import { sendEmail } from '../../lib/email'

export default function CustomerJobUploadModal({ onClose, onSuccess, customer }) {
  const [form, setForm] = useState({ category: 'General', notes: '', width: '', height: '', unit: 'ft', quantity: 1 })
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const { showToast } = useToast()

  const CATEGORIES = ['Banner', 'Stickers', 'General Printing', 'Picture Frame', 'Apparel', 'Others']
  const UNITS = ['ft', 'inch', 'cm', 'm']

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(prev => [...prev, ...Array.from(e.target.files)])
    }
  }

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index))
  }

  async function uploadFiles(fileArray) {
    if (!fileArray || fileArray.length === 0) return []
    const formData = new FormData()
    fileArray.forEach(f => formData.append('images[]', f))
    formData.append('company_id', customer.company_id)
    
    const baseUrl = window.location.origin
    const url = `${baseUrl}/api/upload.php`
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData
      })
      const data = await response.json()
      if (data.success && data.uploaded && data.uploaded.length > 0) {
        return data.uploaded.map(u => u.url)
      }
      throw new Error('Upload failed')
    } catch (e) {
      console.error(e)
      throw new Error('File upload error')
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (files.length === 0) {
      showToast('Please attach at least one file for your print job.', 'error')
      return
    }

    setLoading(true)

    try {
      const fileUrls = await uploadFiles(files)
      const joinedUrls = fileUrls.join(',') // Join multiple URLs with comma

      // Insert job
      const jobPayload = {
        company_id: customer.company_id,
        customer_id: customer.id,
        category: form.category,
        notes: form.notes,
        width: form.width ? parseFloat(form.width) : null,
        height: form.height ? parseFloat(form.height) : null,
        unit: form.unit,
        quantity: parseInt(form.quantity, 10) || 1,
        status: 'Pending',
        design_file_url: joinedUrls,
        job_date: new Date().toISOString().split('T')[0],
        total_price: 0,
        balance: 0,
        amount_paid: 0
      }

      const { data: newJob, error: jobErr } = await supabase
        .from('print_jobs')
        .insert(jobPayload)
        .select()
        .single()

      if (jobErr) throw jobErr

      // Add a notification for the admins
      await supabase.from('notifications').insert({
        company_id: customer.company_id,
        title: 'New Customer Job Upload',
        message: `${customer.name} just uploaded a new ${form.category} job with ${files.length} file(s).`,
        type: 'job_created',
        read: false
      })

      // Fetch company settings & admin info for SMS/Email alert
      try {
        const [{ data: companyData }, { data: smsSettings }] = await Promise.all([
          supabase.from('companies').select('name, email, phone').eq('id', customer.company_id).single(),
          supabase.from('sms_settings').select('*').eq('company_id', customer.company_id).maybeSingle()
        ])

        if (companyData) {
          // Send SMS alert to shop admin if configured
          if (companyData.phone && smsSettings) {
            const alertText = `Alert: ${customer.name} has uploaded a new ${form.category} print job with ${files.length} artwork file(s). Log in to review.`
            sendSms(companyData.phone, alertText, smsSettings).catch(console.error)
          }

          // Send Email alert to shop admin
          if (companyData.email) {
            const emailSubject = `[SoluoPrint] New Artwork Upload from ${customer.name}`
            const emailHtml = `
              <h2>New Artwork Upload Received</h2>
              <p><strong>Customer:</strong> ${customer.name} (${customer.email || 'N/A'})</p>
              <p><strong>Category:</strong> ${form.category}</p>
              <p><strong>Files Uploaded:</strong> ${files.length} artwork file(s)</p>
              <p><strong>Notes:</strong> ${form.notes || 'None'}</p>
              <br/>
              <p>Please log in to your SoluoPrint dashboard at <a href="https://print.soluotech.com">https://print.soluotech.com</a> to review and process this job.</p>
            `
            sendEmail(companyData.email, emailSubject, emailHtml, companyData.name || 'SoluoPrint Alerts').catch(console.error)
          }
        }
      } catch (e) {
        console.error('Admin notification dispatch error:', e)
      }

      showToast('Job uploaded successfully! We will review it shortly.', 'success')
      if (onSuccess) onSuccess(newJob)
    } catch (err) {
      showToast(err.message || 'Failed to submit job.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '700px' }}>
        <div className="modal-header">
          <h2 className="modal-title">Upload New Job</h2>
          <button className="btn-close" onClick={onClose}><X size={20} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body" style={{ padding: '24px 32px' }}>
          <div className="form-group">
            <label className="form-label">Job Category</label>
            <select
              className="form-control"
              value={form.category}
              onChange={e => setForm({...form, category: e.target.value})}
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
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
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Unit</label>
              <select className="form-control" value={form.unit} onChange={e => setForm({...form, unit: e.target.value})}>
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
              cursor: 'pointer',
              position: 'relative',
              marginBottom: '12px'
            }}>
              <input 
                type="file" 
                multiple
                onChange={handleFileChange} 
                accept=".pdf,.png,.jpg,.jpeg,.tiff,.tif"
                style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', zIndex: 10 }} 
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
                    <button type="button" onClick={() => removeFile(i)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', padding: '4px' }}>
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
              rows={3}
            />
          </div>

          <div className="modal-footer" style={{ marginTop: '32px', borderTop: 'none', padding: 0 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading || files.length === 0}>
              {loading ? 'Uploading...' : 'Submit Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
