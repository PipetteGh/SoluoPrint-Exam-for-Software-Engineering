import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { ArrowLeft, Lock } from 'lucide-react'

export default function SecurityPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    if (form.newPassword !== form.confirmPassword) { setError('Passwords do not match'); return }
    if (form.newPassword.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password: form.newPassword })
    setLoading(false)
    if (err) setError(err.message)
    else { setMessage('Password updated successfully!'); setForm({ newPassword: '', confirmPassword: '' }) }
  }

  return (
    <div>
      <div className="page-header">
        <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/settings')}><ArrowLeft size={16}/> Back</button>
          <div><h1 className="page-title">Security & Authentication</h1></div>
        </div>
      </div>
      <div style={{display:'grid',gap:'16px',maxWidth:'600px'}}>
        <div className="card">
          <div className="card-header"><div className="card-title"><Lock size={16}/> Change Password</div></div>
          <div className="card-body">
            {message && <div style={{background:'#dcfce7',border:'1px solid #86efac',color:'#166534',padding:'10px 14px',borderRadius:'8px',marginBottom:'16px',fontSize:'13px'}}>✓ {message}</div>}
            {error && <div className="error-alert">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Email (current account)</label>
                <input className="form-control" value={user?.email||''} disabled style={{background:'#f8fafc'}} />
              </div>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input type="password" className="form-control" value={form.newPassword} onChange={e=>setForm(f=>({...f,newPassword:e.target.value}))} placeholder="Min 6 characters" required />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input type="password" className="form-control" value={form.confirmPassword} onChange={e=>setForm(f=>({...f,confirmPassword:e.target.value}))} placeholder="Repeat new password" required />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">Security Settings</div></div>
          <div className="card-body">
            {[
              { label: 'Two-Factor Authentication', desc: '(Coming Soon) Add an extra layer of security' },
              { label: 'Session Timeout', desc: 'Automatically log out after inactivity' }
            ].map((item, i) => (
              <div key={i} className="toggle-wrap">
                <div><div className="toggle-label">{item.label}</div><div className="toggle-desc">{item.desc}</div></div>
                <label className="toggle-switch">
                  <input type="checkbox" disabled={i===0} />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
