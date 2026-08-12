import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { BarChart2, TrendingUp, TrendingDown } from 'lucide-react'

export default function ProfitLossPage() {
  const { company } = useAuth()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const currency = company?.currency_symbol || '¢'

  useEffect(() => { if (company) load() }, [company])

  async function load() {
    const { data: payments } = await supabase.from('payments').select('amount,payment_date').eq('company_id', company.id)
    const { data: expenses } = await supabase.from('expenses').select('amount,expense_date').eq('company_id', company.id)
    const months = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const month = d.toLocaleString('en', { month: 'long', year: 'numeric' })
      const monthStr = d.toISOString().slice(0, 7)
      const revenue = (payments || []).filter(p => p.payment_date?.startsWith(monthStr)).reduce((s, p) => s + (p.amount || 0), 0)
      const expense = (expenses || []).filter(e => e.expense_date?.startsWith(monthStr)).reduce((s, e) => s + (e.amount || 0), 0)
      const profit = revenue - expense
      months.push({ month, revenue, expense, profit })
    }
    setData(months)
    setLoading(false)
  }

  const totalRevenue = data.reduce((s, d) => s + d.revenue, 0)
  const totalExpense = data.reduce((s, d) => s + d.expense, 0)
  const totalProfit = totalRevenue - totalExpense

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Profit &amp; Loss</h1><p className="page-subtitle">Financial performance overview</p></div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{background:'#dcfce7'}}><TrendingUp size={22} color="#22c55e"/></div>
          <div className="stat-info"><div className="stat-label">Total Revenue</div><div className="stat-value" style={{color:'var(--success)'}}>{currency}{totalRevenue.toFixed(2)}</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{background:'#fee2e2'}}><TrendingDown size={22} color="#ef4444"/></div>
          <div className="stat-info"><div className="stat-label">Total Expenses</div><div className="stat-value" style={{color:'var(--error)'}}>{currency}{totalExpense.toFixed(2)}</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{background: totalProfit >= 0 ? '#dcfce7' : '#fee2e2'}}><BarChart2 size={22} color={totalProfit >= 0 ? '#22c55e' : '#ef4444'}/></div>
          <div className="stat-info"><div className="stat-label">Net Profit/Loss</div><div className="stat-value" style={{color: totalProfit >= 0 ? 'var(--success)' : 'var(--error)'}}>{currency}{totalProfit.toFixed(2)}</div></div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><div className="card-title">Monthly P&amp;L Breakdown</div></div>
        <div className="table-container">
          <table>
            <thead>
              <tr><th>Month</th><th>Revenue</th><th>Expenses</th><th>Net Profit</th></tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={4} style={{textAlign:'center',padding:'40px'}}>Loading...</td></tr>
              : data.map(d => (
                <tr key={d.month}>
                  <td style={{fontWeight:600}}>{d.month}</td>
                  <td style={{color:'var(--success)',fontWeight:600}}>{currency}{d.revenue.toFixed(2)}</td>
                  <td style={{color:'var(--error)',fontWeight:600}}>{currency}{d.expense.toFixed(2)}</td>
                  <td style={{fontWeight:700,color: d.profit >= 0 ? 'var(--success)' : 'var(--error)',fontSize:'15px'}}>
                    {d.profit >= 0 ? '+' : ''}{currency}{d.profit.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
