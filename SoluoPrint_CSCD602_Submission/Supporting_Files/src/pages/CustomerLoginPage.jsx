import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Users } from 'lucide-react'
import SEO from '../components/ui/SEO'
import { supabase } from '../lib/supabase'

export default function CustomerLoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Normalize: accept with or without CUST- prefix
      let normalizedUsername = username.trim().toUpperCase()
      if (!normalizedUsername.startsWith('CUST-')) {
        normalizedUsername = 'CUST-' + normalizedUsername
      }

      const { data, error: custErr } = await supabase
        .from('customers')
        .select('*')
        .eq('username', normalizedUsername)
        .eq('password', password)
        .single()

      if (custErr || !data) {
        setError('Invalid username or password. Please check your credentials and try again.')
        setLoading(false)
        return
      }

      localStorage.setItem('soluoprint_customer_id', data.id)
      
      // Log Audit Activity — AWAIT before navigating so the insert completes
      try {
        const { logAudit } = await import('../lib/auditLogger')
        await logAudit({
          companyId: data.company_id,
          userId: data.id,
          actorName: data.name || data.username,
          actorRole: 'Customer',
          action: 'CUSTOMER_LOGIN',
          details: `Customer ${data.name} (${data.username}) logged into Customer Portal.`
        })
      } catch (auditErr) {
        console.warn('Audit log warning:', auditErr)
      }

      setLoading(false)
      navigate('/customer')
    } catch (err) {
      console.error(err)
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <SEO title="Customer Login" description="Login to your customer portal to track print jobs and make payments." />
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            <Users size={20} color="white" />
          </div>
          <span className="auth-logo-text">Customer Portal</span>
        </div>

        <h1 className="auth-title">Customer Login</h1>
        <p className="auth-subtitle">Sign in to view your print jobs & payments</p>

        {error && <div className="error-alert">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              type="text"
              className="form-control"
              placeholder="Enter your username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              autoFocus
            />
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Your username was provided by the print shop
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{position:'relative'}}>
              <input
                type={showPw ? 'text' : 'password'}
                className="form-control"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{paddingRight:'44px'}}
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                style={{position:'absolute',right:'12px',top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',display:'flex'}}
              >
                {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{width:'100%',justifyContent:'center',padding:'10px',fontSize:'15px',marginTop:'4px'}}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer" style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
          <div>Are you a business owner? <Link to="/login">Sign in here</Link></div>
          <div>Don't have a business account? <Link to="/register">Create one free</Link></div>
        </div>
      </div>
    </div>
  )
}
