import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { ArrowLeft, MessageSquare } from 'lucide-react'

const SMS_PROVIDERS = [
  { value: 'hubtel', label: 'Hubtel', desc: 'Uses GET request with query params' },
  { value: 'smsonline', label: 'SMSOnline Ghana', desc: 'Uses POST JSON with API key auth' },
  { value: 'twilio', label: 'Twilio', desc: 'Twilio SMS API' }
]

export default function SmsNotificationsPage() {
  const { company } = useAuth()
  const navigate = useNavigate()
  const [settings, setSettings] = useState({ 
    payment_received: true, payment_reminder: false, job_completed: true, job_overdue: false, customer_welcome: true, job_created: true,
    provider: 'hubtel', api_key: 'fsmsxskq', api_secret: 'yplqzzpq', sender_id: 'Alert4DAA', 
    api_url: 'https://smsc.hubtel.com/v1/messages/send'
  })
  const [settingsId, setSettingsId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)

  useEffect(() => { if (company) load() }, [company])

  async function load() {
    const { data } = await supabase.from('sms_settings').select('*').eq('company_id', company.id).single()
    if (data) { 
      setSettings({ 
        payment_received: data.payment_received || false, 
        payment_reminder: data.payment_reminder || false, 
        job_completed: data.job_completed || false, 
        job_overdue: data.job_overdue || false,
        job_created: data.job_created !== false,
        customer_welcome: data.customer_welcome !== false,
        provider: data.provider || 'hubtel',
        api_key: data.api_key || '',
        api_secret: data.api_secret || '',
        sender_id: data.sender_id || '',
        api_url: data.api_url || 'https://smsc.hubtel.com/v1/messages/send'
      })
      setSettingsId(data.id) 
    }
    setLoading(false)
  }

  function toggle(key) {
    setSettings(s => ({ ...s, [key]: !s[key] }))
  }

  function handleChange(e) {
    setSettings(s => ({ ...s, [e.target.name]: e.target.value }))
  }

  function handleProviderChange(e) {
    const newProvider = e.target.value
    let defaults = {}
    if (newProvider === 'hubtel') {
      defaults = { api_url: 'https://smsc.hubtel.com/v1/messages/send', api_key: '', api_secret: '', sender_id: '' }
    } else if (newProvider === 'smsonline') {
      defaults = { api_url: 'https://api.smsonlinegh.com/v5/sms/send', api_key: '', api_secret: '', sender_id: '' }
    } else {
      defaults = { api_url: '', api_key: '', api_secret: '', sender_id: '' }
    }
    setSettings(s => ({ ...s, provider: newProvider, ...defaults }))
  }

  async function save() {
    if (settingsId) {
      await supabase.from('sms_settings').update(settings).eq('id', settingsId)
    } else {
      const { data } = await supabase.from('sms_settings').insert({ ...settings, company_id: company.id }).select().single()
      setSettingsId(data?.id)
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const SMStoggles = [
    { key: 'customer_welcome', label: 'Customer Welcome', desc: 'Send a welcome SMS when creating a new customer' },
    { key: 'job_created', label: 'Job Created', desc: 'Notify customer when a new print job is recorded' },
    { key: 'payment_received', label: 'Payment Received', desc: 'Notify customer when payment is recorded' },
    { key: 'job_completed', label: 'Job Completed', desc: 'Notify customer when their job is marked as Completed' },
    { key: 'payment_reminder', label: 'Payment Reminder', desc: 'Send reminder for outstanding balances' },
    { key: 'job_overdue', label: 'Job Overdue', desc: 'Alert customer if job is past due date' }
  ]

  // Dynamic labels based on provider
  const providerLabels = {
    hubtel: {
      title: 'Hubtel API Config',
      apiKey: 'Hubtel Client ID',
      apiSecret: 'Hubtel Client Secret',
      apiUrl: 'Hubtel API URL',
      showSecret: true
    },
    smsonline: {
      title: 'SMSOnline Ghana Config',
      apiKey: 'API Key (Authorization Key)',
      apiSecret: '',
      apiUrl: 'API URL',
      showSecret: false
    },
    twilio: {
      title: 'Twilio API Config',
      apiKey: 'Account SID',
      apiSecret: 'Auth Token',
      apiUrl: 'API URL',
      showSecret: true
    }
  }

  const labels = providerLabels[settings.provider] || providerLabels.hubtel

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn btn-ghost btn-sm" style={{ padding: '8px' }} onClick={() => navigate('/settings')}><ArrowLeft size={18}/> Back</button>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>SMS Settings & Notifications</h1>
        </div>
        <button className="btn btn-primary" onClick={save} style={{ padding: '10px 24px' }}>Save All Settings</button>
      </div>

      {saved && <div style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#166534', padding: '12px 16px', borderRadius: '10px', marginBottom: '24px', fontSize: '14px', fontWeight: 500 }}>✓ Your SMS configuration has been updated successfully!</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
            <MessageSquare size={20} color="var(--primary)" />
            <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>{labels.title}</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">SMS Provider</label>
              <select name="provider" className="form-control" value={settings.provider} onChange={handleProviderChange}>
                {SMS_PROVIDERS.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                {SMS_PROVIDERS.find(p => p.value === settings.provider)?.desc}
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Sender ID (From)</label>
              <input name="sender_id" className="form-control" placeholder={settings.provider === 'smsonline' ? 'e.g. EKONGraphix' : 'e.g. Alert4DAA'} value={settings.sender_id} onChange={handleChange} maxLength={11} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">{labels.apiUrl}</label>
              <input name="api_url" className="form-control" placeholder="https://..." value={settings.api_url} onChange={handleChange} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">{labels.apiKey}</label>
              <input name="api_key" className="form-control" placeholder="Enter key" value={settings.api_key} onChange={handleChange} />
              {settings.provider === 'smsonline' && (
                <div style={{ fontSize: '11px', color: '#f59e0b', marginTop: '4px' }}>
                  This is the authorization key from your SMSOnlineGH dashboard
                </div>
              )}
            </div>
            {labels.showSecret && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">{labels.apiSecret}</label>
                <input type="password" name="api_secret" className="form-control" placeholder="••••••••" value={settings.api_secret} onChange={handleChange} />
              </div>
            )}
          </div>
        </div>

        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
            <MessageSquare size={20} color="#10b981" />
            <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Notification Toggles</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {SMStoggles.map(t => (
              <div key={t.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                <div style={{ flex: 1, marginRight: '16px' }}>
                  <div style={{ fontWeight: 600, fontSize: '14px', color: '#1e293b' }}>{t.label}</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{t.desc}</div>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" checked={settings[t.key]} onChange={() => toggle(t.key)} />
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
