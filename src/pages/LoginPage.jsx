import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Eye, EyeOff } from 'lucide-react'
import SEO from '../components/ui/SEO'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { signIn } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    let isCustomer = false
    let customerData = null

    if (!email.includes('@') && email.toUpperCase().startsWith('CUST-')) {
      // Treat as customer username
      const { data, error: custErr } = await supabase
        .from('customers')
        .select('*')
        .eq('username', email.toUpperCase())
        .eq('password', password)
        .single()
        
      if (custErr || !data) {
        setError('Invalid customer username or password')
        setLoading(false)
        return
      }
      isCustomer = true
      customerData = data
    } else {
      // Treat as admin/owner email via Supabase Auth
      const { error: err } = await signIn(email, password)
      if (err) {
        setError(err.message)
        setLoading(false)
        return
      }
    }

    setLoading(false)
    if (isCustomer) {
      localStorage.setItem('soluoprint_customer_id', customerData.id)
      navigate('/customer')
    } else {
      navigate('/dashboard')
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
        <p className="auth-subtitle">Sign in to your account</p>

        {error && <div className="error-alert">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email address or Username</label>
            <input
              type="text"
              className="form-control"
              placeholder="you@company.com or CUST-XXXX"
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
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer">
          Don't have an account? <Link to="/register">Create one free</Link>
        </div>
      </div>
    </div>
  )
}
