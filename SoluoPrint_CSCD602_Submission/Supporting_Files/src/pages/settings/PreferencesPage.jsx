import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function PreferencesPage() {
  const navigate = useNavigate()
  return (
    <div>
      <div className="page-header">
        <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/settings')}><ArrowLeft size={16}/> Back</button>
          <div><h1 className="page-title">Preferences</h1></div>
        </div>
      </div>
      <div className="card" style={{maxWidth:'600px'}}>
        <div className="card-header"><div className="card-title">App Preferences</div></div>
        <div className="card-body">
          {[
            { label: 'Dark Mode', desc: 'Use dark color theme (coming soon)' },
            { label: 'Email Notifications', desc: 'Receive email alerts for important events' },
            { label: 'Auto-save Jobs', desc: 'Automatically save print jobs as drafts' },
            { label: 'Show Currency Symbol', desc: 'Display currency symbol in all amounts' },
            { label: 'Compact View', desc: 'Use a more compact layout in tables' }
          ].map((item, i) => (
            <div key={i} className="toggle-wrap">
              <div><div className="toggle-label">{item.label}</div><div className="toggle-desc">{item.desc}</div></div>
              <label className="toggle-switch">
                <input type="checkbox" defaultChecked={i < 3} />
                <span className="toggle-slider"></span>
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
