import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { X, Upload, File as FileIcon, XCircle } from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'

export default function CustomerJobUploadModal({ onClose, onSuccess, customer }) {
  const [form, setForm] = useState({ category: 'General', notes: '' })
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const { showToast } = useToast()

  const CATEGORIES = ['Banner', 'Stickers', 'General Printing', 'Picture Frame', 'Apparel', 'Others']

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
    }
  }

  const removeFile = () => {
    setFile(null)
  }

  async function uploadFile(fileData) {
    if (!fileData) return null
    const formData = new FormData()
    formData.append('images[]', fileData)
    formData.append('company_id', customer.company_id)
    
    // In dev, the Vite proxy might not exist for /api.
    const baseUrl = window.location.origin
    const url = `${baseUrl}/api/upload.php`
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData
      })
      const data = await response.json()
      if (data.success && data.uploaded && data.uploaded.length > 0) {
        return data.uploaded[0].url
      }
      throw new Error('Upload failed')
    } catch (e) {
      console.error(e)
      throw new Error('File upload error')
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!file) {
      showToast('Please attach a file for your print job.', 'error')
      return
    }

    setLoading(true)

    try {
      const fileUrl = await uploadFile(file)

      // Insert job
      const jobPayload = {
        company_id: customer.company_id,
        customer_id: customer.id,
        category: form.category,
        notes: form.notes,
        status: 'Pending',
        design_file_url: fileUrl,
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
        message: `${customer.name} just uploaded a new ${form.category} job.`,
        type: 'job_created'
      })

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
      <div className="modal-content" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2 className="modal-title">Upload New Job</h2>
          <button className="btn-close" onClick={onClose}><X size={20} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body">
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

          <div className="form-group">
            <label className="form-label">Design File (PDF, PNG, JPG)</label>
            
            {!file ? (
              <div style={{
                border: '2px dashed var(--border)',
                borderRadius: '8px',
                padding: '32px',
                textAlign: 'center',
                backgroundColor: 'var(--bg-light)',
                cursor: 'pointer',
                position: 'relative'
              }}>
                <input 
                  type="file" 
                  onChange={handleFileChange} 
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} 
                />
                <Upload size={32} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
                <p style={{ margin: 0, fontWeight: 500 }}>Click or drag file to upload</p>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>Max file size: 50MB</p>
              </div>
            ) : (
              <div style={{
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'var(--bg-light)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
                  <FileIcon size={24} style={{ color: 'var(--primary)' }} />
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '14px', fontWeight: 500 }}>
                    {file.name}
                  </span>
                </div>
                <button type="button" onClick={removeFile} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', padding: '4px' }}>
                  <XCircle size={20} />
                </button>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Notes or Instructions (Optional)</label>
            <textarea
              className="form-control"
              placeholder="E.g., I need 5 copies on glossy paper..."
              value={form.notes}
              onChange={e => setForm({...form, notes: e.target.value})}
              rows={3}
            />
          </div>

          <div className="modal-footer" style={{ marginTop: '24px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading || !file}>
              {loading ? 'Uploading...' : 'Submit Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
