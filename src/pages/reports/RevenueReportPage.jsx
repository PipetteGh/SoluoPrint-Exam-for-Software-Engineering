import { useState, useEffect, useMemo, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { TrendingUp, Calendar, Filter, FileText, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
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

export default function RevenueReportPage() {
  const { company } = useAuth()
  const [payments, setPayments] = useState([])
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Date filtering, search, and pagination state
  const [dateFrom, setDateFrom] = useState(`${new Date().getFullYear()}-01-01`)
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0])
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  
  const reportRef = useRef(null)
  const currency = company?.currency_symbol || '¢'

  useEffect(() => {
    if (company) loadData()
  }, [company])

  async function loadData() {
    setLoading(true)
    const { data: payData } = await supabase
      .from('payments')
      .select('*, customers(name), payment_accounts(name)')
      .eq('company_id', company.id)
      .order('payment_date', { ascending: false })

    const { data: jobData } = await supabase
      .from('print_jobs')
      .select('*, customers(name)')
      .eq('company_id', company.id)
      .order('job_date', { ascending: false })

    setPayments(payData || [])
    setJobs(jobData || [])
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

  // Search filtered records
  const searchedPayments = useMemo(() => {
    return filteredPayments.filter(p => {
      const cust = (p.customers?.name || '').toLowerCase()
      const method = (p.payment_method || '').toLowerCase()
      const notes = (p.notes || '').toLowerCase()
      const date = (p.payment_date || '').toLowerCase()
      const query = searchTerm.toLowerCase()
      return cust.includes(query) || method.includes(query) || notes.includes(query) || date.includes(query)
    })
  }, [filteredPayments, searchTerm])

  const paginatedPayments = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return searchedPayments.slice(start, start + itemsPerPage)
  }, [searchedPayments, currentPage])

  const totalPages = Math.ceil(searchedPayments.length / itemsPerPage) || 1

  const filteredJobs = useMemo(() => {
    return jobs.filter(j => {
      if (!j.job_date) return false
      if (dateFrom && j.job_date < dateFrom) return false
      if (dateTo && j.job_date > dateTo) return false
      return true
    })
  }, [jobs, dateFrom, dateTo])

  const totalRevenue = useMemo(() => {
    return filteredPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
  }, [filteredPayments])

  const totalJobRevenue = useMemo(() => {
    return filteredJobs.reduce((sum, j) => sum + (Number(j.total_price) || 0), 0)
  }, [filteredJobs])

  const averagePayment = useMemo(() => {
    return filteredPayments.length ? totalRevenue / filteredPayments.length : 0
  }, [filteredPayments, totalRevenue])

  // Chart: Monthly/Daily Revenue Trend
  const revenueTrendChart = useMemo(() => {
    const periodMap = {}
    filteredPayments.forEach(p => {
      const monthKey = p.payment_date ? p.payment_date.slice(0, 7) : 'Unknown'
      periodMap[monthKey] = (periodMap[monthKey] || 0) + (Number(p.amount) || 0)
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
        label: 'Revenue Received',
        data,
        backgroundColor: 'rgba(37, 99, 235, 0.8)',
        borderColor: '#2563eb',
        borderWidth: 1,
        borderRadius: 6
      }]
    }
  }, [filteredPayments])

  // Chart: Revenue by Payment Method
  const methodChart = useMemo(() => {
    const map = {}
    filteredPayments.forEach(p => {
      const m = p.payment_method || 'Cash'
      map[m] = (map[m] || 0) + (Number(p.amount) || 0)
    })
    const labels = Object.keys(map)
    const data = Object.values(map)
    const colors = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6']
    return {
      labels,
      datasets: [{ data, backgroundColor: colors.slice(0, labels.length), borderWidth: 0 }]
    }
  }, [filteredPayments])

  // Chart: Revenue by Job Category
  const categoryChart = useMemo(() => {
    const map = {}
    filteredJobs.forEach(j => {
      const cat = j.category || 'General'
      map[cat] = (map[cat] || 0) + (Number(j.total_price) || 0)
    })
    const labels = Object.keys(map)
    const data = Object.values(map)
    const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#f97316']
    return {
      labels,
      datasets: [{ data, backgroundColor: colors.slice(0, labels.length), borderWidth: 0 }]
    }
  }, [filteredJobs])

  // Table Export columns configuration
  const exportColumns = [
    { header: 'Payment Date', key: 'payment_date' },
    { header: 'Customer', key: 'customer_name' },
    { header: 'Amount', key: 'amount' },
    { header: 'Payment Method', key: 'payment_method' },
    { header: 'Notes', key: 'notes' }
  ]

  const exportTableData = useMemo(() => {
    return searchedPayments.map(p => ({
      payment_date: p.payment_date,
      customer_name: p.customers?.name || 'N/A',
      amount: Number(p.amount) || 0,
      payment_method: p.payment_method || '-',
      notes: p.notes || '-'
    }))
  }, [searchedPayments])

  // Preset Date helper
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
      <SEO title="Revenue Report" description="Comprehensive revenue and income reports with custom date range selection." />
      
      <div className="page-header" style={{ flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title">Revenue Reports</h1>
          <p className="page-subtitle">Detailed breakdown of revenue collections and sales performance</p>
        </div>
        <ExportToolbar 
          tableData={exportTableData} 
          columns={exportColumns} 
          fileName={`Revenue_Report_${dateFrom || 'all'}_to_${dateTo || 'all'}`}
          title={`Revenue Report (${dateFrom || 'All Time'} - ${dateTo || 'Present'})`}
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

      {/* Container wrapper for image capture export */}
      <div ref={reportRef} style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px' }}>
        <div className="stat-grid" style={{ marginBottom: '24px' }}>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(34, 197, 94, 0.1)' }}><TrendingUp size={22} color="#22c55e" /></div>
            <div className="stat-info">
              <div className="stat-label">Total Revenue Collected</div>
              <div className="stat-value" style={{ color: '#22c55e' }}>{currency} {totalRevenue.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(37, 99, 235, 0.1)' }}><FileText size={22} color="#2563eb" /></div>
            <div className="stat-info">
              <div className="stat-label">Total Invoiced Jobs</div>
              <div className="stat-value">{currency} {totalJobRevenue.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.1)' }}><TrendingUp size={22} color="#8b5cf6" /></div>
            <div className="stat-info">
              <div className="stat-label">Total Transactions</div>
              <div className="stat-value">{filteredPayments.length}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)' }}><TrendingUp size={22} color="#f59e0b" /></div>
            <div className="stat-info">
              <div className="stat-label">Avg Payment Size</div>
              <div className="stat-value">{currency} {averagePayment.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        {!loading && (
          <>
            <div className="card" style={{ marginBottom: '24px' }}>
              <div className="card-header"><div className="card-title">Revenue Collection Trend</div></div>
              <div className="card-body" style={{ height: '320px' }}>
                <Bar 
                  data={revenueTrendChart} 
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
                <div className="card-header"><div className="card-title">Revenue by Payment Method</div></div>
                <div className="card-body" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '280px' }}>
                  {filteredPayments.length > 0 ? (
                    <Doughnut 
                      data={methodChart} 
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
                <div className="card-header"><div className="card-title">Invoiced Revenue by Category</div></div>
                <div className="card-body" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '280px' }}>
                  {filteredJobs.length > 0 ? (
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
            </div>
          </>
        )}

        {/* Detailed Breakdown Table */}
        <div className="card" style={{ padding: 0 }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div className="card-title">Payment Collections Record ({searchedPayments.length})</div>
            <div style={{ position: 'relative', width: '280px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                className="form-control" 
                placeholder="Search records..." 
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
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Payment Method</th>
                  <th>Notes</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px' }}>Loading revenue data...</td></tr>
                ) : searchedPayments.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No payment records found matching search query.</td></tr>
                ) : (
                  paginatedPayments.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 500 }}>{p.payment_date}</td>
                      <td style={{ fontWeight: 600 }}>{p.customers?.name || 'N/A'}</td>
                      <td><span className="pill pill-blue">{p.payment_method || 'Cash'}</span></td>
                      <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{p.notes || '-'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#22c55e' }}>{currency} {(Number(p.amount) || 0).toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {searchedPayments.length > 0 && (
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, searchedPayments.length)} of {searchedPayments.length} records
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
    </div>
  )
}
