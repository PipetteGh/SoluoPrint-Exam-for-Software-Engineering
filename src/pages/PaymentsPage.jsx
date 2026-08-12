import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { CreditCard, Plus, Trash2 } from 'lucide-react'
import NewPaymentModal from '../components/modals/NewPaymentModal'
import { TableSkeleton, StatSkeleton } from '../components/ui/Skeletons'
import SEO from '../components/ui/SEO'

export default function PaymentsPage() {
  const { company } = useAuth()
  const [payments, setPayments] = useState([])
  const [stats, setStats] = useState({ total: 0, count: 0, today: 0 })
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => { if (company) load() }, [company])

  async function load() {
    const { data } = await supabase
      .from('payments').select('*,customers(name),payment_accounts(name)')
      .eq('company_id', company.id).order('created_at', { ascending: false })
    const all = data || []
    setPayments(all)
    const today = new Date().toISOString().split('T')[0]
    setStats({
      total: all.reduce((s, p) => s + (p.amount || 0), 0),
      count: all.length,
      today: all.filter(p => p.payment_date === today).reduce((s, p) => s + (p.amount || 0), 0)
    })
    setLoading(false)
  }

  const filtered = payments.filter(p => {
    if (dateFrom && p.payment_date < dateFrom) return false
    if (dateTo && p.payment_date > dateTo) return false
    return true
  })

  const currency = company?.currency_symbol || '¢'

  return (
    <div>
      <SEO title="Payments" description="Monitor payment transactions, receipts, and revenue collection history." />
      <div className="page-header">
        <div><h1 className="page-title">Payments</h1><p className="page-subtitle">Track all payment transactions</p></div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}><Plus /> Record Payment</button>
      </div>

      <div className="stat-grid">
        {loading ? (
          <>
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </>
        ) : (
          <>
            <div className="stat-card">
              <div className="stat-icon" style={{background:'#dcfce7'}}><CreditCard size={22} color="#22c55e"/></div>
              <div className="stat-info"><div className="stat-label">Total Received</div><div className="stat-value">{currency}{stats.total.toFixed(2)}</div></div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{background:'#eff6ff'}}><CreditCard size={22} color="#2563eb"/></div>
              <div className="stat-info"><div className="stat-label">Total Transactions</div><div className="stat-value">{stats.count}</div></div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{background:'#fef3c7'}}><CreditCard size={22} color="#f59e0b"/></div>
              <div className="stat-info"><div className="stat-label">Today's Received</div><div className="stat-value">{currency}{stats.today.toFixed(2)}</div></div>
            </div>
          </>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Payment History</div>
          <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
            <input type="date" className="filter-select" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} />
            <span style={{color:'var(--text-muted)'}}>to</span>
            <input type="date" className="filter-select" value={dateTo} onChange={e=>setDateTo(e.target.value)} />
          </div>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th><th>Customer</th><th>Amount</th><th>Method</th><th>Account</th><th>Notes</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton columns={7} rows={5} />
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7}><div className="empty-state"><CreditCard/><h3>No payments</h3><p>Record your first payment</p></div></td></tr>
              ) : filtered.map(p => (
                <tr key={p.id}>
                  <td style={{fontSize:'12px'}}>{p.payment_date}</td>
                  <td style={{fontWeight:600}}>{p.customers?.name || '-'}</td>
                  <td style={{fontWeight:700,color:'var(--success)'}}>{currency}{(p.amount||0).toFixed(2)}</td>
                  <td><span className="pill pill-blue">{p.payment_method}</span></td>
                  <td>{p.payment_accounts?.name || '-'}</td>
                  <td style={{color:'var(--text-muted)',fontSize:'12px'}}>{p.notes || '-'}</td>
                  <td>
                    <button className="action-btn danger" onClick={async()=>{if(confirm('Delete?')){await supabase.from('payments').delete().eq('id',p.id);load()}}}>
                      <Trash2 />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && <NewPaymentModal onClose={() => setShowAdd(false)} onSuccess={load} />}
    </div>
  )
}
