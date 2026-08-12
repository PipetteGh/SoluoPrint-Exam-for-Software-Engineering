import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { FileText, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import NewPaymentModal from '../components/modals/NewPaymentModal'
import { TableSkeleton, StatSkeleton } from '../components/ui/Skeletons'
import SEO from '../components/ui/SEO'

export default function ReceivablesPage() {
  const { company } = useAuth()
  const [receivables, setReceivables] = useState([])
  const [loading, setLoading] = useState(true)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  
  // Search & Pagination state
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => { if (company) load() }, [company])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('customers').select('id,name,balance,customer_types(name)').eq('company_id', company.id).gt('balance', 0).order('balance', { ascending: false })
    setReceivables(data || [])
    setLoading(false)
  }

  const searched = useMemo(() => {
    return receivables.filter(r => {
      const name = (r.name || '').toLowerCase()
      const type = (r.customer_types?.name || '').toLowerCase()
      const query = searchTerm.toLowerCase()
      return name.includes(query) || type.includes(query)
    })
  }, [receivables, searchTerm])

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return searched.slice(start, start + itemsPerPage)
  }, [searched, currentPage])

  const totalPages = Math.ceil(searched.length / itemsPerPage) || 1

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

      <div className="card" style={{ padding: 0 }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div className="card-title">Receivables Record ({searched.length})</div>
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="form-control" 
              placeholder="Search customer owing..." 
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              style={{ paddingLeft: '36px', height: '36px', fontSize: '13px' }}
            />
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr><th>Customer</th><th>Type</th><th>Amount Owed</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton columns={4} rows={4} />
              ) : searched.length === 0 ? (
                <tr><td colSpan={4}><div className="empty-state"><FileText/><h3>No receivables</h3><p>No customers found matching search query</p></div></td></tr>
              ) : paginated.map(r => (
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

        {searched.length > 0 && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, searched.length)} of {searched.length} records
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={16} /> Prev
              </button>
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
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
