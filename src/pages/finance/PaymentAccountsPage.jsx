import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { useConfirm } from '../../contexts/ConfirmContext'
import { supabase } from '../../lib/supabase'
import { Wallet, Plus, Trash2, X, RefreshCcw, MoreVertical, Edit } from 'lucide-react'

function AccountModal({ account, company, onClose, onSuccess }) {
  const [form, setForm] = useState(account || { name: '', account_type: 'cash', account_number: '', bank_name: '', is_active: true })
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    let err
    if (account?.id) {
      ({ error: err } = await supabase.from('payment_accounts').update(form).eq('id', account.id))
    } else {
      ({ error: err } = await supabase.from('payment_accounts').insert({ ...form, company_id: company.id }))
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
          <h2 className="modal-title">{account ? 'Edit' : 'New'} Payment Account</h2>
          <button className="modal-close" onClick={onClose}><X /></button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit} id="acct-form">
            <div className="form-group">
              <label className="form-label">Account Name *</label>
              <input name="name" className="form-control" value={form.name} onChange={handleChange} required placeholder="e.g. Cash, Mobile Money" />
            </div>
            <div className="form-group">
              <label className="form-label">Account Type</label>
              <select name="account_type" className="form-control" value={form.account_type} onChange={handleChange}>
                {['cash','mobile_money','bank','card','other'].map(t => <option key={t} value={t}>{t.replace('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>)}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Account Number</label>
                <input name="account_number" className="form-control" value={form.account_number||''} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Bank Name</label>
                <input name="bank_name" className="form-control" value={form.bank_name||''} onChange={handleChange} />
              </div>
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
          <button className="btn btn-primary" form="acct-form" type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  )
}

export default function PaymentAccountsPage() {
  const { company } = useAuth()
  const toast = useToast()
  const { confirm } = useConfirm()
  const [accounts, setAccounts] = useState([])
  const [payments, setPayments] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editAccount, setEditAccount] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('active')
  const [dateRange, setDateRange] = useState('This Year')
  const currency = company?.currency_symbol || '¢'

  useEffect(() => { if (company) load() }, [company])

  async function load() {
    setLoading(true)
    const [{ data: acctData }, { data: payData }] = await Promise.all([
      supabase.from('payment_accounts').select('*').eq('company_id', company.id).order('name'),
      supabase.from('payments').select('*').eq('company_id', company.id)
    ])
    setAccounts(acctData || [])
    setPayments(payData || [])
    setLoading(false)
  }

  async function deleteAccount(id) {
    const isConfirmed = await confirm({
      title: 'Delete Payment Account',
      message: 'Are you sure you want to delete this payment account? This action cannot be undone.',
      confirmText: 'Yes, Delete Account',
      cancelText: 'Cancel',
      type: 'danger'
    })
    if (!isConfirmed) return
    const { error } = await supabase.from('payment_accounts').delete().eq('id', id)
    if (error) {
      toast.error('Failed to delete account. It may be linked to payments.')
    } else {
      toast.success('Account deleted')
      load()
    }
  }

  const filteredAccounts = accounts.filter(a => activeTab === 'active' ? (a.is_active !== false) : (a.is_active === false))
  const actCount = accounts.filter(a => a.is_active !== false).length
  const inCt = accounts.length - actCount

  // Calculate totals
  const stats = filteredAccounts.map(a => {
    // Only basic tracking for now since expenses aren't fully linked to payment accounts yet
    const acctPayments = payments.filter(p => p.payment_account_id === a.id)
    const received = acctPayments.reduce((sum, p) => sum + p.amount, 0)
    const paid = 0 // Future: link expenses to accounts
    return { ...a, received, paid, balance: received - paid }
  })

  const totalReceived = stats.reduce((s, a) => s + a.received, 0)
  const totalPaid = stats.reduce((s, a) => s + a.paid, 0)
  const totalBalance = totalReceived - totalPaid

  return (
    <div>
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="page-title">Payment Accounts</h1>
          <p className="page-subtitle">Manage your payment accounts and financial transactions</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" style={{ fontSize: '12px' }} disabled>↑ Transfer - Coming Soon</button>
          <button className="btn btn-secondary" style={{ fontSize: '12px' }} disabled>+ Add Funds - Coming Soon</button>
          <button className="btn btn-primary" onClick={() => { setEditAccount(null); setShowModal(true) }}>
            <Plus size={16} /> New Account
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: '0', borderRadius: '12px', overflow: 'hidden' }}>
        {/* Header with Tabs */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Payment Accounts</h2>
          <div style={{ display: 'flex', gap: '0' }}>
            <button onClick={() => setActiveTab('active')} style={{
              padding: '6px 16px', fontSize: '13px', fontWeight: 500, border: '1px solid var(--border)', cursor: 'pointer',
              borderRadius: '6px 0 0 6px',
              background: activeTab === 'active' ? 'var(--primary)' : 'white',
              color: activeTab === 'active' ? 'white' : 'var(--text-secondary)',
            }}>Active ({actCount})</button>
            <button onClick={() => setActiveTab('inactive')} style={{
              padding: '6px 16px', fontSize: '13px', fontWeight: 500, border: '1px solid var(--border)', borderLeft: 0, cursor: 'pointer',
              borderRadius: '0 6px 6px 0',
              background: activeTab === 'inactive' ? 'var(--primary)' : 'white',
              color: activeTab === 'inactive' ? 'white' : 'var(--text-secondary)',
            }}>Inactive ({inCt})</button>
          </div>
        </div>

        {/* Filter bar */}
        <div style={{ padding: '16px 24px', display: 'flex', gap: '12px', alignItems: 'center', borderBottom: '1px solid var(--border)', background: '#f8fafc' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'white', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: '6px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Date Range:</span>
            <select style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }} value={dateRange} onChange={e => setDateRange(e.target.value)}>
              <option>This Month</option>
              <option>This Year</option>
              <option>All Time</option>
            </select>
          </div>
          <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={load}>
            <RefreshCcw size={14} /> Refresh
          </button>
        </div>

        {/* Table */}
        <div className="table-container" style={{ margin: 0, borderRadius: 0, border: 'none' }}>
          <table style={{ margin: 0 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ paddingLeft: '24px' }}>Account Name</th>
                <th style={{ textAlign: 'right' }}>Money Received</th>
                <th style={{ textAlign: 'right' }}>Money Paid</th>
                <th style={{ textAlign: 'right' }}>Balance</th>
                <th style={{ textAlign: 'center', width: '80px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px' }}>Loading...</td></tr>
              ) : stats.length === 0 ? (
                <tr><td colSpan={5}><div className="empty-state"><Wallet /><h3>No payment accounts</h3></div></td></tr>
              ) : (
                <>
                  {stats.map(a => (
                    <tr key={a.id}>
                      <td style={{ paddingLeft: '24px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {a.name} {a.name === 'Cash' && <span style={{ color: '#f59e0b' }}>⭐</span>}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--success)', fontWeight: 500 }}>{currency}{a.received.toFixed(2)}</td>
                      <td style={{ textAlign: 'right', color: 'var(--error)', fontWeight: 500 }}>{currency}{a.paid.toFixed(2)}</td>
                      <td style={{ textAlign: 'right', color: 'var(--primary)', fontWeight: 600 }}>{currency}{a.balance.toFixed(2)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <div className="action-btns" style={{ justifyContent: 'center' }}>
                          <button className="action-btn" onClick={() => { setEditAccount(a); setShowModal(true) }}><Edit size={16} /></button>
                          <button className="action-btn danger" onClick={() => deleteAccount(a.id)}><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  <tr style={{ background: '#eff6ff', borderTop: '2px solid #bfdbfe' }}>
                    <td style={{ paddingLeft: '24px', fontWeight: 800, color: '#1e40af' }}>TOTALS</td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--success)' }}>{currency}{totalReceived.toFixed(2)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--error)' }}>{currency}{totalPaid.toFixed(2)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: '#1e40af' }}>{currency}{totalBalance.toFixed(2)}</td>
                    <td></td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && <AccountModal account={editAccount} company={company} onClose={() => setShowModal(false)} onSuccess={load} />}
    </div>
  )
}
