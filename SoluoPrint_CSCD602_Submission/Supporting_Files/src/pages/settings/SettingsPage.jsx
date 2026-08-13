import { useNavigate } from 'react-router-dom'
import { Building2, Users, Shield, CreditCard, Settings, Lock, MessageSquare, Database, ShieldCheck } from 'lucide-react'
import SEO from '../../components/ui/SEO'

const SETTINGS_TILES = [
  { icon: Building2, title: 'Company Profile', desc: 'Update your business information and branding', path: '/settings/company', color: '#eff6ff', iconColor: '#2563eb' },
  { icon: Users, title: 'User Management', desc: 'Manage your team members and access', path: '/settings/users', color: '#dcfce7', iconColor: '#22c55e' },
  { icon: Shield, title: 'Role Management', desc: 'Configure roles and permissions', path: '/settings/roles', color: '#fef3c7', iconColor: '#f59e0b' },
  { icon: ShieldCheck, title: 'Audit & Activity Logs', desc: 'View security, logins, and operational trail', path: '/settings/audit-logs', color: '#f0fdf4', iconColor: '#16a34a' },
  { icon: CreditCard, title: 'Billing & Subscription', desc: 'Manage your plan and billing information', path: '/settings/billing', color: '#fee2e2', iconColor: '#ef4444' },
  { icon: Settings, title: 'Preferences', desc: 'Customize your app experience', path: '/settings/preferences', color: '#f3e8ff', iconColor: '#7c3aed' },
  { icon: Lock, title: 'Security & Authentication', desc: 'Manage password and security settings', path: '/settings/security', color: '#ecfeff', iconColor: '#0891b2' },
  { icon: CreditCard, title: 'Payment Integrations', desc: 'Configure payment gateways (Paystack, Hubtel, etc)', path: '/settings/payments', color: '#f0f9ff', iconColor: '#0ea5e9' },
  { icon: MessageSquare, title: 'SMS Notifications', desc: 'Configure SMS alerts for customers', path: '/settings/sms', color: '#fff7ed', iconColor: '#ea580c' },
  { icon: Database, title: 'Data Backup', desc: 'Backup full database, import or export', path: '/settings/backup', color: '#f0fdf4', iconColor: '#16a34a' }
]

export default function SettingsPage() {
  const navigate = useNavigate()
  return (
    <div>
      <SEO title="Settings" description="Configure your shop profile, manage users, roles, audit logs, and system preferences." />
      <div className="page-header">
        <div><h1 className="page-title">Settings</h1><p className="page-subtitle">Manage your account and preferences</p></div>
      </div>
      <div className="settings-grid">
        {SETTINGS_TILES.map(tile => (
          <div key={tile.path} className="settings-tile" onClick={() => navigate(tile.path)}>
            <div className="settings-tile-icon" style={{background: tile.color}}>
              <tile.icon size={22} color={tile.iconColor} />
            </div>
            <div className="settings-tile-title">{tile.title}</div>
            <div className="settings-tile-desc">{tile.desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
