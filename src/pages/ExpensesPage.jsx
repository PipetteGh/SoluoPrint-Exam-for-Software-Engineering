import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../lib/supabase'
import { Receipt, Plus, Trash2, X } from 'lucide-react'
import { TableSkeleton, StatSkeleton } from '../components/ui/Skeletons'
import SEO from '../components/ui/SEO'

const EXPENSE_CATEGORIES = ['Office Supplies', 'Utilities', 'Rent', 'Salaries', 'Materials', 'Equipment', 'Maintenance', 'Marketing', 'Transport', 'Other']

import NewExpenseModal from '../components/modals/NewExpenseModal'

export default function ExpensesPage() {
  const { company } = useAuth()
  const [expenses, setExpenses] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  useEffect(() => { if (company) load() }, [company])

  async function load() {
    const { data } = await supabase.from('expenses').select('*,payment_accounts(name)').eq('company_id', company.id).order('expense_date', { ascending: false })
    setExpenses(data || [])
    setLoading(false)
  }

  const total = expenses.reduce((s, e) => s + (e.amount || 0), 0)
  const currency = company?.currency_symbol || '¢'

  return (
    <div>
      <SEO title="Expenses" description="Manage business expenses, overheads, and materials procurement costs." />
      <div className="page-header">
        <div><h1 className="page-title">Expenses</h1><p className="page-subtitle">Track business expenses</p></div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}><Plus /> New Expense</button>
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

      <div className="table-container">
        <table>
          <thead>
            <tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th><th>Account</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <TableSkeleton columns={6} rows={5} />
            ) : expenses.length === 0 ? (
              <tr><td colSpan={6}><div className="empty-state"><Receipt/><h3>No expenses</h3><p>Track your first expense</p></div></td></tr>
            ) : expenses.map(e => (
              <tr key={e.id}>
                <td style={{fontSize:'12px'}}>{e.expense_date}</td>
                <td><span className="pill pill-orange">{e.category}</span></td>
                <td>{e.description}</td>
                <td style={{fontWeight:700,color:'var(--error)'}}>{currency}{(e.amount||0).toFixed(2)}</td>
                <td>{e.payment_accounts?.name || '-'}</td>
                <td>
                  <button className="action-btn danger" onClick={async()=>{
                    if(confirm('Delete?')){
                      const { error } = await supabase.from('expenses').delete().eq('id',e.id)
                      if (error) toast.error('Failed to delete expense')
                      else {
                        toast.success('Expense deleted')
                        load()
                      }
                    }
                  }}>
                    <Trash2 />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && <NewExpenseModal onClose={() => setShowAdd(false)} onSuccess={load} company={company} />}
    </div>
  )
}
