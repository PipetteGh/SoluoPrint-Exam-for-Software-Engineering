import { useState, useEffect, useMemo, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { CreditCard, Plus, Trash2, Calendar, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import NewPaymentModal from '../components/modals/NewPaymentModal'
import { TableSkeleton, StatSkeleton } from '../components/ui/Skeletons'
import SEO from '../components/ui/SEO'
import ExportToolbar from '../components/ui/ExportToolbar'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, Title, Tooltip, Legend, ArcElement, Filler
} from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'

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

export default function PaymentsPage() {
  const { company } = useAuth()
  const [payments, setPayments] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState(`${new Date().getFullYear()}-01-01`)
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0])
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const reportRef = useRef(null)
  const currency = company?.currency_symbol || '¢'

  useEffect(() => { if (company) load() }, [company])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('payments').select('*,customers(name),payment_accounts(name)')
      .eq('company_id', company.id).order('created_at', { ascending: false })
    setPayments(data || [])
    setLoading(false)
  }

  const filtered = useMemo(() => {
    return payments.filter(p => {
      if (!p.payment_date) return false
      if (dateFrom && p.payment_date < dateFrom) return false
      if (dateTo && p.payment_date > dateTo) return false
      return true
    })
  }, [payments, dateFrom, dateTo])

  const searched = useMemo(() => {
    return filtered.filter(p => {
      const cust = (p.customers?.name || '').toLowerCase()
      const method = (p.payment_method || '').toLowerCase()
      const account = (p.payment_accounts?.name || '').toLowerCase()
      const notes = (p.notes || '').toLowerCase()
      const query = searchTerm.toLowerCase()
      return cust.includes(query) || method.includes(query) || account.includes(query) || notes.includes(query)
    })
  }, [filtered, searchTerm])

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return searched.slice(start, start + itemsPerPage)
  }, [searched, currentPage])

  const totalPages = Math.ceil(searched.length / itemsPerPage) || 1

  const stats = useMemo(() => {
    const total = filtered.reduce((s, p) => s + (Number(p.amount) || 0), 0)
    const count = filtered.length
    const todayStr = new Date().toISOString().split('T')[0]
    const today = filtered.filter(p => p.payment_date === todayStr).reduce((s, p) => s + (Number(p.amount) || 0), 0)
    const avg = count > 0 ? total / count : 0
    return { total, count, today, avg }
  }, [filtered])

  // Chart: Monthly Payment Collections
  const monthlyPaymentsChart = useMemo(() => {
    const monthMap = {}
    filtered.forEach(p => {
      const monthKey = p.payment_date ? p.payment_date.slice(0, 7) : 'Unknown'
      monthMap[monthKey] = (monthMap[monthKey] || 0) + (Number(p.amount) || 0)
    })
    const labels = Object.keys(monthMap).sort()
    const data = labels.map(k => monthMap[k])

    return {
      labels: labels.map(l => {
        if (l === 'Unknown') return l
        const [y, m] = l.split('-')
        return new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleString('en', { month: 'short', year: '2-digit' })
      }),
      datasets: [{
        label: 'Payment Collected',
        data,
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: '#22c55e',
        borderWidth: 1,
        borderRadius: 6
      }]
    }
  }, [filtered])

  // Chart: Payment Method Distribution
  const methodChart = useMemo(() => {
    const methodCounts = {}
    filtered.forEach(p => {
      const m = p.payment_method || 'Other'
      methodCounts[m] = (methodCounts[m] || 0) + (Number(p.amount) || 0)
    })
    const labels = Object.keys(methodCounts)
    const data = Object.values(methodCounts)
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']
    return { labels, datasets: [{ data, backgroundColor: colors.slice(0, labels.length), borderWidth: 0 }] }
  }, [filtered])

  // Chart: Top Paying Customers
  const topCustomersChart = useMemo(() => {
    const customerMap = {}
    filtered.forEach(p => {
      const cName = p.customers?.name || 'Walk-in Customer'
      customerMap[cName] = (customerMap[cName] || 0) + (Number(p.amount) || 0)
    })
    const sorted = Object.entries(customerMap).sort((a, b) => b[1] - a[1]).slice(0, 5)
    const labels = sorted.map(s => s[0])
    const data = sorted.map(s => s[1])
    return {
      labels,
      datasets: [{
        label: 'Total Paid',
        data,
        backgroundColor: 'rgba(37, 99, 235, 0.8)',
        borderColor: '#2563eb',
        borderWidth: 1,
        borderRadius: 6
      }]
    }
  }, [filtered])

  // Export Columns config
  const exportColumns = [
    { header: 'Payment Date', key: 'payment_date' },
    { header: 'Customer Name', key: 'customer_name' },
    { header: 'Amount', key: 'amount' },
    { header: 'Payment Method', key: 'payment_method' },
    { header: 'Account', key: 'account_name' },
    { header: 'Notes', key: 'notes' }
  ]

  const exportTableData = useMemo(() => {
    return searched.map(p => ({
      payment_date: p.payment_date,
      customer_name: p.customers?.name || '-',
      amount: Number(p.amount) || 0,
      payment_method: p.payment_method || '-',
      account_name: p.payment_accounts?.name || '-',
      notes: p.notes || '-'
    }))
  }, [searched])

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
    setCurrentPage(1)
  }

  return (
    <div>
      <SEO title="Payments" description="Monitor payment transactions, receipts, and revenue collection history." />
      
      <div className="page-header" style={{ flexWrap: 'wrap', gap: '16px' }}>
        <div><h1 className="page-title">Payments</h1><p className="page-subtitle">Track all payment transactions &amp; collection analysis</p></div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <ExportToolbar 
            tableData={exportTableData} 
            columns={exportColumns} 
            fileName={`Payments_Report_${dateFrom || 'all'}_to_${dateTo || 'all'}`}
            title={`Payment Collections Report (${dateFrom || 'All Time'} - ${dateTo || 'Present'})`}
            currency={currency}
            reportRef={reportRef}
          />
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}><Plus size={16} /> Record Payment</button>
        </div>
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
              onChange={e => { setDateFrom(e.target.value); setCurrentPage(1); }} 
            />
            <span style={{ color: 'var(--text-muted)' }}>to</span>
            <input 
              type="date" 
              className="form-control" 
              style={{ width: 'auto', fontSize: '13px' }} 
              value={dateTo} 
              onChange={e => { setDateTo(e.target.value); setCurrentPage(1); }} 
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
                <div className="stat-info"><div className="stat-label">Total Received</div><div className="stat-value" style={{color:'#22c55e'}}>{currency}{stats.total.toLocaleString('en', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div></div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{background:'#eff6ff'}}><CreditCard size={22} color="#2563eb"/></div>
                <div className="stat-info"><div className="stat-label">Total Transactions</div><div className="stat-value">{stats.count}</div></div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{background:'#fef3c7'}}><CreditCard size={22} color="#f59e0b"/></div>
                <div className="stat-info"><div className="stat-label">Today's Received</div><div className="stat-value">{currency}{stats.today.toLocaleString('en', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div></div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{background:'#f3e8ff'}}><CreditCard size={22} color="#9333ea"/></div>
                <div className="stat-info"><div className="stat-label">Average Payment</div><div className="stat-value">{currency}{stats.avg.toLocaleString('en', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div></div>
              </div>
            </>
          )}
        </div>

        {/* Charts */}
        {!loading && filtered.length > 0 && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '24px', marginBottom: '24px' }}>
              <div className="card">
                <div className="card-header"><div className="card-title">Collections Trend</div></div>
                <div className="card-body" style={{ height: '300px' }}>
                  <Bar 
                    data={monthlyPaymentsChart}
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

              <div className="card">
                <div className="card-header"><div className="card-title">Payment Method Breakdown</div></div>
                <div className="card-body" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
                  <Doughnut 
                    data={methodChart}
                    plugins={[whiteBackgroundPlugin]}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      cutout: '60%',
                      plugins: {
                        legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true, pointStyle: 'circle' } }
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '24px', marginBottom: '24px' }}>
              <div className="card">
                <div className="card-header"><div className="card-title">Top Paying Customers</div></div>
                <div className="card-body" style={{ height: '280px' }}>
                  <Bar 
                    data={topCustomersChart}
                    plugins={[whiteBackgroundPlugin]}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      indexAxis: 'y',
                      plugins: { legend: { display: false } },
                      scales: {
                        x: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
                        y: { grid: { display: false } }
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </>
        )}

        <div className="card" style={{ padding: 0 }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div className="card-title">Payment Records ({searched.length})</div>
            <div style={{ position: 'relative', width: '280px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                className="form-control" 
                placeholder="Search payments..." 
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                style={{ paddingLeft: '36px', height: '36px', fontSize: '13px' }}
              />
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
                ) : searched.length === 0 ? (
                  <tr><td colSpan={7}><div className="empty-state"><CreditCard/><h3>No payments</h3><p>Record your first payment or adjust search/filters</p></div></td></tr>
                ) : paginated.map(p => (
                  <tr key={p.id}>
                    <td style={{fontSize:'12px', fontWeight:500}}>{p.payment_date}</td>
                    <td style={{fontWeight:600}}>{p.customers?.name || '-'}</td>
                    <td style={{fontWeight:700,color:'var(--success)'}}>{currency}{(p.amount||0).toFixed(2)}</td>
                    <td><span className="pill pill-blue">{p.payment_method}</span></td>
                    <td>{p.payment_accounts?.name || '-'}</td>
                    <td style={{color:'var(--text-muted)',fontSize:'12px'}}>{p.notes || '-'}</td>
                    <td>
                      <button className="action-btn danger" onClick={async()=>{if(confirm('Delete?')){await supabase.from('payments').delete().eq('id',p.id);load()}}}>
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
      </div>

      {showAdd && <NewPaymentModal onClose={() => setShowAdd(false)} onSuccess={load} />}
    </div>
  )
}
