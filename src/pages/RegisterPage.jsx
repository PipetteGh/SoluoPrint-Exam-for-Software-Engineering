import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Eye, EyeOff } from 'lucide-react'

export default function RegisterPage() {
  const [form, setForm] = useState({ fullName: '', companyName: '', email: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const { signUp } = useAuth()
  const navigate = useNavigate()

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); setLoading(false); return }
    const { error: err } = await signUp(form.email, form.password, form.fullName, form.companyName, form.phone)
    setLoading(false)
    if (err) setError(err.message)
    else setSuccess(true)
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">PD</div>
          <span className="auth-logo-text">SoluoPrint</span>
        </div>

        {success ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ color: '#16a34a', fontSize: '48px', marginBottom: '16px' }}>✓</div>
            <h2 style={{ marginBottom: '12px', fontSize: '20px', fontWeight: '600' }}>Registration Successful!</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px', lineHeight: '1.5' }}>
              We've sent a verification link to <strong>{form.email}</strong>. 
              Please check your email and verify your account before logging in.
            </p>
            <Link to="/login" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              Go to Login
            </Link>
          </div>
        ) : (
          <>
            <h1 className="auth-title">Create your account</h1>
            <p className="auth-subtitle">Set up your print shop management system</p>

            {error && <div className="error-alert">{error}</div>}

            <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input type="text" name="fullName" className="form-control" placeholder="John Smith" value={form.fullName} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">Company Name</label>
              <input type="text" name="companyName" className="form-control" placeholder="Acme Print Co." value={form.companyName} onChange={handleChange} required />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Email address</label>
              <input type="email" name="email" className="form-control" placeholder="you@company.com" value={form.email} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number (with Country Code)</label>
              <input type="tel" name="phone" className="form-control" placeholder="+233 24 123 4567" value={form.phone || ''} onChange={handleChange} required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{position:'relative'}}>
              <input
                type={showPw ? 'text' : 'password'}
                name="password"
                className="form-control"
                placeholder="min 6 characters"
                value={form.password}
                onChange={handleChange}
                required
                style={{paddingRight:'44px'}}
              />
              <button type="button" onClick={() => setShowPw(v => !v)}
                style={{position:'absolute',right:'12px',top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',display:'flex'}}>
                {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}
            style={{width:'100%',justifyContent:'center',padding:'10px',fontSize:'15px',marginTop:'4px'}}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
        </>
      )}
      </div>
    </div>
  )
}
