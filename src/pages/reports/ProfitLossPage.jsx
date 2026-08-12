import { useState, useEffect, useMemo, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { BarChart2, TrendingUp, TrendingDown, Calendar } from 'lucide-react'
import { Bar, Line, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, Title, Tooltip, Legend, ArcElement, Filler
} from 'chart.js'
import ExportToolbar from '../../components/ui/ExportToolbar'
import SEO from '../../components/ui/SEO'

const whiteBackgroundPlugin = {
  id: 'customCanvasBackgroundColor',
  beforeDraw: (chart) => {
    const { ctx, width, height } = chart
    ctx.save()
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    ctx.restore()
  }
}

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, Filler, whiteBackgroundPlugin)

export default function ProfitLossPage() {
  const { company } = useAuth()
  const [payments, setPayments] = useState([])
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)

  // Date filtering state - default to current year
  const [dateFrom, setDateFrom] = useState(`${new Date().getFullYear()}-01-01`)
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0])

  const reportRef = useRef(null)
  const currency = company?.currency_symbol || '¢'

  useEffect(() => {
    if (company) loadData()
  }, [company])

  async function loadData() {
    setLoading(true)
    const { data: payData } = await supabase.from('payments').select('amount,payment_date').eq('company_id', company.id)
    const { data: expData } = await supabase.from('expenses').select('amount,expense_date').eq('company_id', company.id)

    setPayments(payData || [])
    setExpenses(expData || [])
    setLoading(false)
  }

  // Filter data by selected date range
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      if (!p.payment_date) return false
      if (dateFrom && p.payment_date < dateFrom) return false
      if (dateTo && p.payment_date > dateTo) return false
      return true
    })
  }, [payments, dateFrom, dateTo])

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      if (!e.expense_date) return false
      if (dateFrom && e.expense_date < dateFrom) return false
      if (dateTo && e.expense_date > dateTo) return false
      return true
    })
  }, [expenses, dateFrom, dateTo])

  // Group by period (month)
  const monthlyData = useMemo(() => {
    const monthsMap = {}

    filteredPayments.forEach(p => {
      const key = p.payment_date ? p.payment_date.slice(0, 7) : 'Unknown'
      if (!monthsMap[key]) monthsMap[key] = { revenue: 0, expense: 0 }
      monthsMap[key].revenue += Number(p.amount) || 0
    })

    filteredExpenses.forEach(e => {
      const key = e.expense_date ? e.expense_date.slice(0, 7) : 'Unknown'
      if (!monthsMap[key]) monthsMap[key] = { revenue: 0, expense: 0 }
      monthsMap[key].expense += Number(e.amount) || 0
    })

    const keys = Object.keys(monthsMap).sort()
    return keys.map(k => {
      const rev = monthsMap[k].revenue
      const exp = monthsMap[k].expense
      let label = k
      if (k !== 'Unknown') {
        const [y, m] = k.split('-')
        label = new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleString('en', { month: 'short', year: '2-digit' })
      }
      return {
        monthKey: k,
        month: label,
        revenue: rev,
        expense: exp,
        profit: rev - exp
      }
    })
  }, [filteredPayments, filteredExpenses])

  const totalRevenue = useMemo(() => filteredPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0), [filteredPayments])
  const totalExpense = useMemo(() => filteredExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0), [filteredExpenses])
  const totalProfit = totalRevenue - totalExpense

  // Chart: Bar (Revenue vs Expense)
  const barChartData = {
    labels: monthlyData.map(d => d.month),
    datasets: [
      {
        label: 'Revenue',
        data: monthlyData.map(d => d.revenue),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: '#22c55e',
        borderWidth: 1,
        borderRadius: 4
      },
      {
        label: 'Expenses',
        data: monthlyData.map(d => d.expense),
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderColor: '#ef4444',
        borderWidth: 1,
        borderRadius: 4
      }
    ]
  }

  // Chart: Line (Net Profit Trend)
  const lineChartData = {
    labels: monthlyData.map(d => d.month),
    datasets: [
      {
        label: 'Net Profit/Loss',
        data: monthlyData.map(d => d.profit),
        borderColor: totalProfit >= 0 ? '#22c55e' : '#ef4444',
        backgroundColor: totalProfit >= 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 5,
        pointBackgroundColor: monthlyData.map(d => d.profit >= 0 ? '#22c55e' : '#ef4444')
      }
    ]
  }

  // Chart: Doughnut (Ratio)
  const proportionChartData = {
    labels: ['Total Revenue', 'Total Expenses'],
    datasets: [{
      data: [totalRevenue, totalExpense],
      backgroundColor: ['#22c55e', '#ef4444'],
      borderWidth: 0
    }]
  }

  // Export Columns config
  const exportColumns = [
    { header: 'Month', key: 'month' },
    { header: 'Revenue', key: 'revenue' },
    { header: 'Expenses', key: 'expense' },
    { header: 'Net Profit', key: 'profit' }
  ]

  function setPreset(type) {
    const now = new Date()
    if (type === 'this_month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      const end = now.toISOString().split('T')[0]
      setDateFrom(start); setDateTo(end)
    } else if (type === 'this_year') {
      setDateFrom(`${now.getFullYear()}-01-01`)
      setDateTo(now.toISOString().split('T')[0])
    } else if (type === 'all_time') {
      setDateFrom('')
      setDateTo('')
    }
  }

  return (
    <div>
      <SEO title="Profit & Loss Report" description="Comprehensive net profit, revenue, and expenditure summary with custom date range selection." />
      
      <div className="page-header" style={{ flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title">Profit &amp; Loss</h1>
          <p className="page-subtitle">Financial performance overview and profitability trends</p>
        </div>
        <ExportToolbar 
          tableData={monthlyData} 
          columns={exportColumns} 
          fileName={`Profit_Loss_Report_${dateFrom || 'all'}_to_${dateTo || 'all'}`}
          title={`Profit & Loss Report (${dateFrom || 'All Time'} - ${dateTo || 'Present'})`}
          currency={currency}
          reportRef={reportRef}
        />
      </div>

      {/* Date Filter Toolbar */}
      <div className="card" style={{ marginBottom: '24px', padding: '16px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <Calendar size={18} color="var(--primary)" />
            <span style={{ fontWeight: 600, fontSize: '14px' }}>Filter Date Range:</span>
            <input 
              type="date" 
              className="form-control" 
              style={{ width: 'auto', fontSize: '13px' }} 
              value={dateFrom} 
              onChange={e => setDateFrom(e.target.value)} 
            />
            <span style={{ color: 'var(--text-muted)' }}>to</span>
            <input 
              type="date" 
              className="form-control" 
              style={{ width: 'auto', fontSize: '13px' }} 
              value={dateTo} 
              onChange={e => setDateTo(e.target.value)} 
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setPreset('this_month')}>This Month</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setPreset('this_year')}>This Year</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setPreset('all_time')}>All Time</button>
          </div>
        </div>
      </div>

      <div ref={reportRef} style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px' }}>
        <div className="stat-grid" style={{ marginBottom: '24px' }}>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#dcfce7' }}><TrendingUp size={22} color="#22c55e" /></div>
            <div className="stat-info">
              <div className="stat-label">Total Revenue</div>
              <div className="stat-value" style={{ color: 'var(--success)' }}>{currency} {totalRevenue.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#fee2e2' }}><TrendingDown size={22} color="#ef4444" /></div>
            <div className="stat-info">
              <div className="stat-label">Total Expenses</div>
              <div className="stat-value" style={{ color: 'var(--error)' }}>{currency} {totalExpense.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: totalProfit >= 0 ? '#dcfce7' : '#fee2e2' }}>
              <BarChart2 size={22} color={totalProfit >= 0 ? '#22c55e' : '#ef4444'} />
            </div>
            <div className="stat-info">
              <div className="stat-label">Net Profit / Loss</div>
              <div className="stat-value" style={{ color: totalProfit >= 0 ? 'var(--success)' : 'var(--error)' }}>
                {currency} {totalProfit.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        {!loading && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '24px' }}>
              <div className="card">
                <div className="card-header"><div className="card-title">Revenue vs Expenses Comparison</div></div>
                <div className="card-body" style={{ height: '320px' }}>
                  <Bar 
                    data={barChartData}
                    plugins={[whiteBackgroundPlugin]}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { position: 'top', labels: { usePointStyle: true, padding: 16 } } },
                      scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } }, x: { grid: { display: false } } }
                    }}
                  />
                </div>
              </div>

              <div className="card">
                <div className="card-header"><div className="card-title">Net Profit Trend</div></div>
                <div className="card-body" style={{ height: '320px' }}>
                  <Line 
                    data={lineChartData}
                    plugins={[whiteBackgroundPlugin]}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: { y: { grid: { color: 'rgba(0,0,0,0.05)' } }, x: { grid: { display: false } } }
                    }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '24px' }}>
              <div className="card">
                <div className="card-header"><div className="card-title">Revenue vs Expense Proportion</div></div>
                <div className="card-body" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '260px' }}>
                  {totalRevenue > 0 || totalExpense > 0 ? (
                    <Doughnut 
                      data={proportionChartData} 
                      plugins={[whiteBackgroundPlugin]}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        cutout: '60%',
                        plugins: { legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true } } }
                      }} 
                    />
                  ) : <div style={{ color: 'var(--text-muted)' }}>No data available</div>}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Monthly P&L Breakdown Table */}
        <div className="card">
          <div className="card-header"><div className="card-title">Monthly P&amp;L Breakdown</div></div>
          <div className="table-container">
            <table>
              <thead>
                <tr><th>Month</th><th>Revenue</th><th>Expenses</th><th>Net Profit</th></tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: '40px' }}>Loading financial data...</td></tr>
                ) : monthlyData.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No financial records found for the selected date range.</td></tr>
                ) : (
                  monthlyData.map(d => (
                    <tr key={d.monthKey}>
                      <td style={{ fontWeight: 600 }}>{d.month}</td>
                      <td style={{ color: 'var(--success)', fontWeight: 600 }}>{currency} {d.revenue.toFixed(2)}</td>
                      <td style={{ color: 'var(--error)', fontWeight: 600 }}>{currency} {d.expense.toFixed(2)}</td>
                      <td style={{ fontWeight: 700, color: d.profit >= 0 ? 'var(--success)' : 'var(--error)', fontSize: '15px' }}>
                        {d.profit >= 0 ? '+' : ''}{currency} {d.profit.toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
