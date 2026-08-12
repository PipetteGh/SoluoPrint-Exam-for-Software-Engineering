import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Eye, EyeOff } from 'lucide-react'
import SEO from '../components/ui/SEO'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { customSignIn, finalizeCustomSignIn } = useAuth()
  const navigate = useNavigate()

  async function handleCredentialsSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      // Admin Custom Sign In (Bypass Supabase Native Auth)
      if (typeof customSignIn !== 'function') {
        throw new Error('Authentication service is initializing. Please refresh the page.')
      }

      const { data: profile, error: err } = await customSignIn(email, password)
      if (err) {
        setError(err.message)
        setLoading(false)
        return
      }

      await finalizeCustomSignIn(profile.id)
      setLoading(false)
      navigate('/dashboard')
    } catch (e) {
      console.error(e)
      setError(e.message || 'An unexpected error occurred during authentication. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <SEO title="Sign In" description="Login to your SoluoPrint account to manage your print shop." />
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">PD</div>
          <span className="auth-logo-text">SoluoPrint</span>
        </div>

        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Sign in to your business account</p>

        {error && <div className="error-alert">{error}</div>}

        <form onSubmit={handleCredentialsSubmit}>
          <div className="form-group">
            <label className="form-label">Email address</label>
            <input
              type="email"
              className="form-control"
              placeholder="you@company.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
            />
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
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer" style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
          <div>Don't have an account? <Link to="/register">Create one free</Link></div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', width: '100%', textAlign: 'center', marginTop: '4px' }}>
            <Link to="/customer-login" style={{ fontWeight: 600, color: '#10b981' }}>Login as a Customer →</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
