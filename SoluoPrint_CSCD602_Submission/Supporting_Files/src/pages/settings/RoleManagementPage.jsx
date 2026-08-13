import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { supabase } from '../../lib/supabase'
import { ArrowLeft, Shield, Plus, X, Check, Trash2 } from 'lucide-react'

const PERMISSIONS = [
  // Core views
  'view_dashboard',
  'view_customers', 'manage_customers', 'add_customers',
  'view_jobs', 'manage_jobs', 'add_jobs',
  'view_payments', 'manage_payments', 'add_payments',
  'view_expenses', 'manage_expenses',
  'view_reports',
  // Communication & Support
  'view_chat', 'manage_chat',
  // Administration
  'manage_settings', 'manage_users', 'manage_integrations'
]

export default function RoleManagementPage() {
  const navigate = useNavigate()
  const { company } = useAuth()
  const { showToast } = useToast()
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newRoleName, setNewRoleName] = useState('')

  useEffect(() => { if (company) load() }, [company])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('roles').select('*').eq('company_id', company.id)
    if (data && data.length === 0) {
      // Create default roles with expanded permissions
      const defaultRoles = [
        { company_id: company.id, name: 'Owner', is_default: true, permissions: { all: true } },
        { company_id: company.id, name: 'Manager', permissions: {
          view_dashboard:true, view_customers:true, manage_customers:true, add_customers:true,
          view_jobs:true, manage_jobs:true, add_jobs:true,
          view_payments:true, manage_payments:true, add_payments:true,
          view_expenses:true, manage_expenses:true,
          view_reports:true,
          view_chat:true, manage_chat:true,
          manage_users:true
        }},
        { company_id: company.id, name: 'Staff', permissions: {
          view_dashboard:true, view_customers:true, add_customers:true,
          view_jobs:true, manage_jobs:true, add_jobs:true,
          view_payments:true, add_payments:true,
          view_chat:true
        }},
        { company_id: company.id, name: 'Viewer', permissions: {
          view_dashboard:true, view_customers:true, view_jobs:true, view_payments:true, view_chat:true
        }}
      ]
      await supabase.from('roles').insert(defaultRoles)
      const { data: d2 } = await supabase.from('roles').select('*').eq('company_id', company.id)
      setRoles(d2 || [])
    } else {
      setRoles(data || [])
    }
    setLoading(false)
  }

  async function togglePermission(role, perm) {
    if (role.is_default && role.name === 'Owner') return
    
    const newPermissions = { ...(role.permissions || {}) }
    newPermissions[perm] = !newPermissions[perm]
    
    const { error } = await supabase
      .from('roles')
      .update({ permissions: newPermissions })
      .eq('id', role.id)
    
    if (error) showToast('Failed to update permission: ' + error.message, 'error')
    else {
      setRoles(roles.map(r => r.id === role.id ? { ...r, permissions: newPermissions } : r))
      showToast('Permission updated', 'success')
    }
  }

  async function handleAddRole(e) {
    e.preventDefault()
    if (!newRoleName) return

    const { data, error } = await supabase
      .from('roles')
      .insert([{ company_id: company.id, name: newRoleName, permissions: {} }])
      .select()
    
    if (error) showToast('Failed to create role: ' + error.message, 'error')
    else {
      showToast('Role created', 'success')
      setRoles([...roles, data[0]])
      setShowAddModal(false)
      setNewRoleName('')
    }
  }

  async function deleteRole(id) {
    if (!confirm('Are you sure you want to delete this role? Users assigned to it will lose their permissions.')) return
    const { error } = await supabase.from('roles').delete().eq('id', id)
    if (error) showToast('Failed to delete role: ' + error.message, 'error')
    else {
      showToast('Role deleted', 'success')
      setRoles(roles.filter(r => r.id !== id))
    }
  }

  // Group permissions for better visual organization
  const permissionGroups = {
    'Core': ['view_dashboard'],
    'Customers': ['view_customers', 'manage_customers', 'add_customers'],
    'Jobs': ['view_jobs', 'manage_jobs', 'add_jobs'],
    'Payments': ['view_payments', 'manage_payments', 'add_payments'],
    'Expenses': ['view_expenses', 'manage_expenses'],
    'Reports': ['view_reports'],
    'Communication': ['view_chat', 'manage_chat'],
    'Administration': ['manage_settings', 'manage_users', 'manage_integrations']
  }

  return (
    <div>
      <div className="page-header">
        <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/settings')}><ArrowLeft size={16}/> Back</button>
          <div><h1 className="page-title">Role Management</h1></div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={18} />
          <span>New Role</span>
        </button>
      </div>

      <div style={{display:'grid',gap:'16px'}}>
        {loading ? (
          <div style={{textAlign:'center',padding:'40px',color:'var(--text-muted)'}}>Loading roles...</div>
        ) : roles.map(role => (
          <div key={role.id} className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="card-title" style={{ margin: 0 }}><Shield size={16}/> {role.name}</div>
                {role.is_default && <span className="pill pill-blue">System</span>}
              </div>
              {!role.is_default && (
                <button className="btn btn-ghost btn-sm text-danger" onClick={() => deleteRole(role.id)}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            <div className="card-body">
              {role.permissions?.all ? (
                <div style={{color:'var(--success)',fontWeight:600, display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <Check size={18} /> Full Access to all features
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {Object.entries(permissionGroups).map(([groupName, perms]) => (
                    <div key={groupName}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>{groupName}</div>
                      <div style={{display:'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px'}}>
                        {perms.map(p => (
                          <div 
                            key={p} 
                            onClick={() => togglePermission(role, p)}
                            style={{
                              padding: '8px 12px',
                              borderRadius: '8px',
                              border: '1px solid var(--border)',
                              background: role.permissions?.[p] ? '#f0fdf4' : '#f8fafc',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              fontSize: '13px',
                              transition: 'all 0.2s'
                            }}
                          >
                            <div style={{
                              width: '18px',
                              height: '18px',
                              borderRadius: '4px',
                              border: '2px solid',
                              borderColor: role.permissions?.[p] ? '#16a34a' : '#cbd5e1',
                              background: role.permissions?.[p] ? '#16a34a' : 'white',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              {role.permissions?.[p] && <Check size={14} color="white" />}
                            </div>
                            <span style={{ color: role.permissions?.[p] ? '#166534' : 'var(--text-muted)', fontWeight: role.permissions?.[p] ? 600 : 400 }}>
                              {p.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal modal-sm">
            <div className="modal-header">
              <h2 className="modal-title">Create New Role</h2>
              <button className="close-btn" onClick={() => setShowAddModal(false)}><X /></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleAddRole}>
                <div className="form-group">
                  <label className="form-label">Role Name</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={newRoleName} 
                    onChange={e => setNewRoleName(e.target.value)} 
                    placeholder="e.g. Sales Representative" 
                    required 
                    autoFocus
                  />
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                  You can configure granular permissions for this role once it's created.
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button type="button" className="btn btn-secondary flex-1" onClick={() => setShowAddModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary flex-1">Create Role</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
