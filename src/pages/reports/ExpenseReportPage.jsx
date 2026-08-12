import { useState, useEffect, useMemo, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { Receipt, Calendar, FileText } from 'lucide-react'
import { Bar, Doughnut } from 'react-chartjs-2'
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

ChartJS.register(ArcElement, Filler, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, whiteBackgroundPlugin)

export default function ExpenseReportPage() {
  const { company } = useAuth()
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
    const { data } = await supabase
      .from('expenses')
      .select('*, expense_accounts(name)')
      .eq('company_id', company.id)
      .order('expense_date', { ascending: true })

    setExpenses(data || [])
    setLoading(false)
  }

  // Filter data by selected date range
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      if (!e.expense_date) return false
      if (dateFrom && e.expense_date < dateFrom) return false
      if (dateTo && e.expense_date > dateTo) return false
      return true
    })
  }, [expenses, dateFrom, dateTo])

  const totalExpenses = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
  }, [filteredExpenses])

  const averageExpense = useMemo(() => {
    return filteredExpenses.length ? totalExpenses / filteredExpenses.length : 0
  }, [filteredExpenses, totalExpenses])

  // Chart: Monthly Expense Trend
  const expenseTrendChart = useMemo(() => {
    const periodMap = {}
    filteredExpenses.forEach(e => {
      const monthKey = e.expense_date ? e.expense_date.slice(0, 7) : 'Unknown'
      periodMap[monthKey] = (periodMap[monthKey] || 0) + (Number(e.amount) || 0)
    })
    const labels = Object.keys(periodMap).sort()
    const data = labels.map(k => periodMap[k])

    return {
      labels: labels.map(l => {
        if (l === 'Unknown') return l
        const [y, m] = l.split('-')
        const d = new Date(parseInt(y), parseInt(m) - 1, 1)
        return d.toLocaleString('en', { month: 'short', year: '2-digit' })
      }),
      datasets: [{
        label: 'Expenses',
        data,
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderColor: '#ef4444',
        borderWidth: 1,
        borderRadius: 6
      }]
    }
  }, [filteredExpenses])

  // Chart: Expense by Category
  const categoryChart = useMemo(() => {
    const map = {}
    filteredExpenses.forEach(e => {
      const cat = e.category || 'General'
      map[cat] = (map[cat] || 0) + (Number(e.amount) || 0)
    })
    const labels = Object.keys(map)
    const data = Object.values(map)
    const colors = ['#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#3b82f6', '#14b8a6', '#f97316']
    return {
      labels,
      datasets: [{ data, backgroundColor: colors.slice(0, labels.length), borderWidth: 0 }]
    }
  }, [filteredExpenses])

  // Chart: Expense by Account
  const accountChart = useMemo(() => {
    const map = {}
    filteredExpenses.forEach(e => {
      const acc = e.expense_accounts?.name || 'Unassigned'
      map[acc] = (map[acc] || 0) + (Number(e.amount) || 0)
    })
    const labels = Object.keys(map)
    const data = Object.values(map)
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
    return {
      labels,
      datasets: [{ data, backgroundColor: colors.slice(0, labels.length), borderWidth: 0 }]
    }
  }, [filteredExpenses])

  // Export Columns config
  const exportColumns = [
    { header: 'Expense Date', key: 'expense_date' },
    { header: 'Title / Description', key: 'title' },
    { header: 'Category', key: 'category' },
    { header: 'Account', key: 'account_name' },
    { header: 'Amount', key: 'amount' }
  ]

  const exportTableData = useMemo(() => {
    return filteredExpenses.map(e => ({
      expense_date: e.expense_date,
      title: e.title || e.description || '-',
      category: e.category || 'General',
      account_name: e.expense_accounts?.name || '-',
      amount: Number(e.amount) || 0
    }))
  }, [filteredExpenses])

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
      <SEO title="Expense Report" description="Comprehensive business expense analysis with custom date range selection." />
      
      <div className="page-header" style={{ flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title">Expense Reports</h1>
          <p className="page-subtitle">Track operational spending and expenditure breakdowns</p>
        </div>
        <ExportToolbar 
          tableData={exportTableData} 
          columns={exportColumns} 
          fileName={`Expense_Report_${dateFrom || 'all'}_to_${dateTo || 'all'}`}
          title={`Expense Report (${dateFrom || 'All Time'} - ${dateTo || 'Present'})`}
          currency={currency}
          reportRef={reportRef}
        />
      </div>

      {/* Date Filter Toolbar */}
      <div className="card" style={{ marginBottom: '24px', padding: '16px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <Calendar size={18} color="var(--error)" />
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
        <div className="stat-grid" style={{ marginBottom: '24px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.1)' }}><Receipt size={22} color="#ef4444" /></div>
            <div className="stat-info">
              <div className="stat-label">Total Expenses</div>
              <div className="stat-value" style={{ color: '#ef4444' }}>{currency} {totalExpenses.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(37, 99, 235, 0.1)' }}><FileText size={22} color="#2563eb" /></div>
            <div className="stat-info">
              <div className="stat-label">Expense Entries</div>
              <div className="stat-value">{filteredExpenses.length}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)' }}><Receipt size={22} color="#f59e0b" /></div>
            <div className="stat-info">
              <div className="stat-label">Average Expense</div>
              <div className="stat-value">{currency} {averageExpense.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        {!loading && (
          <>
            <div className="card" style={{ marginBottom: '24px' }}>
              <div className="card-header"><div className="card-title">Expense Trend</div></div>
              <div className="card-body" style={{ height: '320px' }}>
                <Bar 
                  data={expenseTrendChart} 
                  plugins={[whiteBackgroundPlugin]}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
                      x: { grid: { display: false } }
                    }
                  }} 
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px', marginBottom: '24px' }}>
              <div className="card">
                <div className="card-header"><div className="card-title">Expenses by Category</div></div>
                <div className="card-body" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '280px' }}>
                  {filteredExpenses.length > 0 ? (
                    <Doughnut 
                      data={categoryChart} 
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

              <div className="card">
                <div className="card-header"><div className="card-title">Expenses by Account</div></div>
                <div className="card-body" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '280px' }}>
                  {filteredExpenses.length > 0 ? (
                    <Doughnut 
                      data={accountChart} 
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

        {/* Detailed Breakdown Table */}
        <div className="card">
          <div className="card-header"><div className="card-title">Expense Records ({filteredExpenses.length})</div></div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Account</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px' }}>Loading expense data...</td></tr>
                ) : filteredExpenses.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No expense records found for the selected date range.</td></tr>
                ) : (
                  filteredExpenses.map(e => (
                    <tr key={e.id}>
                      <td style={{ fontWeight: 500 }}>{e.expense_date}</td>
                      <td style={{ fontWeight: 600 }}>{e.title || e.description || '-'}</td>
                      <td><span className="pill pill-blue">{e.category || 'General'}</span></td>
                      <td>{e.expense_accounts?.name || '-'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#ef4444' }}>{currency} {(Number(e.amount) || 0).toFixed(2)}</td>
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
