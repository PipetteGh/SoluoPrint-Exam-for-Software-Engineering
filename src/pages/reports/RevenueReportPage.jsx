import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { TrendingUp } from 'lucide-react'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js'
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

export default function RevenueReportPage() {
  const { company } = useAuth()
  const [data, setData] = useState([])
  const [period, setPeriod] = useState('monthly')
  const [loading, setLoading] = useState(true)
  const currency = company?.currency_symbol || '¢'

  useEffect(() => { if (company) load() }, [company, period])

  async function load() {
    const { data: jobs } = await supabase.from('print_jobs').select('total_price,amount_paid,created_at,category').eq('company_id', company.id)
    const { data: payments } = await supabase.from('payments').select('amount,payment_date').eq('company_id', company.id)
    
    // Group by month for last 6 months
    const months = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const month = d.toLocaleString('en', { month: 'short', year: '2-digit' })
      const monthStr = d.toISOString().slice(0, 7)
      const revenue = (payments || []).filter(p => p.payment_date?.startsWith(monthStr)).reduce((s, p) => s + (p.amount || 0), 0)
      const jobCount = (jobs || []).filter(j => j.created_at?.startsWith(monthStr)).length
      months.push({ month, revenue, jobCount })
    }
    setData(months)
    setLoading(false)
  }

  const totalRevenue = data.reduce((s, d) => s + d.revenue, 0)
  const totalJobs = data.reduce((s, d) => s + d.jobCount, 0)

  const chartData = {
    labels: data.map(d => d.month),
    datasets: [{ label: 'Revenue', data: data.map(d => d.revenue), backgroundColor: 'rgba(37,99,235,0.75)', borderRadius: 6, borderSkipped: false }]
  }

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Revenue Reports</h1><p className="page-subtitle">Track your income over time</p></div>
      </div>

      <div className="stat-grid" style={{gridTemplateColumns:'auto auto auto',maxWidth:'600px',marginBottom:'20px'}}>
        <div className="stat-card">
          <div className="stat-icon" style={{background:'#dcfce7'}}><TrendingUp size={22} color="#22c55e"/></div>
          <div className="stat-info"><div className="stat-label">Total Revenue (6mo)</div><div className="stat-value">{currency}{totalRevenue.toFixed(2)}</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{background:'#eff6ff'}}><TrendingUp size={22} color="#2563eb"/></div>
          <div className="stat-info"><div className="stat-label">Total Jobs (6mo)</div><div className="stat-value">{totalJobs}</div></div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Revenue Trend</div>
        </div>
        <div className="chart-container">
          {!loading && <Bar data={chartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }} />}
        </div>
      </div>

      <div className="card" style={{marginTop:'16px'}}>
        <div className="card-header"><div className="card-title">Monthly Breakdown</div></div>
        <div className="table-container">
          <table>
            <thead><tr><th>Month</th><th>Jobs</th><th>Revenue</th></tr></thead>
            <tbody>
              {data.map(d => (
                <tr key={d.month}>
                  <td style={{fontWeight:600}}>{d.month}</td>
                  <td>{d.jobCount}</td>
                  <td style={{fontWeight:700,color:'var(--success)'}}>{currency}{d.revenue.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
