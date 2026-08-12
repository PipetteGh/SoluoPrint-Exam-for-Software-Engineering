import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { FileText } from 'lucide-react'
import NewPaymentModal from '../components/modals/NewPaymentModal'
import { TableSkeleton, StatSkeleton } from '../components/ui/Skeletons'
import SEO from '../components/ui/SEO'

export default function ReceivablesPage() {
  const { company } = useAuth()
  const [receivables, setReceivables] = useState([])
  const [loading, setLoading] = useState(true)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState(null)

  useEffect(() => { if (company) load() }, [company])

  async function load() {
    const { data } = await supabase.from('customers').select('id,name,balance,customer_types(name)').eq('company_id', company.id).gt('balance', 0).order('balance', { ascending: false })
    setReceivables(data || [])
    setLoading(false)
  }

  const currency = company?.currency_symbol || '¢'
  const total = receivables.reduce((s, r) => s + (r.balance || 0), 0)

  return (
    <div>
      <SEO title="Receivables" description="Track outstanding customer balances and collect pending payments." />
      <div className="page-header">
        <div><h1 className="page-title">Receivables</h1><p className="page-subtitle">Customers with outstanding balances</p></div>
      </div>

      <div className="stat-grid" style={{gridTemplateColumns:'auto auto auto',maxWidth:'600px',marginBottom:'20px'}}>
        {loading ? (
          <>
            <StatSkeleton />
            <StatSkeleton />
          </>
        ) : (
          <>
            <div className="stat-card">
              <div className="stat-icon" style={{background:'#fee2e2'}}><FileText size={22} color="#ef4444"/></div>
              <div className="stat-info"><div className="stat-label">Total Receivables</div><div className="stat-value">{currency}{total.toFixed(2)}</div></div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{background:'#fef3c7'}}><FileText size={22} color="#f59e0b"/></div>
              <div className="stat-info"><div className="stat-label">Customers Owing</div><div className="stat-value">{receivables.length}</div></div>
            </div>
          </>
        )}
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr><th>Customer</th><th>Type</th><th>Amount Owed</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <TableSkeleton columns={4} rows={4} />
            ) : receivables.length === 0 ? (
              <tr><td colSpan={4}><div className="empty-state"><FileText/><h3>No receivables</h3><p>All customers are up to date</p></div></td></tr>
            ) : receivables.map(r => (
              <tr key={r.id}>
                <td style={{fontWeight:600}}>{r.name}</td>
                <td>{r.customer_types?.name || '-'}</td>
                <td style={{fontWeight:700,color:'var(--error)',fontSize:'16px'}}>{currency}{(r.balance||0).toFixed(2)}</td>
                <td><button className="btn btn-sm btn-primary" onClick={() => { setSelectedCustomer(r); setShowPaymentModal(true) }}>Collect Payment</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showPaymentModal && (
        <NewPaymentModal 
          preSelectedCustomerId={selectedCustomer?.id}
          onClose={() => { setShowPaymentModal(false); setSelectedCustomer(null) }} 
          onSuccess={load} 
        />
      )}
    </div>
  )
}
