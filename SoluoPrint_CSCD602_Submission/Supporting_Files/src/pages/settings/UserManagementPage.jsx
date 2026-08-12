import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { supabase } from '../../lib/supabase'
import { createClient } from '@supabase/supabase-js'
import { ArrowLeft, Users, Plus, Trash2, UserPlus, X, CheckCircle, Key, Eye, EyeOff, Info } from 'lucide-react'

export default function UserManagementPage() {
  const navigate = useNavigate()
  const { company, user: currentUser } = useAuth()
  const toast = useToast()
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newUser, setNewUser] = useState({ email: '', full_name: '', role: 'staff', password: '' })
  const [creatingUser, setCreatingUser] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [inviteLink, setInviteLink] = useState('')

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
    if (!window.confirm('Are you sure you want to remove this user?')) return
    const { error } = await supabase.from('profiles').delete().eq('id', id)
    if (error) toast.error('Failed to delete user')
    else {
      toast.success('User removed')
      load()
    }
  }

  async function handleRepairUser(u) {
    if (!u.password) {
      toast.error('Cannot repair: No password stored for this user.')
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
          toast.info('Login account already exists. Ensure "Confirm Email" is OFF in Supabase.')
        } else {
          throw error
        }
      } else {
        toast.success(`Login repaired for ${u.full_name}!`)
      }
      load()
    } catch (err) {
      toast.error('Repair failed: ' + err.message)
    } finally {
      setCreatingUser(false)
    }
  }

  async function updateRole(userId, role) {
    const { error } = await supabase.from('profiles').update({ role }).eq('id', userId)
    if (error) toast.error('Failed to update role: ' + error.message)
    else {
      toast.success('Role updated')
      load()
    }
  }

  function handleInvite() {
    const link = `${window.location.origin}/register?company_id=${company.id}&role=${newUser.role}`
    setInviteLink(link)
  }

  async function handleAddUser(e) {
    e.preventDefault()
    setCreatingUser(true)
    
    try {
      // We use a secondary client with NO PERSISTENCE to create the user 
      // without logging out the current admin
      const tempClient = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        { auth: { persistSession: false } }
      )

      const { data, error } = await tempClient.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          data: {
            full_name: newUser.full_name,
            company_id: company.id,
            role: newUser.role,
            password: newUser.password
          }
        }
      })

      if (error) throw error

      toast.success(`User ${newUser.full_name} created successfully!`)
      
      // Delay slightly to let the database trigger finish profile creation
      setTimeout(() => {
        load()
      }, 1000)

      setShowAddModal(false)
      setNewUser({ email: '', full_name: '', role: 'staff', password: '' })
    } catch (err) {
      toast.error('Failed to create user: ' + err.message)
    } finally {
      setCreatingUser(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/settings')}><ArrowLeft size={16}/> Back</button>
          <div><h1 className="page-title">User Management</h1></div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <UserPlus size={18} />
          <span>Add User</span>
        </button>
      </div>

      <div className="table-container">
        <table>
          <thead><tr><th>User</th><th>Email</th><th>Password</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={6} style={{textAlign:'center',padding:'40px'}}>Loading...</td></tr>
            : users.map(u => (
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
              <h2 className="modal-title">Invite New User</h2>
              <button className="close-btn" onClick={() => { setShowAddModal(false); setInviteLink(''); }}><X /></button>
            </div>
            <div className="modal-body">
              {!inviteLink ? (
                <form onSubmit={handleAddUser}>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                    Create a new team member account. They can login immediately with their email and password.
                  </p>
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input type="text" className="form-control" value={newUser.full_name} onChange={e => setNewUser({...newUser, full_name: e.target.value})} placeholder="e.g. John Doe" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input type="email" className="form-control" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} placeholder="john@example.com" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Password</label>
                    <div style={{ position: 'relative' }}>
                      <input type={showPassword ? "text" : "password"} name="password" className="form-control" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} placeholder="Min 6 characters" required minLength={6} />
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
                      <strong>Important:</strong> If users don't appear immediately or can't login, ensure <strong>"Confirm Email"</strong> is disabled in your <strong>Supabase Dashboard</strong> (Authentication &gt; Providers &gt; Email).
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Role</label>
                    <select className="form-control" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                      {roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                    </select>
                  </div>
                  <button type="submit" className="btn btn-primary w-full" disabled={creatingUser}>
                    {creatingUser ? 'Creating Account...' : 'Create User Account'}
                  </button>
                </form>
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ background: '#f0fdf4', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                    <CheckCircle className="text-success" size={40} style={{ margin: '0 auto 12px' }} />
                    <p style={{ fontWeight: 600, color: '#166534', margin: 0 }}>Invitation Link Ready</p>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>Send this link to {newUser.full_name}:</p>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                    <input type="text" className="form-control" value={inviteLink} readOnly />
                    <button className="btn btn-secondary" onClick={() => {
                      navigator.clipboard.writeText(inviteLink)
                      toast.success('Copied to clipboard!')
                    }}>Copy</button>
                  </div>
                  <button className="btn btn-secondary w-full" onClick={() => { setShowAddModal(false); setInviteLink(''); }}>Done</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
