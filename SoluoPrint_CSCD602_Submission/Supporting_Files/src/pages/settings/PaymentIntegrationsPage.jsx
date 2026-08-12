import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Save, AlertCircle } from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'
import SEO from '../../components/ui/SEO'

export default function PaymentIntegrationsPage() {
  const { company } = useAuth()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  
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
      
      // PGRST116 means no rows found (which is fine, we just insert later)
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
      // Upsert logic (need to check if row exists first since we don't have ON CONFLICT on company_id unless it's a unique constraint, which it is primary key here)
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
    <div>
      <SEO title="Payment Integrations" description="Configure payment gateways for your customer portal" />
      
      <div className="page-header">
        <div>
          <h1 className="page-title">Payment Integrations</h1>
          <p className="page-subtitle">Configure gateways to accept payments from customers via their portal</p>
        </div>
      </div>

      {error && (
        <div className="error-alert mb-4">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="card" style={{ maxWidth: '800px' }}>
        
        {/* Paystack */}
        <div style={{ marginBottom: '32px', paddingBottom: '32px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Paystack</h3>
            <label className="switch">
              <input type="checkbox" name="paystack_active" checked={settings.paystack_active} onChange={handleChange} />
              <span className="slider round"></span>
            </label>
          </div>
          
          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Public Key</label>
              <input type="text" name="paystack_public_key" className="form-control" value={settings.paystack_public_key} onChange={handleChange} placeholder="pk_test_..." />
            </div>
            <div className="form-group">
              <label className="form-label">Secret Key</label>
              <input type="password" name="paystack_secret_key" className="form-control" value={settings.paystack_secret_key} onChange={handleChange} placeholder="sk_test_..." />
            </div>
          </div>
        </div>

        {/* Hubtel */}
        <div style={{ marginBottom: '32px', paddingBottom: '32px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Hubtel (Mobile Money)</h3>
            <label className="switch">
              <input type="checkbox" name="hubtel_active" checked={settings.hubtel_active} onChange={handleChange} />
              <span className="slider round"></span>
            </label>
          </div>
          
          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Client ID / Account Number</label>
              <input type="text" name="hubtel_client_id" className="form-control" value={settings.hubtel_client_id} onChange={handleChange} placeholder="..." />
            </div>
            <div className="form-group">
              <label className="form-label">Client Secret / API Key</label>
              <input type="password" name="hubtel_client_secret" className="form-control" value={settings.hubtel_client_secret} onChange={handleChange} placeholder="..." />
            </div>
          </div>
        </div>

        {/* Flutterwave */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Flutterwave</h3>
            <label className="switch">
              <input type="checkbox" name="flutterwave_active" checked={settings.flutterwave_active} onChange={handleChange} />
              <span className="slider round"></span>
            </label>
          </div>
          
          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Public Key</label>
              <input type="text" name="flutterwave_public_key" className="form-control" value={settings.flutterwave_public_key} onChange={handleChange} placeholder="FLWPUBK_TEST-..." />
            </div>
            <div className="form-group">
              <label className="form-label">Secret Key</label>
              <input type="password" name="flutterwave_secret_key" className="form-control" value={settings.flutterwave_secret_key} onChange={handleChange} placeholder="FLWSECK_TEST-..." />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <div className="spinner" style={{width: '16px', height: '16px'}} /> : <Save size={16} />}
            <span>{saving ? 'Saving...' : 'Save Integrations'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}
