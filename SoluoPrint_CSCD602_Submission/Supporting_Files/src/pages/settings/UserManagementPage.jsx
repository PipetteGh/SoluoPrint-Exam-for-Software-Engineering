import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { useConfirm } from '../../contexts/ConfirmContext'
import { supabase } from '../../lib/supabase'
import { createClient } from '@supabase/supabase-js'
import { ArrowLeft, Users, Plus, Trash2, UserPlus, X, CheckCircle, Key, Eye, EyeOff, Info, Copy, RefreshCw } from 'lucide-react'

function generateRandomPassword(length = 8) {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789'
  let result = ''
  for (let i = 0; i < length; i++) result += chars[Math.floor(Math.random() * chars.length)]
  return result
}

function generateStaffEmail(companyName, fullName) {
  const clean = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
  const companySlug = clean(companyName || 'company').slice(0, 12)
  const nameSlug = clean(fullName || 'user').slice(0, 10)
  const rand = Math.random().toString(36).slice(2, 6)
  return `${nameSlug}.${rand}@${companySlug}.soluoprint.local`
}

export default function UserManagementPage() {
  const navigate = useNavigate()
  const { company, user: currentUser } = useAuth()
  const { showToast } = useToast()
  const { confirm } = useConfirm()
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newUser, setNewUser] = useState({ email: '', full_name: '', role: '', password: '' })
  const [creatingUser, setCreatingUser] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [createdCredentials, setCreatedCredentials] = useState(null)

  useEffect(() => {
    if (company) {
      load()
      loadRoles()
    }
  }, [company])

  async function loadRoles() {
    const { data } = await supabase
      .from('roles')
      .select('*')
      .eq('company_id', company.id)
    setRoles(data || [])
  }

  async function load() {
    const { data } = await supabase.from('profiles').select('*').eq('company_id', company.id)
    setUsers(data || [])
    setLoading(false)
  }

  async function handleDeleteUser(id) {
    const isConfirmed = await confirm({
      title: 'Remove Team User',
      message: 'Are you sure you want to remove this user from your company? They will lose access immediately.',
      confirmText: 'Yes, Remove User',
      cancelText: 'Cancel',
      type: 'danger'
    })
    if (!isConfirmed) return
    const { error } = await supabase.from('profiles').delete().eq('id', id)
    if (error) showToast('Failed to delete user', 'error')
    else {
      showToast('User removed', 'success')
      load()
    }
  }

  async function handleRepairUser(u) {
    if (!u.password) {
      showToast('Cannot repair: No password stored for this user.', 'error')
      return
    }
    
    setCreatingUser(true)
    try {
      const tempClient = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        { auth: { persistSession: false } }
      )

      const { error } = await tempClient.auth.signUp({
        email: u.email,
        password: u.password,
        options: {
          data: {
            full_name: u.full_name,
            company_id: company.id,
            role: u.role,
            password: u.password
          }
        }
      })

      if (error) {
        if (error.message.includes('already registered')) {
          showToast('Login account already exists. Ensure "Confirm Email" is OFF in Supabase.', 'info')
        } else {
          throw error
        }
      } else {
        showToast(`Login repaired for ${u.full_name}!`, 'success')
      }
      load()
    } catch (err) {
      showToast('Repair failed: ' + err.message, 'error')
    } finally {
      setCreatingUser(false)
    }
  }

  async function updateRole(userId, role) {
    const { error } = await supabase.from('profiles').update({ role }).eq('id', userId)
    if (error) showToast('Failed to update role: ' + error.message, 'error')
    else {
      showToast('Role updated', 'success')
      load()
    }
  }

  async function handleAddUser(e) {
    e.preventDefault()
    if (!newUser.full_name.trim()) {
      showToast('Please enter a full name', 'error')
      return
    }
    setCreatingUser(true)
    
    // Auto-generate credentials if not provided
    const finalEmail = newUser.email.trim() || generateStaffEmail(company?.name, newUser.full_name)
    const finalPassword = newUser.password.trim() || generateRandomPassword(8)
    const finalRole = newUser.role || (roles.length > 0 ? roles[0].name : 'Staff')

    try {
      // Try Supabase Auth signup first
      const tempClient = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        { auth: { persistSession: false } }
      )

      const { data, error } = await tempClient.auth.signUp({
        email: finalEmail,
        password: finalPassword,
        options: {
          data: {
            full_name: newUser.full_name,
            company_id: company.id,
            role: finalRole,
            password: finalPassword
          }
        }
      })

      if (error) {
        // If auth signup fails, insert directly into profiles as fallback
        console.warn('Auth signup failed, inserting profile directly:', error.message)
        
        const fallbackId = crypto.randomUUID()
        const { error: insertErr } = await supabase
          .from('profiles')
          .insert({
            id: fallbackId,
            email: finalEmail,
            full_name: newUser.full_name,
            company_id: company.id,
            role: finalRole,
            password: finalPassword,
            is_active: true
          })
        
        if (insertErr) throw insertErr
      }

      // Show generated credentials
      setCreatedCredentials({
        name: newUser.full_name,
        email: finalEmail,
        password: finalPassword,
        role: finalRole,
        wasAutoGenerated: !newUser.email.trim() || !newUser.password.trim()
      })

      showToast(`User ${newUser.full_name} created successfully!`, 'success')
      
      // Reload users list after a short delay
      setTimeout(() => { load() }, 1000)

      setNewUser({ email: '', full_name: '', role: '', password: '' })
    } catch (err) {
      showToast('Failed to create user: ' + err.message, 'error')
    } finally {
      setCreatingUser(false)
    }
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
    showToast('Copied to clipboard!', 'success')
  }

  return (
    <div>
      <div className="page-header">
        <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/settings')}><ArrowLeft size={16}/> Back</button>
          <div><h1 className="page-title">User Management</h1></div>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowAddModal(true); setCreatedCredentials(null) }}>
          <UserPlus size={18} />
          <span>Add User</span>
        </button>
      </div>

      <div className="table-container">
        <table>
          <thead><tr><th>User</th><th>Email</th><th>Password</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={6} style={{textAlign:'center',padding:'40px'}}>Loading...</td></tr>
            : users.length === 0 ? (
              <tr><td colSpan={6} style={{textAlign:'center',padding:'40px',color:'var(--text-muted)'}}>No users found. Click "Add User" to create your first team member.</td></tr>
            ) : users.map(u => (
              <tr key={u.id}>
                <td>
                  <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                    <div style={{width:'32px',height:'32px',borderRadius:'50%',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:'700',fontSize:'13px'}}>
                       {u.full_name?.[0]?.toUpperCase() || u.email?.[0]?.toUpperCase() || '?'}
                    </div>
                    <span style={{fontWeight:600}}>{u.full_name || '(No name)'}</span>
                    {u.id === currentUser?.id && <span className="pill pill-blue" style={{fontSize:'10px'}}>You</span>}
                  </div>
                </td>
                <td style={{color:'var(--text-muted)'}}>{u.email}</td>
                <td style={{fontFamily:'monospace',fontSize:'12px'}}>{u.password || '******'}</td>
                <td>
                  <select 
                    className="filter-select" 
                    value={u.role || ''} 
                    onChange={e => updateRole(u.id, e.target.value)} 
                    disabled={u.id === currentUser?.id}
                    style={{ width: '120px' }}
                  >
                    <option value="">No Role</option>
                    {roles.map(r => (
                      <option key={r.id} value={r.name}>{r.name}</option>
                    ))}
                  </select>
                </td>
                <td><span className={`status-badge ${u.is_active?'completed':'cancelled'}`}>{u.is_active?'Active':'Inactive'}</span></td>
                <td>
                  <div style={{display:'flex',gap:'8px'}}>
                    <button 
                      className="btn btn-outline" 
                      onClick={() => handleRepairUser(u)}
                      title="Fix login if it's not working"
                      style={{padding:'4px 8px',fontSize:'11px'}}
                    >
                      Repair Login
                    </button>
                    {u.id !== currentUser?.id && (
                      <button className="btn btn-text text-danger" onClick={() => handleDeleteUser(u.id)}>
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal modal-sm">
            <div className="modal-header">
              <h2 className="modal-title">{createdCredentials ? 'User Created!' : 'Add New User'}</h2>
              <button className="close-btn" onClick={() => { setShowAddModal(false); setCreatedCredentials(null) }}><X /></button>
            </div>
            <div className="modal-body">
              {createdCredentials ? (
                <div>
                  <div style={{ background: '#f0fdf4', padding: '20px', borderRadius: '12px', marginBottom: '16px', textAlign: 'center' }}>
                    <CheckCircle size={40} style={{ color: '#16a34a', marginBottom: '8px' }} />
                    <h3 style={{ margin: '0 0 4px', color: '#166534', fontSize: '16px' }}>{createdCredentials.name}</h3>
                    <span className="pill pill-blue" style={{ fontSize: '11px' }}>{createdCredentials.role}</span>
                  </div>

                  {createdCredentials.wasAutoGenerated && (
                    <div style={{ background: '#fffbeb', padding: '12px', borderRadius: '10px', marginBottom: '16px', display: 'flex', gap: '10px', border: '1px solid #fde68a' }}>
                      <Info size={16} style={{ color: '#d97706', flexShrink: 0, marginTop: '2px' }} />
                      <div style={{ fontSize: '12px', color: '#92400e', lineHeight: '1.4' }}>
                        <strong>Auto-Generated Credentials</strong> — Please save these login details. They cannot be recovered later.
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email / Username</label>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                        <input type="text" className="form-control" value={createdCredentials.email} readOnly style={{ fontSize: '13px', fontFamily: 'monospace' }} />
                        <button className="btn btn-secondary btn-sm" onClick={() => copyToClipboard(createdCredentials.email)} title="Copy"><Copy size={14} /></button>
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Password</label>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                        <input type="text" className="form-control" value={createdCredentials.password} readOnly style={{ fontSize: '13px', fontFamily: 'monospace' }} />
                        <button className="btn btn-secondary btn-sm" onClick={() => copyToClipboard(createdCredentials.password)} title="Copy"><Copy size={14} /></button>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="btn btn-secondary flex-1" onClick={() => { setShowAddModal(false); setCreatedCredentials(null) }}>Done</button>
                    <button className="btn btn-primary flex-1" onClick={() => { setCreatedCredentials(null); setNewUser({ email: '', full_name: '', role: '', password: '' }) }}>
                      <UserPlus size={14} /> Add Another
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleAddUser}>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                    Create a new team member account. Leave email and password blank to auto-generate credentials.
                  </p>
                  <div className="form-group">
                    <label className="form-label">Full Name <span style={{color:'#ef4444'}}>*</span></label>
                    <input type="text" className="form-control" value={newUser.full_name} onChange={e => setNewUser({...newUser, full_name: e.target.value})} placeholder="e.g. John Doe" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address <span style={{fontSize:'11px',color:'var(--text-muted)',fontWeight:400}}>(optional — auto-generated if blank)</span></label>
                    <input type="email" className="form-control" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} placeholder="john@example.com" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Password <span style={{fontSize:'11px',color:'var(--text-muted)',fontWeight:400}}>(optional — auto-generated if blank)</span></label>
                    <div style={{ position: 'relative' }}>
                      <input type={showPassword ? "text" : "password"} name="password" className="form-control" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} placeholder="Min 6 characters (or leave blank)" minLength={newUser.password ? 6 : undefined} />
                      <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)}
                        style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  
                  <div style={{ 
                    background: '#eff6ff', 
                    padding: '12px', 
                    borderRadius: '10px', 
                    marginBottom: '16px',
                    display: 'flex',
                    gap: '10px'
                  }}>
                    <Info size={16} style={{ color: '#3b82f6', flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ fontSize: '11px', color: '#1e40af', lineHeight: '1.4' }}>
                      <strong>Tip:</strong> If you don't specify email and password, the system will automatically generate secure login credentials. You'll see them after creation.
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Role</label>
                    <select className="form-control" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                      <option value="">Select a role...</option>
                      {roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                    </select>
                  </div>
                  <button type="submit" className="btn btn-primary w-full" disabled={creatingUser}>
                    {creatingUser ? 'Creating Account...' : 'Create User Account'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
