import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { useConfirm } from '../../contexts/ConfirmContext'
import { supabase } from '../../lib/supabase'
import { Plus, Edit, Trash2, Search, X, FolderOpen, TrendingDown, RefreshCcw, Activity, DollarSign, Receipt } from 'lucide-react'

// Modal for Expense Accounts
function ExpenseAccountModal({ account, company, onClose, onSuccess }) {
  const [form, setForm] = useState(account || { name: '', type: 'Direct', description: '', is_active: true })
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    let err
    if (account?.id) {
      ({ error: err } = await supabase.from('expense_accounts').update(form).eq('id', account.id))
    } else {
      ({ error: err } = await supabase.from('expense_accounts').insert({ ...form, company_id: company.id }))
    }
    setLoading(false)
    if (err) {
      toast.error('Failed to save account')
    } else {
      toast.success(account ? 'Account updated' : 'Account created')
      onSuccess?.(); onClose()
    }
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{account ? 'Edit' : 'New'} Expense Account</h2>
          <button className="modal-close" onClick={onClose}><X /></button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit} id="exp-acct-form">
            <div className="form-group">
              <label className="form-label">Account Name *</label>
              <input name="name" className="form-control" value={form.name} onChange={handleChange} required placeholder="e.g. Equipment, Rent, Materials" />
            </div>
            <div className="form-group">
              <label className="form-label">Account Type *</label>
              <select name="type" className="form-control" value={form.type} onChange={handleChange}>
                <option value="Direct">Direct - Materials, supplies directly used in services</option>
                <option value="Indirect">Indirect - Overhead, administrative expenses</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea name="description" className="form-control" value={form.description || ''} onChange={handleChange} rows={3} placeholder="Describe this account" />
            </div>
            <div className="toggle-wrap">
              <span style={{ fontWeight: 600 }}>Active</span>
              <label className="toggle-switch">
                <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </form>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" form="exp-acct-form" type="submit" disabled={loading}>{loading ? 'Saving...' : (account ? 'Save Changes' : 'Create Account')}</button>
        </div>
      </div>
    </div>
  )
}

// Modal for Cost Centers
function CostCenterModal({ center, company, onClose, onSuccess }) {
  const [form, setForm] = useState(center || { name: '', description: '', is_active: true })
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    let err
    if (center?.id) {
      ({ error: err } = await supabase.from('cost_centers').update(form).eq('id', center.id))
    } else {
      ({ error: err } = await supabase.from('cost_centers').insert({ ...form, company_id: company.id }))
    }
    setLoading(false)
    if (err) {
      toast.error('Failed to save cost center')
    } else {
      toast.success(center ? 'Cost center updated' : 'Cost center created')
      onSuccess?.(); onClose()
    }
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{center ? 'Edit' : 'New'} Cost Center</h2>
          <button className="modal-close" onClick={onClose}><X /></button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit} id="cc-form">
            <div className="form-group">
              <label className="form-label">Cost Center Name *</label>
              <input name="name" className="form-control" value={form.name} onChange={handleChange} required placeholder="e.g. Production, Admin, Sales" />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea name="description" className="form-control" value={form.description || ''} onChange={handleChange} rows={2} />
            </div>
            <div className="toggle-wrap">
              <span style={{ fontWeight: 600 }}>Active</span>
              <label className="toggle-switch">
                <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </form>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" form="cc-form" type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  )
}

export default function ExpenseAccountsPage() {
  const { company } = useAuth()
  const toast = useToast()
  const { confirm } = useConfirm()
  const [accounts, setAccounts] = useState([])
  const [costCenters, setCostCenters] = useState([])
  const [activeTab, setActiveTab] = useState('accounts') // 'accounts' or 'centers'
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAcctModal, setShowAcctModal] = useState(false)
  const [showCcModal, setShowCcModal] = useState(false)
  const [editItem, setEditItem] = useState(null)

  useEffect(() => { if (company) load() }, [company])

  async function load() {
    setLoading(true)
    const [{ data: accData }, { data: ccData }] = await Promise.all([
      supabase.from('expense_accounts').select('*').eq('company_id', company.id).order('name'),
      supabase.from('cost_centers').select('*').eq('company_id', company.id).order('name')
    ])
    setAccounts(accData || [])
    setCostCenters(ccData || [])
    setLoading(false)
  }

  async function deleteAccount(id) {
    const isConfirmed = await confirm({
      title: 'Delete Expense Account',
      message: 'Are you sure you want to delete this expense account?',
      confirmText: 'Yes, Delete Account',
      cancelText: 'Cancel',
      type: 'danger'
    })
    if (!isConfirmed) return
    const { error } = await supabase.from('expense_accounts').delete().eq('id', id)
    if (error) toast.error('Failed to delete account')
    else { toast.success('Account deleted'); load() }
  }

  async function deleteCenter(id) {
    const isConfirmed = await confirm({
      title: 'Delete Cost Center',
      message: 'Are you sure you want to delete this cost center?',
      confirmText: 'Yes, Delete Cost Center',
      cancelText: 'Cancel',
      type: 'danger'
    })
    if (!isConfirmed) return
    const { error } = await supabase.from('cost_centers').delete().eq('id', id)
    if (error) toast.error('Failed to delete center')
    else { toast.success('Cost center deleted'); load() }
  }

  // Filtered lists
  const filteredAccounts = accounts.filter(a => search ? a.name.toLowerCase().includes(search.toLowerCase()) : true)
  const filteredCenters = costCenters.filter(c => search ? c.name.toLowerCase().includes(search.toLowerCase()) : true)

  // Stats boxes
  const totalAcc = accounts.length
  const directAcc = accounts.filter(a => a.type === 'Direct').length
  const indirectAcc = accounts.filter(a => a.type === 'Indirect').length
  const totalCc = costCenters.length

  return (
    <div>
      {/* Top Stat Boxes matching original screenshot */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Total Accounts</span>
            <FolderOpen size={16} color="var(--text-muted)" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700 }}>{totalAcc}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Active accounts</div>
        </div>
        <div className="card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Direct Accounts</span>
            <Activity size={16} color="#2563eb" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700 }}>{directAcc}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Direct cost accounts</div>
        </div>
        <div className="card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Indirect Accounts</span>
            <TrendingDown size={16} color="#7c3aed" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700 }}>{indirectAcc}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Indirect cost accounts</div>
        </div>
        <div className="card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Cost Centers</span>
            <DollarSign size={16} color="#059669" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700 }}>{totalCc}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Active cost centers</div>
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h1 className="page-title">Expense Accounts & Cost Centers</h1>
        <p className="page-subtitle" style={{ marginTop: '4px' }}>Organize and track expense accounts and cost centers</p>
      </div>

      {/* Main Container */}
      <div className="card" style={{ padding: 0, borderRadius: '12px', overflow: 'hidden' }}>
        
        {/* Full width Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
          <button 
            style={{ flex: 1, padding: '16px', background: 'transparent', border: 'none', borderBottom: activeTab === 'accounts' ? '2px solid var(--primary)' : '2px solid transparent', cursor: 'pointer', fontWeight: 600, color: activeTab === 'accounts' ? 'var(--primary)' : 'var(--text-secondary)', transition: 'all 0.2s', fontSize: '14px' }}
            onClick={() => setActiveTab('accounts')}
          >
            Expense Accounts
          </button>
          <button 
            style={{ flex: 1, padding: '16px', background: 'transparent', border: 'none', borderBottom: activeTab === 'centers' ? '2px solid var(--primary)' : '2px solid transparent', cursor: 'pointer', fontWeight: 600, color: activeTab === 'centers' ? 'var(--primary)' : 'var(--text-secondary)', transition: 'all 0.2s', fontSize: '14px' }}
            onClick={() => setActiveTab('centers')}
          >
            Cost Centers
          </button>
        </div>

        {/* Tab Header (Search + New Button) */}
        <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>
            {activeTab === 'accounts' ? 'Expense Accounts' : 'Cost Centers'}
          </h2>
          <button className="btn btn-primary" onClick={() => { setEditItem(null); activeTab === 'accounts' ? setShowAcctModal(true) : setShowCcModal(true) }}>
            <Plus size={16} /> New {activeTab === 'accounts' ? 'Account' : 'Center'}
          </button>
        </div>

        {/* Search Bar Row */}
        <div style={{ padding: '0 24px 16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="form-control" style={{ paddingLeft: '36px', background: '#f8fafc' }} 
              placeholder={`Search ${activeTab === 'accounts' ? 'expense accounts' : 'cost centers'}...`} 
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="btn btn-secondary" onClick={load}><RefreshCcw size={16} /> Refresh</button>
        </div>

        {/* Table Content */}
        <div className="table-container" style={{ margin: 0, borderRadius: 0, border: 'none', borderTop: '1px solid var(--border)' }}>
          <table style={{ margin: 0 }}>
            <thead>
              {activeTab === 'accounts' ? (
                <tr>
                  <th style={{ paddingLeft: '24px' }}>Name</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Usage</th>
                  <th>Created</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              ) : (
                <tr>
                  <th style={{ paddingLeft: '24px' }}>Name</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              )}
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}>Loading...</td></tr>
              ) : activeTab === 'accounts' ? (
                filteredAccounts.length === 0 ? (
                  <tr><td colSpan={6}><div className="empty-state" style={{ padding: '40px' }}><FolderOpen /><h3>No accounts found</h3></div></td></tr>
                ) : filteredAccounts.map(a => (
                  <tr key={a.id}>
                    <td style={{ paddingLeft: '24px', fontWeight: 600, fontSize: '13px' }}>{a.name}</td>
                    <td>
                      <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '12px', fontWeight: 600, background: a.type === 'Direct' ? '#dbeafe' : '#f3e8ff', color: a.type === 'Direct' ? '#1e40af' : '#6b21a8' }}>
                        {a.type}
                      </span>
                    </td>
                    <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{a.description || '-'}</td>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>0 transactions</td>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(a.created_at).toLocaleDateString()}</td>
                    <td style={{ textAlign: 'center' }}>
                      <div className="action-btns" style={{ justifyContent: 'center' }}>
                        <button className="action-btn" onClick={() => { setEditItem(a); setShowAcctModal(true) }}><Edit size={14} /></button>
                        <button className="action-btn danger" onClick={() => deleteAccount(a.id)}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                filteredCenters.length === 0 ? (
                  <tr><td colSpan={5}><div className="empty-state" style={{ padding: '40px' }}><FolderOpen /><h3>No cost centers found</h3></div></td></tr>
                ) : filteredCenters.map(c => (
                  <tr key={c.id}>
                    <td style={{ paddingLeft: '24px', fontWeight: 600, fontSize: '13px' }}>{c.name}</td>
                    <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{c.description || '-'}</td>
                    <td><span className={`status-badge ${c.is_active ? 'completed' : 'cancelled'}`}>{c.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(c.created_at).toLocaleDateString()}</td>
                    <td style={{ textAlign: 'center' }}>
                      <div className="action-btns" style={{ justifyContent: 'center' }}>
                        <button className="action-btn" onClick={() => { setEditItem(c); setShowCcModal(true) }}><Edit size={14} /></button>
                        <button className="action-btn danger" onClick={() => deleteCenter(c.id)}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAcctModal && <ExpenseAccountModal account={editItem} company={company} onClose={() => setShowAcctModal(false)} onSuccess={load} />}
      {showCcModal && <CostCenterModal center={editItem} company={company} onClose={() => setShowCcModal(false)} onSuccess={load} />}
    </div>
  )
}
