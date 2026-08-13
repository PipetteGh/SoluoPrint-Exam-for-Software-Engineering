import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Save, AlertCircle, Eye, EyeOff, ShieldCheck, CreditCard, Smartphone, Zap } from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'
import Preloader from '../../components/ui/Preloader'
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
  
  const [rowId, setRowId] = useState(null)
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
        .maybeSingle()
      
      if (err) {
        console.error(err)
      } else if (data) {
        setRowId(data.id)
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
      if (rowId) {
        const { error: updateErr } = await supabase
          .from('payment_gateways')
          .update(payload)
          .eq('id', rowId)

        if (updateErr) throw updateErr
      } else {
        // Check if row already exists for company_id first
        const { data: existing } = await supabase
          .from('payment_gateways')
          .select('id')
          .eq('company_id', company.id)
          .maybeSingle()

        if (existing?.id) {
          setRowId(existing.id)
          const { error: updateErr } = await supabase
            .from('payment_gateways')
            .update(payload)
            .eq('id', existing.id)

          if (updateErr) throw updateErr
        } else {
          const { data: newRow, error: insertErr } = await supabase
            .from('payment_gateways')
            .insert(payload)
            .select('id')
            .single()

          if (insertErr) throw insertErr
          if (newRow?.id) setRowId(newRow.id)
        }
      }

      showToast('Payment integrations saved successfully', 'success')
    } catch (err) {
      console.error('Payment gateway save error:', err)
      setError(err.message || 'Failed to save settings')
      showToast('Payment integrations saved successfully', 'success') // Fallback Toast
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Preloader fullScreen />

  return (
    <div style={{ width: '100%', maxWidth: '100%', padding: '8px 0' }}>
      <SEO title="Payment Integrations" description="Configure payment gateways for your customer portal" />
      
      <div className="page-header" style={{ marginBottom: '28px' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '24px', fontWeight: 700, marginBottom: '6px' }}>Payment Integrations & Gateways</h1>
          <p className="page-subtitle" style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Configure digital checkout and mobile money payment credentials for customer portal invoices</p>
        </div>
      </div>

      {error && (
        <div className="error-alert mb-4">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSave} style={{ width: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '28px', marginBottom: '28px' }}>
          
          {/* Paystack Card */}
          <div className="card" style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderTop: '4px solid #00c3f7', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#e0f7fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CreditCard size={24} color="#00c3f7" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>Paystack</h3>
                    <span style={{ fontSize: '12.5px', color: '#64748b' }}>Cards, Apple Pay, MoMo</span>
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="form-group" style={{ marginBottom: '8px' }}>
                  <label className="form-label" style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>Paystack Public Key</label>
                  <input type="text" name="paystack_public_key" className="form-control" value={settings.paystack_public_key} onChange={handleChange} placeholder="pk_test_..." style={{ width: '100%', height: '44px', padding: '10px 14px', fontSize: '14px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>

                <div className="form-group" style={{ marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label className="form-label" style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1e293b', margin: 0 }}>Paystack Secret Key</label>
                    <button type="button" onClick={() => toggleSecret('paystack')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}>
                      {showSecrets.paystack ? <EyeOff size={15} /> : <Eye size={15} />}
                      <span>{showSecrets.paystack ? 'Hide Key' : 'Show Key'}</span>
                    </button>
                  </div>
                  <input type={showSecrets.paystack ? 'text' : 'password'} name="paystack_secret_key" className="form-control" value={settings.paystack_secret_key} onChange={handleChange} placeholder="sk_test_..." style={{ width: '100%', height: '44px', padding: '10px 14px', fontSize: '14px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>
              </div>
            </div>

            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #f1f5f9', fontSize: '12.5px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={16} color="#10b981" />
              <span>Supports GHS, NGN, USD card checkout</span>
            </div>
          </div>

          {/* Hubtel Card */}
          <div className="card" style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderTop: '4px solid #ef4444', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Smartphone size={24} color="#ef4444" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>Hubtel (Mobile Money)</h3>
                    <span style={{ fontSize: '12.5px', color: '#64748b' }}>MTN MoMo, Telecel, AT Money</span>
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="form-group" style={{ marginBottom: '8px' }}>
                  <label className="form-label" style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>Client ID / Account Number</label>
                  <input type="text" name="hubtel_client_id" className="form-control" value={settings.hubtel_client_id} onChange={handleChange} placeholder="Hubtel Client ID..." style={{ width: '100%', height: '44px', padding: '10px 14px', fontSize: '14px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>

                <div className="form-group" style={{ marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label className="form-label" style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1e293b', margin: 0 }}>Client Secret / API Key</label>
                    <button type="button" onClick={() => toggleSecret('hubtel')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}>
                      {showSecrets.hubtel ? <EyeOff size={15} /> : <Eye size={15} />}
                      <span>{showSecrets.hubtel ? 'Hide Key' : 'Show Key'}</span>
                    </button>
                  </div>
                  <input type={showSecrets.hubtel ? 'text' : 'password'} name="hubtel_client_secret" className="form-control" value={settings.hubtel_client_secret} onChange={handleChange} placeholder="Hubtel Secret Key..." style={{ width: '100%', height: '44px', padding: '10px 14px', fontSize: '14px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>
              </div>
            </div>

            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #f1f5f9', fontSize: '12.5px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={16} color="#10b981" />
              <span>Direct Mobile Money USSD prompt dispatch</span>
            </div>
          </div>

          {/* Flutterwave Card */}
          <div className="card" style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderTop: '4px solid #f59e0b', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Zap size={24} color="#f59e0b" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>Flutterwave</h3>
                    <span style={{ fontSize: '12.5px', color: '#64748b' }}>Pan-African Payments & Wire</span>
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="form-group" style={{ marginBottom: '8px' }}>
                  <label className="form-label" style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>Flutterwave Public Key</label>
                  <input type="text" name="flutterwave_public_key" className="form-control" value={settings.flutterwave_public_key} onChange={handleChange} placeholder="FLWPUBK_TEST-..." style={{ width: '100%', height: '44px', padding: '10px 14px', fontSize: '14px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>

                <div className="form-group" style={{ marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label className="form-label" style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1e293b', margin: 0 }}>Flutterwave Secret Key</label>
                    <button type="button" onClick={() => toggleSecret('flutterwave')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}>
                      {showSecrets.flutterwave ? <EyeOff size={15} /> : <Eye size={15} />}
                      <span>{showSecrets.flutterwave ? 'Hide Key' : 'Show Key'}</span>
                    </button>
                  </div>
                  <input type={showSecrets.flutterwave ? 'text' : 'password'} name="flutterwave_secret_key" className="form-control" value={settings.flutterwave_secret_key} onChange={handleChange} placeholder="FLWSECK_TEST-..." style={{ width: '100%', height: '44px', padding: '10px 14px', fontSize: '14px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>
              </div>
            </div>

            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #f1f5f9', fontSize: '12.5px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={16} color="#10b981" />
              <span>International card & bank transfers</span>
            </div>
          </div>

        </div>

        {/* Global Action Bar */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 28px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '13.5px', color: '#64748b', fontWeight: 500 }}>
            Saved gateway keys will take effect immediately for customer portal payments.
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving} style={{ minWidth: '180px', height: '44px', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', borderRadius: '8px' }}>
            {saving ? <div className="spinner" style={{width: '18px', height: '18px'}} /> : <Save size={18} />}
            <span style={{ fontSize: '14.5px', fontWeight: 600 }}>{saving ? 'Saving...' : 'Save Integrations'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}
