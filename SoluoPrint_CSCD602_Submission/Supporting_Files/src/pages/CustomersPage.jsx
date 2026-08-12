import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../lib/supabase'
import { Users, Plus, Search, Edit, Trash2, X, Phone, Mail, ChevronLeft, ChevronRight, Key } from 'lucide-react'
import SEO from '../components/ui/SEO'
import NewCustomerModal from '../components/modals/NewCustomerModal'
import { TableSkeleton, StatSkeleton } from '../components/ui/Skeletons'

function EditCustomerModal({ customer, company, onClose, onSuccess }) {
  const [customerTypes, setCustomerTypes] = useState([])
  const [form, setForm] = useState({
    name: customer.name || '',
    customer_type_id: customer.customer_type_id || '',
    phone: customer.phone || '',
    email: customer.email || '',
    address: customer.address || '',
    sms_notifications: customer.sms_notifications || false,
    is_active: customer.is_active !== false
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const toast = useToast()

  useEffect(() => {
    supabase.from('customer_types').select('*').eq('company_id', company.id).then(({ data }) => setCustomerTypes(data || []))
  }, [company])

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error: err } = await supabase.from('customers').update(form).eq('id', customer.id)
    setLoading(false)
    if (err) {
      setError(err.message)
      toast.error('Failed to update customer: ' + err.message)
    } else {
      toast.success('Customer updated')
      onSuccess?.(); onClose()
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">Edit Customer</h2>
          <button className="modal-close" onClick={onClose}><X /></button>
        </div>
        <div className="modal-body">
          {error && <div className="error-alert">{error}</div>}
          <form onSubmit={handleSubmit} id="edit-customer-form">
            <div className="form-group">
              <label className="form-label">Customer Name *</label>
              <input name="name" className="form-control" value={form.name} onChange={handleChange} required />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Customer Type</label>
                <select name="customer_type_id" className="form-control" value={form.customer_type_id} onChange={handleChange}>
                  <option value="">Select type</option>
                  {customerTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input name="phone" className="form-control" value={form.phone} onChange={handleChange} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input name="email" type="email" className="form-control" value={form.email} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Address</label>
              <textarea name="address" className="form-control" value={form.address} onChange={handleChange} rows={2} />
            </div>
            <div className="toggle-wrap">
              <div><div className="toggle-label">Active</div><div className="toggle-desc">Customer is active and can have new jobs</div></div>
              <label className="toggle-switch">
                <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} />
                <span className="toggle-slider"></span>
              </label>
            </div>
            <div className="toggle-wrap">
              <div><div className="toggle-label">SMS Notifications</div><div className="toggle-desc">Send SMS updates to this customer</div></div>
              <label className="toggle-switch">
                <input type="checkbox" name="sms_notifications" checked={form.sms_notifications} onChange={handleChange} />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </form>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" form="edit-customer-form" type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CustomersPage() {
  const { company } = useAuth()
  const [customers, setCustomers] = useState([])
  const [stats, setStats] = useState({ total: 0, active: 0, owed: 0, credit: 0 })
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [editCustomer, setEditCustomer] = useState(null)
  const [viewCredentials, setViewCredentials] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [generatingBulk, setGeneratingBulk] = useState(false)
  const itemsPerPage = 20
  const toast = useToast()

  useEffect(() => { if (company) load() }, [company])

  async function load() {
    const { data } = await supabase
      .from('customers')
      .select('*,customer_types(name)')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false })
    const all = data || []
    setCustomers(all)
    setStats({
      total: all.length,
      active: all.filter(c => c.is_active).length,
      owed: all.reduce((s, c) => s + (c.balance || 0), 0),
      credit: all.reduce((s, c) => s + (c.credit_balance || 0), 0)
    })
    setSelectedIds([])
    setLoading(false)
  }

  async function deleteCustomer(id) {
    if (!confirm('Delete this customer? This cannot be undone.')) return
    const { error } = await supabase.from('customers').delete().eq('id', id)
    if (error) {
      toast.error('Failed to delete customer: ' + error.message)
    } else {
      toast.success('Customer deleted')
      load()
    }
  }

  async function bulkDelete() {
    if (!confirm(`Delete ${selectedIds.length} selected customers? This cannot be undone.`)) return
    const { error } = await supabase.from('customers').delete().in('id', selectedIds)
    if (error) {
      toast.error('Failed to delete customers: ' + error.message)
    } else {
      toast.success(`${selectedIds.length} customers deleted`)
      load()
    }
  }

  async function bulkGenerateCredentials() {
    if (!confirm(`Generate portal credentials for ${selectedIds.length} selected customers? (Existing credentials will not be overwritten)`)) return
    setGeneratingBulk(true)
    let generatedCount = 0
    let failedCount = 0

    const selectedCustomers = customers.filter(c => selectedIds.includes(c.id))
    
    for (const cust of selectedCustomers) {
      if (!cust.username) {
        let isUnique = false;
        let newUsername = '';
        const cleanName = cust.name.replace(/[^a-zA-Z]/g, '').substring(0, 4).toUpperCase();
        
        while (!isUnique) {
          const randomNum = Math.floor(1000 + Math.random() * 9000);
          newUsername = `CUST-${cleanName || 'USER'}-${randomNum}`;
          
          const { data } = await supabase
            .from('customers')
            .select('id')
            .eq('username', newUsername)
            .maybeSingle();
            
          if (!data) isUnique = true;
        }

        const newPassword = Math.random().toString(36).slice(-8)
        
        const { error } = await supabase
          .from('customers')
          .update({ username: newUsername, password: newPassword })
          .eq('id', cust.id)
          
        if (!error) {
          generatedCount++
        } else {
          failedCount++
        }
      }
    }
    
    setGeneratingBulk(false)
    if (generatedCount > 0) {
      toast.success(`Generated credentials for ${generatedCount} customers!`)
      load()
    } else if (failedCount > 0) {
      toast.error(`Failed to generate for ${failedCount} customers.`)
    } else {
      toast.info('All selected customers already have credentials.')
    }
  }

  function toggleSelect(id) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  function toggleSelectAll() {
    if (selectedIds.length > 0 && selectedIds.length === filtered.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filtered.map(c => c.id))
    }
  }

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  )

  // Pagination logic
  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedCustomers = filtered.slice(startIndex, startIndex + itemsPerPage)

  const currency = company?.currency_symbol || '¢'

  return (
    <div>
      <SEO title="Customers" description="Manage your customer base, track credit balances, and monitor engagement." />
      <div className="page-header">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="page-subtitle">Manage your customer base</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <Plus /> Add Customer
        </button>
      </div>

      <div className="stat-grid">
        {loading ? (
          <>
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </>
        ) : (
          <>
            <div className="stat-card">
              <div className="stat-icon" style={{background:'#eff6ff'}}><Users size={22} color="#2563eb"/></div>
              <div className="stat-info"><div className="stat-label">Total Customers</div><div className="stat-value">{stats.total}</div></div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{background:'#dcfce7'}}><Users size={22} color="#22c55e"/></div>
              <div className="stat-info"><div className="stat-label">Active Customers</div><div className="stat-value">{stats.active}</div></div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{background:'#fef3c7'}}><Users size={22} color="#f59e0b"/></div>
              <div className="stat-info"><div className="stat-label">Amount Owed</div><div className="stat-value">{currency}{stats.owed.toFixed(2)}</div></div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{background:'#fee2e2'}}><Users size={22} color="#ef4444"/></div>
              <div className="stat-info"><div className="stat-label">Credit Balance</div><div className="stat-value">{currency}{stats.credit.toFixed(2)}</div></div>
            </div>
          </>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
            <div className="card-title">All Customers ({filtered.length})</div>
            {selectedIds.length > 0 && (
              <div style={{display:'flex', alignItems:'center', gap:'8px', paddingLeft:'12px', borderLeft:'1px solid var(--border)'}}>
                <span style={{fontSize:'13px', color:'var(--text-muted)'}}>{selectedIds.length} selected</span>
                <button 
                  className="btn btn-secondary" 
                  style={{padding:'4px 8px', fontSize:'12px'}} 
                  onClick={bulkGenerateCredentials}
                  disabled={generatingBulk}
                >
                  <Key size={14} /> {generatingBulk ? 'Generating...' : 'Generate Credentials'}
                </button>
                <button className="btn btn-secondary" style={{padding:'4px 8px', fontSize:'12px', color:'var(--error)'}} onClick={bulkDelete}>
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            )}
          </div>
          <div style={{position:'relative'}}>
            <Search size={14} style={{position:'absolute',left:'10px',top:'50%',transform:'translateY(-50%)',color:'var(--text-muted)'}} />
            <input className="form-control" style={{paddingLeft:'32px',width:'220px'}} placeholder="Search customers..." value={search} onChange={e=>{setSearch(e.target.value); setCurrentPage(1)}} />
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Showing {filtered.length > 0 ? startIndex + 1 : 0} to {Math.min(startIndex + itemsPerPage, filtered.length)} of {filtered.length} customers
          </span>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{width:'40px'}}>
                  <input type="checkbox" checked={selectedIds.length > 0 && selectedIds.length === filtered.length} onChange={toggleSelectAll} />
                </th>
                <th style={{width:'40px'}}>S/N</th>
                <th>Name</th><th>Type</th><th>Phone</th><th>Email</th><th>Balance</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton columns={7} rows={5} />
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7}><div className="empty-state"><Users/><h3>No customers found</h3><p>Add your first customer to get started</p></div></td></tr>
              ) : paginatedCustomers.map((c, index) => (
                <tr key={c.id} className={selectedIds.includes(c.id) ? 'selected-row' : ''}>
                  <td>
                    <input type="checkbox" checked={selectedIds.includes(c.id)} onChange={() => toggleSelect(c.id)} />
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{startIndex + index + 1}</td>
                  <td>
                    <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                      <div style={{width:'30px',height:'30px',borderRadius:'50%',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:'700',fontSize:'12px',flexShrink:0}}>
                        {c.name[0]?.toUpperCase()}
                      </div>
                      <span style={{fontWeight:600}}>{c.name}</span>
                    </div>
                  </td>
                  <td><span className="pill pill-blue">{c.customer_types?.name || '-'}</span></td>
                  <td style={{fontSize:'13px'}}>{c.phone ? <span style={{display:'flex',alignItems:'center',gap:'4px'}}><Phone size={12}/>{c.phone}</span> : '-'}</td>
                  <td style={{fontSize:'13px'}}>{c.email ? <span style={{display:'flex',alignItems:'center',gap:'4px'}}><Mail size={12}/>{c.email}</span> : '-'}</td>
                  <td style={{fontWeight:600,color: (c.balance||0) > 0 ? 'var(--error)' : 'inherit'}}>{currency}{(c.balance||0).toFixed(2)}</td>
                  <td><span className={`status-badge ${c.is_active ? 'completed' : 'cancelled'}`}>{c.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td>
                    <div className="action-btns">
                      <button className="action-btn" title="View Portal Credentials" onClick={() => setViewCredentials(c)}><Key size={16} /></button>
                      <button className="action-btn" title="Edit" onClick={() => setEditCustomer(c)}><Edit size={16} /></button>
                      <button className="action-btn danger" title="Delete" onClick={() => deleteCustomer(c.id)}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '20px', paddingBottom: '20px' }}>
            <button 
              className="btn btn-secondary btn-sm" 
              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px' }}
              disabled={currentPage === 1}
              onClick={() => { setCurrentPage(prev => prev - 1); window.scrollTo(0, 0) }}
            >
              <ChevronLeft size={16} /> Previous
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum = i + 1
                if (totalPages > 5) {
                  if (currentPage > 3) pageNum = currentPage - 3 + i
                  if (pageNum > totalPages) pageNum = totalPages - 4 + i
                }
                if (pageNum <= 0) pageNum = i + 1

                return (
                  <button
                    key={pageNum}
                    onClick={() => { setCurrentPage(pageNum); window.scrollTo(0, 0) }}
                    style={{
                      width: '32px', height: '32px', borderRadius: '6px', border: '1px solid var(--border)',
                      background: currentPage === pageNum ? 'var(--primary)' : 'white',
                      color: currentPage === pageNum ? 'white' : 'var(--text-primary)',
                      fontSize: '13px', fontWeight: 600, cursor: 'pointer'
                    }}
                  >
                    {pageNum}
                  </button>
                )
              })}
            </div>
            <button 
              className="btn btn-secondary btn-sm" 
              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px' }}
              disabled={currentPage === totalPages}
              onClick={() => { setCurrentPage(prev => prev + 1); window.scrollTo(0, 0) }}
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {showAdd && <NewCustomerModal onClose={() => setShowAdd(false)} onSuccess={load} />}
      {editCustomer && <EditCustomerModal customer={editCustomer} company={company} onClose={() => setEditCustomer(null)} onSuccess={load} />}

      {viewCredentials && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '400px', textAlign: 'center' }}>
            <div className="modal-header">
              <h2 className="modal-title">Portal Credentials</h2>
              <button className="modal-close" onClick={() => setViewCredentials(null)}><X /></button>
            </div>
            <div className="modal-body" style={{ padding: '24px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Key size={24} />
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>{viewCredentials.name}</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '14px' }}>
                Share these credentials with the customer so they can log in to their dedicated portal. Click to copy.
              </p>
              
              <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', textAlign: 'left', marginBottom: '24px' }}>
                {!viewCredentials.username ? (
                  <div style={{ textAlign: 'center', padding: '16px' }}>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>This customer does not have portal credentials yet.</p>
                    <button 
                      className="btn btn-primary"
                      onClick={async () => {
                        let isUnique = false;
                        let newUsername = '';
                        const cleanName = viewCredentials.name.replace(/[^a-zA-Z]/g, '').substring(0, 4).toUpperCase();
                        
                        while (!isUnique) {
                          const randomNum = Math.floor(1000 + Math.random() * 9000);
                          newUsername = `CUST-${cleanName || 'USER'}-${randomNum}`;
                          
                          const { data } = await supabase
                            .from('customers')
                            .select('id')
                            .eq('username', newUsername)
                            .maybeSingle();
                            
                          if (!data) isUnique = true;
                        }

                        const newPassword = Math.random().toString(36).slice(-8)
                        
                        const { error } = await supabase
                          .from('customers')
                          .update({ username: newUsername, password: newPassword })
                          .eq('id', viewCredentials.id)
                          
                        if (!error) {
                          toast.success('Credentials generated!')
                          setViewCredentials({ ...viewCredentials, username: newUsername, password: newPassword })
                          load() // Refresh table
                        } else {
                          toast.error('Failed to generate credentials')
                        }
                      }}
                    >
                      Generate Credentials
                    </button>
                  </div>
                ) : (
                  <>
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Username</div>
                      <div 
                        style={{ fontSize: '16px', fontWeight: '600', letterSpacing: '1px', cursor: 'pointer', padding: '8px', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: '4px', display: 'inline-block' }}
                        onClick={() => {
                          navigator.clipboard.writeText(viewCredentials.username || '')
                          toast.success('Username copied to clipboard!')
                        }}
                        title="Click to copy username"
                      >
                        {viewCredentials.username || '-'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Password</div>
                      <div 
                        style={{ fontSize: '16px', fontWeight: '600', letterSpacing: '1px', cursor: 'pointer', padding: '8px', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: '4px', display: 'inline-block' }}
                        onClick={() => {
                          navigator.clipboard.writeText(viewCredentials.password || '')
                          toast.success('Password copied to clipboard!')
                        }}
                        title="Click to copy password"
                      >
                        {viewCredentials.password || '-'}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setViewCredentials(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
