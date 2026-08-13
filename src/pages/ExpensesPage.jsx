import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useConfirm } from '../contexts/ConfirmContext'
import { supabase } from '../lib/supabase'
import { Receipt, Plus, Trash2, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { TableSkeleton, StatSkeleton } from '../components/ui/Skeletons'
import SEO from '../components/ui/SEO'
import NewExpenseModal from '../components/modals/NewExpenseModal'

export default function ExpensesPage() {
  const { company } = useAuth()
  const [expenses, setExpenses] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(true)
  const toast = useToast()
  const { confirm } = useConfirm()

  // Search & Pagination state
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => { if (company) load() }, [company])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('expenses').select('*,payment_accounts(name)').eq('company_id', company.id).order('expense_date', { ascending: false })
    setExpenses(data || [])
    setLoading(false)
  }

  const searched = useMemo(() => {
    return expenses.filter(e => {
      const cat = (e.category || '').toLowerCase()
      const desc = (e.description || '').toLowerCase()
      const acc = (e.payment_accounts?.name || '').toLowerCase()
      const date = (e.expense_date || '').toLowerCase()
      const query = searchTerm.toLowerCase()
      return cat.includes(query) || desc.includes(query) || acc.includes(query) || date.includes(query)
    })
  }, [expenses, searchTerm])

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return searched.slice(start, start + itemsPerPage)
  }, [searched, currentPage])

  const totalPages = Math.ceil(searched.length / itemsPerPage) || 1

  const total = expenses.reduce((s, e) => s + (e.amount || 0), 0)
  const currency = company?.currency_symbol || '¢'

  return (
    <div>
      <SEO title="Expenses" description="Manage business expenses, overheads, and materials procurement costs." />
      <div className="page-header">
        <div><h1 className="page-title">Expenses</h1><p className="page-subtitle">Track business expenses</p></div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}><Plus size={16} /> New Expense</button>
      </div>

      <div className="stat-grid" style={{gridTemplateColumns:'auto auto',maxWidth:'400px',marginBottom:'20px'}}>
        {loading ? (
          <>
            <StatSkeleton />
            <StatSkeleton />
          </>
        ) : (
          <>
            <div className="stat-card">
              <div className="stat-icon" style={{background:'#fee2e2'}}><Receipt size={22} color="#ef4444"/></div>
              <div className="stat-info"><div className="stat-label">Total Expenses</div><div className="stat-value">{currency}{total.toFixed(2)}</div></div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{background:'#fef3c7'}}><Receipt size={22} color="#f59e0b"/></div>
              <div className="stat-info"><div className="stat-label">Records</div><div className="stat-value">{expenses.length}</div></div>
            </div>
          </>
        )}
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div className="card-title">Expense Log ({searched.length})</div>
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="form-control" 
              placeholder="Search expenses..." 
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              style={{ paddingLeft: '36px', height: '36px', fontSize: '13px' }}
            />
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th><th>Account</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton columns={6} rows={5} />
              ) : searched.length === 0 ? (
                <tr><td colSpan={6}><div className="empty-state"><Receipt/><h3>No expenses</h3><p>No expenses found matching search query</p></div></td></tr>
              ) : paginated.map(e => (
                <tr key={e.id}>
                  <td style={{fontSize:'12px'}}>{e.expense_date}</td>
                  <td><span className="pill pill-orange">{e.category}</span></td>
                  <td>{e.description}</td>
                  <td style={{fontWeight:700,color:'var(--error)'}}>{currency}{(e.amount||0).toFixed(2)}</td>
                  <td>{e.payment_accounts?.name || '-'}</td>
                  <td>
                    <button className="action-btn danger" onClick={async()=>{
                      const isConfirmed = await confirm({
                        title: 'Delete Expense Record',
                        message: 'Are you sure you want to delete this expense record?',
                        confirmText: 'Yes, Delete Expense',
                        cancelText: 'Cancel',
                        type: 'danger'
                      })
                      if(isConfirmed){
                        const { error } = await supabase.from('expenses').delete().eq('id',e.id)
                        if (error) toast.error('Failed to delete expense')
                        else {
                          toast.success('Expense deleted')
                          load()
                        }
                      }
                    }}>
                      <Trash2 size={16} />
                    </button>
                  </td>
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

      {showAdd && <NewExpenseModal onClose={() => setShowAdd(false)} onSuccess={load} company={company} />}
    </div>
  )
}
