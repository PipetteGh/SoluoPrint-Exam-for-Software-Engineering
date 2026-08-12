import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CreditCard, CheckCircle } from 'lucide-react'

const PLANS = [
  { name: 'Starter', price: '$5/mo', features: ['1 User', '100 Jobs/month', 'Basic Reports', 'Email Support', 'No SMS Package'], current: true },
  { name: 'Professional', price: '$15/mo', features: ['5 Users', 'Unlimited Jobs', 'Advanced Reports', '500 SMS/month included', 'Priority Support'], current: false },
  { name: 'Business', price: '$35/mo', features: ['15 Users', 'Unlimited Jobs', 'All Features', 'Unlimited SMS', 'Custom Branding', 'API Access', 'Dedicated Support'], current: false }
]

export default function BillingPage() {
  const navigate = useNavigate()
  return (
    <div>
      <div className="page-header">
        <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/settings')}><ArrowLeft size={16}/> Back</button>
          <div><h1 className="page-title">Billing & Subscription</h1></div>
        </div>
      </div>

      <div style={{display:'flex',gap:'16px',marginBottom:'24px'}}>
        <div className="card" style={{flex:1,maxWidth:'400px'}}>
          <div className="card-header"><div className="card-title">Current Plan</div></div>
          <div className="card-body">
            <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'12px'}}>
              <div style={{background:'#eff6ff',padding:'8px 16px',borderRadius:'8px',color:'var(--primary)',fontWeight:'700',fontSize:'18px'}}>Starter</div>
              <span className="pill pill-green">Active</span>
            </div>
            <div style={{fontSize:'24px',fontWeight:'800',marginBottom:'4px'}}>$5<span style={{fontSize:'14px',fontWeight:'400',color:'var(--text-muted)'}}>/month</span></div>
            <p style={{fontSize:'13px',color:'var(--text-muted)'}}>Your plan renews automatically each month.</p>
          </div>
        </div>
      </div>

      <h2 style={{fontSize:'18px',fontWeight:'700',marginBottom:'16px'}}>Available Plans</h2>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'16px'}}>
        {PLANS.map(p => (
          <div key={p.name} className="card" style={{border: p.current ? '2px solid var(--primary)' : '1px solid var(--border)'}}>
            <div className="card-header" style={{background: p.current ? 'var(--primary-light)' : 'inherit'}}>
              <div><div style={{fontWeight:'700',fontSize:'16px'}}>{p.name}</div><div style={{fontSize:'20px',fontWeight:'800',marginTop:'4px'}}>{p.price}</div></div>
              {p.current && <span className="pill pill-blue">Current</span>}
            </div>
            <div className="card-body">
              <ul style={{listStyle:'none',marginBottom:'16px'}}>
                {p.features.map(f => (
                  <li key={f} style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'8px',fontSize:'13px'}}>
                    <CheckCircle size={15} color="#22c55e"/>
                    {f}
                  </li>
                ))}
              </ul>
              <button className={`btn ${p.current ? 'btn-secondary' : 'btn-primary'}`} style={{width:'100%',justifyContent:'center'}} disabled={p.current}>
                {p.current ? 'Current Plan' : 'Upgrade'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
