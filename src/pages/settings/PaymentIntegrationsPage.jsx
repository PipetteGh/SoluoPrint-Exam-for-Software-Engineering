import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Save, AlertCircle, Eye, EyeOff, ShieldCheck, CreditCard, Smartphone, Zap } from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'
import SEO from '../../components/ui/SEO'

export default function PaymentIntegrationsPage() {
  const { company } = useAuth()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showSecrets, setShowSecrets] = useState({
    paystack: false,
    hubtel: false,
    flutterwave: false
  })
  
  const [settings, setSettings] = useState({
    paystack_active: false,
    paystack_public_key: '',
    paystack_secret_key: '',
    hubtel_active: false,
    hubtel_client_id: '',
    hubtel_client_secret: '',
    flutterwave_active: false,
    flutterwave_public_key: '',
    flutterwave_secret_key: ''
  })

  useEffect(() => {
    if (company?.id) loadSettings()
  }, [company?.id])

  async function loadSettings() {
    try {
      const { data, error: err } = await supabase
        .from('payment_gateways')
        .select('*')
        .eq('company_id', company.id)
        .single()
      
      if (err && err.code !== 'PGRST116') {
        setError(err.message)
      } else if (data) {
        setSettings({
          paystack_active: data.paystack_active || false,
          paystack_public_key: data.paystack_public_key || '',
          paystack_secret_key: data.paystack_secret_key || '',
          hubtel_active: data.hubtel_active || false,
          hubtel_client_id: data.hubtel_client_id || '',
          hubtel_client_secret: data.hubtel_client_secret || '',
          flutterwave_active: data.flutterwave_active || false,
          flutterwave_public_key: data.flutterwave_public_key || '',
          flutterwave_secret_key: data.flutterwave_secret_key || ''
        })
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setSettings(s => ({ ...s, [name]: type === 'checkbox' ? checked : value }))
  }

  const toggleSecret = (key) => {
    setShowSecrets(s => ({ ...s, [key]: !s[key] }))
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const payload = {
      company_id: company.id,
      ...settings,
      updated_at: new Date().toISOString()
    }

    try {
      const { error: upsertErr } = await supabase
        .from('payment_gateways')
        .upsert(payload)

      if (upsertErr) throw upsertErr
      
      showToast('Payment integrations saved successfully', 'success')
    } catch (err) {
      setError(err.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>

  return (
    <div style={{ width: '100%', maxWidth: '100%' }}>
      <SEO title="Payment Integrations" description="Configure payment gateways for your customer portal" />
      
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="page-title">Payment Integrations & Gateways</h1>
          <p className="page-subtitle">Enable digital checkout and mobile money payments for customer portal invoices</p>
        </div>
      </div>

      {error && (
        <div className="error-alert mb-4">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSave} style={{ width: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px', marginBottom: '24px' }}>
          
          {/* Paystack Card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderTop: '4px solid #00c3f7' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#e0f7fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CreditCard size={22} color="#00c3f7" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Paystack</h3>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Cards, Apple Pay, MoMo</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className={`badge ${settings.paystack_active ? 'badge-success' : 'badge-neutral'}`} style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '20px' }}>
                    {settings.paystack_active ? 'Active' : 'Disabled'}
                  </span>
                  <label className="switch">
                    <input type="checkbox" name="paystack_active" checked={settings.paystack_active} onChange={handleChange} />
                    <span className="slider round"></span>
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 500 }}>Paystack Public Key</label>
                  <input type="text" name="paystack_public_key" className="form-control" value={settings.paystack_public_key} onChange={handleChange} placeholder="pk_test_..." />
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="form-label" style={{ fontWeight: 500 }}>Paystack Secret Key</label>
                    <button type="button" onClick={() => toggleSecret('paystack')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}>
                      {showSecrets.paystack ? <EyeOff size={14} /> : <Eye size={14} />}
                      <span>{showSecrets.paystack ? 'Hide' : 'Show'}</span>
                    </button>
                  </div>
                  <input type={showSecrets.paystack ? 'text' : 'password'} name="paystack_secret_key" className="form-control" value={settings.paystack_secret_key} onChange={handleChange} placeholder="sk_test_..." />
                </div>
              </div>
            </div>

            <div style={{ marginTop: '20px', paddingTop: '12px', borderTop: '1px solid var(--border)', fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={14} color="#10b981" />
              <span>Supports GHS, NGN, USD card checkout</span>
            </div>
          </div>

          {/* Hubtel Card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderTop: '4px solid #ef4444' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Smartphone size={22} color="#ef4444" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Hubtel (Mobile Money)</h3>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>MTN MoMo, Telecel, AT Money</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className={`badge ${settings.hubtel_active ? 'badge-success' : 'badge-neutral'}`} style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '20px' }}>
                    {settings.hubtel_active ? 'Active' : 'Disabled'}
                  </span>
                  <label className="switch">
                    <input type="checkbox" name="hubtel_active" checked={settings.hubtel_active} onChange={handleChange} />
                    <span className="slider round"></span>
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 500 }}>Client ID / Account Number</label>
                  <input type="text" name="hubtel_client_id" className="form-control" value={settings.hubtel_client_id} onChange={handleChange} placeholder="Hubtel Client ID..." />
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="form-label" style={{ fontWeight: 500 }}>Client Secret / API Key</label>
                    <button type="button" onClick={() => toggleSecret('hubtel')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}>
                      {showSecrets.hubtel ? <EyeOff size={14} /> : <Eye size={14} />}
                      <span>{showSecrets.hubtel ? 'Hide' : 'Show'}</span>
                    </button>
                  </div>
                  <input type={showSecrets.hubtel ? 'text' : 'password'} name="hubtel_client_secret" className="form-control" value={settings.hubtel_client_secret} onChange={handleChange} placeholder="Hubtel Secret Key..." />
                </div>
              </div>
            </div>

            <div style={{ marginTop: '20px', paddingTop: '12px', borderTop: '1px solid var(--border)', fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={14} color="#10b981" />
              <span>Direct Mobile Money USSD prompt dispatch</span>
            </div>
          </div>

          {/* Flutterwave Card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderTop: '4px solid #f59e0b' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Zap size={22} color="#f59e0b" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Flutterwave</h3>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Pan-African Payments & Wire</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className={`badge ${settings.flutterwave_active ? 'badge-success' : 'badge-neutral'}`} style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '20px' }}>
                    {settings.flutterwave_active ? 'Active' : 'Disabled'}
                  </span>
                  <label className="switch">
                    <input type="checkbox" name="flutterwave_active" checked={settings.flutterwave_active} onChange={handleChange} />
                    <span className="slider round"></span>
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 500 }}>Flutterwave Public Key</label>
                  <input type="text" name="flutterwave_public_key" className="form-control" value={settings.flutterwave_public_key} onChange={handleChange} placeholder="FLWPUBK_TEST-..." />
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="form-label" style={{ fontWeight: 500 }}>Flutterwave Secret Key</label>
                    <button type="button" onClick={() => toggleSecret('flutterwave')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}>
                      {showSecrets.flutterwave ? <EyeOff size={14} /> : <Eye size={14} />}
                      <span>{showSecrets.flutterwave ? 'Hide' : 'Show'}</span>
                    </button>
                  </div>
                  <input type={showSecrets.flutterwave ? 'text' : 'password'} name="flutterwave_secret_key" className="form-control" value={settings.flutterwave_secret_key} onChange={handleChange} placeholder="FLWSECK_TEST-..." />
                </div>
              </div>
            </div>

            <div style={{ marginTop: '20px', paddingTop: '12px', borderTop: '1px solid var(--border)', fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={14} color="#10b981" />
              <span>International card & bank transfers</span>
            </div>
          </div>

        </div>

        {/* Global Action Bar */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Changes will take effect immediately for customer portal payments.
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving} style={{ minWidth: '160px', padding: '10px 20px' }}>
            {saving ? <div className="spinner" style={{width: '16px', height: '16px'}} /> : <Save size={18} />}
            <span style={{ fontSize: '14px', fontWeight: 600 }}>{saving ? 'Saving...' : 'Save Integrations'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}
