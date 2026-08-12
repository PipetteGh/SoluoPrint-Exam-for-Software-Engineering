import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { Receipt } from 'lucide-react'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js'
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

export default function ExpenseReportPage() {
  const { company } = useAuth()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const currency = company?.currency_symbol || '¢'

  useEffect(() => { if (company) load() }, [company])

  async function load() {
    const { data: expenses } = await supabase.from('expenses').select('amount,expense_date,category').eq('company_id', company.id)
    const months = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const month = d.toLocaleString('en', { month: 'short', year: '2-digit' })
      const monthStr = d.toISOString().slice(0, 7)
      const total = (expenses || []).filter(e => e.expense_date?.startsWith(monthStr)).reduce((s, e) => s + (e.amount || 0), 0)
      months.push({ month, total })
    }
    setData(months)
    setLoading(false)
  }

  const totalExpenses = data.reduce((s, d) => s + d.total, 0)

  const chartData = {
    labels: data.map(d => d.month),
    datasets: [{ label: 'Expenses', data: data.map(d => d.total), backgroundColor: 'rgba(239,68,68,0.7)', borderRadius: 6, borderSkipped: false }]
  }

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Expense Reports</h1><p className="page-subtitle">Track your spending over time</p></div>
      </div>

      <div className="stat-grid" style={{gridTemplateColumns:'auto auto',maxWidth:'400px',marginBottom:'20px'}}>
        <div className="stat-card">
          <div className="stat-icon" style={{background:'#fee2e2'}}><Receipt size={22} color="#ef4444"/></div>
          <div className="stat-info"><div className="stat-label">Total Expenses (6mo)</div><div className="stat-value">{currency}{totalExpenses.toFixed(2)}</div></div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><div className="card-title">Expense Trend</div></div>
        <div className="chart-container">
          {!loading && <Bar data={chartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }} />}
        </div>
      </div>

      <div className="card" style={{marginTop:'16px'}}>
        <div className="card-header"><div className="card-title">Monthly Breakdown</div></div>
        <div className="table-container">
          <table>
            <thead><tr><th>Month</th><th>Total Expenses</th></tr></thead>
            <tbody>
              {data.map(d => (
                <tr key={d.month}><td style={{fontWeight:600}}>{d.month}</td><td style={{fontWeight:700,color:'var(--error)'}}>{currency}{d.total.toFixed(2)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
