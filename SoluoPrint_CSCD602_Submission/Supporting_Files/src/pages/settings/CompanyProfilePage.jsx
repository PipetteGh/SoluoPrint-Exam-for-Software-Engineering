import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { ArrowLeft, Building2, Globe, CheckCircle } from 'lucide-react'

export default function CompanyProfilePage() {
  const { company, refreshCompany } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', currency: 'GHS', currency_symbol: '¢', timezone: 'Africa/Accra' })
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { if (company) setForm({ name: company.name||'', email: company.email||'', phone: company.phone||'', address: company.address||'', currency: company.currency||'GHS', currency_symbol: company.currency_symbol||'¢', timezone: company.timezone||'Africa/Accra' }) }, [company])

  function handleChange(e) { setForm(f => ({ ...f, [e.target.name]: e.target.value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    await supabase.from('companies').update(form).eq('id', company.id)
    await refreshCompany()
    setLoading(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div className="page-header">
        <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/settings')}><ArrowLeft size={16}/> Back to Settings</button>
          <div><h1 className="page-title">Company Profile</h1></div>
        </div>
        <button type="submit" form="company-form" className="btn btn-primary" disabled={loading}>
          {loading ? 'Saving...' : 'Save All Changes'}
        </button>
      </div>

      {saved && (
        <div style={{ 
          background: '#f0fdf4', 
          border: '1px solid #bbf7d0', 
          color: '#166534', 
          padding: '16px', 
          borderRadius: '12px', 
          marginBottom: '24px', 
          fontSize: '14px', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px' 
        }}>
          <CheckCircle size={18} />
          <span>Company profile updated successfully!</span>
        </div>
      )}

      <form onSubmit={handleSubmit} id="company-form">
        <div className="grid-2">
          
          {/* Section 1: Basic Info */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={18}/>
                </div>
                Business Details
              </div>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="form-group">
                <label className="form-label">Company Name *</label>
                <input name="name" className="form-control" value={form.name} onChange={handleChange} required placeholder="Legal Business Name" />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Business Email</label>
                  <input type="email" name="email" className="form-control" value={form.email} onChange={handleChange} placeholder="contact@company.com" />
                </div>
                <div className="form-group">
                  <label className="form-label">Contact Phone</label>
                  <input name="phone" className="form-control" value={form.phone} onChange={handleChange} placeholder="+233..." />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Physical Address</label>
                <textarea name="address" className="form-control" value={form.address} onChange={handleChange} rows={4} placeholder="Street, City, Country" />
              </div>
            </div>
          </div>

          {/* Section 2: Localization */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Globe size={18}/>
                  </div>
                  Localization & Finance
                </div>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Primary Currency</label>
                    <select name="currency" className="form-control" value={form.currency} onChange={handleChange}>
                      {[['GHS','GHS - Ghanaian Cedi'],['USD','USD - US Dollar'],['EUR','EUR - Euro'],['GBP','GBP - British Pound'],['NGN','NGN - Nigerian Naira'],['KES','KES - Kenyan Shilling']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Currency Symbol</label>
                    <input name="currency_symbol" className="form-control" value={form.currency_symbol} onChange={handleChange} maxLength={3} style={{ width: '80px' }} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Default Timezone</label>
                  <select name="timezone" className="form-control" value={form.timezone} onChange={handleChange}>
                    {['Africa/Accra','Africa/Lagos','Africa/Nairobi','America/New_York','America/Los_Angeles','Europe/London','Europe/Paris','Asia/Kolkata','Asia/Tokyo'].map(tz => <option key={tz}>{tz}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="card" style={{ background: '#f8fafc', border: '1px dashed #cbd5e1' }}>
              <div className="card-body" style={{ textAlign: 'center', padding: '30px' }}>
                <div style={{ color: '#64748b', fontSize: '14px', marginBottom: '10px' }}>Need more customization?</div>
                <div style={{ color: '#94a3b8', fontSize: '12px' }}>Contact support to enable advanced branding options like custom domains and email white-labeling.</div>
              </div>
            </div>
          </div>

        </div>
      </form>
    </div>
  )
}
