import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { recalculateCustomerBalance } from '../lib/balanceUtils'
import { LogOut, FileText, CheckCircle, Clock, CreditCard, Plus, Receipt, Search, ChevronLeft, ChevronRight, LayoutDashboard, User, HelpCircle, ClipboardList } from 'lucide-react'
import SEO from '../components/ui/SEO'
import ExportToolbar from '../components/ui/ExportToolbar'
import FileGallery from '../components/ui/FileGallery'
import CustomerJobUploadModal from '../components/modals/CustomerJobUploadModal'
import CustomerPaymentModal from '../components/modals/CustomerPaymentModal'
import ReceiptModal from '../components/modals/ReceiptModal'
import SupportChatWidget from '../components/chat/SupportChatWidget'
import OnboardingTour from '../components/ui/OnboardingTour'
import Preloader from '../components/ui/Preloader'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, Title, Tooltip, Legend, ArcElement, Filler
} from 'chart.js'
import { Bar, Doughnut, Line } from 'react-chartjs-2'

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

function formatDateTime(dateStr) {
  if (!dateStr) return 'N/A'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
}

export default function CustomerPortal() {
  const [customer, setCustomer] = useState(null)
  const [jobs, setJobs] = useState([])
  const [stagedJobs, setStagedJobs] = useState([])
  const [payments, setPayments] = useState([])
  const [totalPayments, setTotalPayments] = useState(0)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [gatewaysActive, setGatewaysActive] = useState(false)
  const [selectedJobToPay, setSelectedJobToPay] = useState(null)
  const [selectedJobForReceipt, setSelectedJobForReceipt] = useState(null)
  const [runTour, setRunTour] = useState(false)
  
  // Pagination & Search state
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const jobsPerPage = 10
  const reportRef = useRef(null)

  const exportColumns = [
    { header: 'Job Number', key: 'job_number' },
    { header: 'Category', key: 'category' },
    { header: 'Date', key: 'job_date' },
    { header: 'Status', key: 'status' },
    { header: 'Total Price', key: 'total_price' },
    { header: 'Balance Owed', key: 'balance' }
  ]

  const exportTableData = useMemo(() => {
    return jobs.map(j => ({
      job_number: j.job_number || 'N/A',
      category: j.category || 'General',
      job_date: j.job_date,
      status: j.status || 'Pending',
      total_price: Number(j.total_price) || 0,
      balance: Number(j.balance) || 0
    }))
  }, [jobs])

  useEffect(() => {
    loadData()
    const custId = localStorage.getItem('soluoprint_customer_id')
    if (!custId) return

    // Supabase Real-time listener for customer jobs
    const channel = supabase
      .channel(`public:customer:${custId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'print_jobs', filter: `customer_id=eq.${custId}` },
        () => {
          loadData()
        }
      )
      .subscribe()

    // Silent background heartbeat timer
    const interval = setInterval(loadData, 5000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [])

  async function loadData() {
    const custId = localStorage.getItem('soluoprint_customer_id')
    if (!custId) {
      navigate('/customer-login')
      return
    }

    // Recalculate customer balance with 100% financial integrity before loading
    await recalculateCustomerBalance(custId)

    const { data: cust, error: custErr } = await supabase
      .from('customers')
      .select('*, companies(name, currency_symbol)')
      .eq('id', custId)
      .single()
      
    if (custErr || !cust) {
      navigate('/customer-login')
      return
    }
    setCustomer(cust)

    // Check payment gateways
    const { data: gatewayData } = await supabase
      .from('payment_gateways')
      .select('*')
      .eq('company_id', cust.company_id)
      .single()
      
    if (gatewayData && (gatewayData.paystack_active || gatewayData.hubtel_active || gatewayData.flutterwave_active)) {
      setGatewaysActive(true)
    }

    // Fetch print jobs
    const { data: jobData } = await supabase
      .from('print_jobs')
      .select('*')
      .eq('customer_id', custId)
      .order('created_at', { ascending: false })
    
    setJobs(jobData || [])

    // Fetch staged jobs from job_list (uploaded jobs pending shop conversion)
    const { data: stagedData } = await supabase
      .from('job_list')
      .select('*')
      .eq('customer_id', custId)
      .order('created_at', { ascending: false })

    setStagedJobs(stagedData || [])

    // Fetch payments and calculate total amount
    const { data: paymentsData } = await supabase
      .from('payments')
      .select('amount,payment_date,payment_method')
      .eq('customer_id', custId)

    setPayments(paymentsData || [])
    const totalPaid = (paymentsData || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
    setTotalPayments(totalPaid)

    setLoading(false)
  }

  function handleLogout() {
    localStorage.removeItem('soluoprint_customer_id')
    navigate('/customer-login')
  }

  // ---- ALL hooks BEFORE any conditional returns ----

  const activeJobs = useMemo(() => jobs.filter(j => j.status !== 'Completed' && j.status !== 'Delivered' && j.status !== 'completed' && j.status !== 'delivered'), [jobs])
  const completedJobs = useMemo(() => jobs.filter(j => j.status === 'Completed' || j.status === 'Delivered' || j.status === 'completed' || j.status === 'delivered'), [jobs])
  const currency = customer?.companies?.currency_symbol || '¢'

  // Search and Pagination logic
  const filteredJobs = useMemo(() => {
    return jobs.filter(j => 
      (j.job_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (j.category || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [jobs, searchTerm])

  const paginatedJobs = useMemo(() => {
    const start = (currentPage - 1) * jobsPerPage
    return filteredJobs.slice(start, start + jobsPerPage)
  }, [filteredJobs, currentPage])

  const totalPages = Math.ceil(filteredJobs.length / jobsPerPage) || 1

  // Chart: Monthly Spending
  const monthlySpendingChart = useMemo(() => {
    const data = Array(12).fill(0)
    jobs.forEach(j => {
      if (j.job_date) {
        const d = new Date(j.job_date)
        if (d.getFullYear() === new Date().getFullYear()) {
          data[d.getMonth()] += Number(j.total_price) || 0
        }
      }
    })
    return {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      datasets: [{
        label: 'Total Ordered',
        data,
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: '#3b82f6',
        borderWidth: 1,
        borderRadius: 6
      }]
    }
  }, [jobs])

  // Chart: Job Status Distribution (Doughnut)
  const jobStatusChart = useMemo(() => {
    const statusCounts = {}
    jobs.forEach(j => {
      const s = j.status || 'Pending'
      statusCounts[s] = (statusCounts[s] || 0) + 1
    })
    const labels = Object.keys(statusCounts)
    const data = Object.values(statusCounts)
    const colors = labels.map(l => {
      const lower = l.toLowerCase()
      if (lower === 'completed' || lower === 'delivered') return '#10b981'
      if (lower === 'pending') return '#f59e0b'
      if (lower === 'in progress' || lower === 'in-progress') return '#3b82f6'
      if (lower === 'cancelled') return '#ef4444'
      return '#8b5cf6'
    })
    return { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0 }] }
  }, [jobs])

  // Chart: Payment Trend (Line)
  const paymentTrendChart = useMemo(() => {
    const monthData = Array(12).fill(0)
    payments.forEach(p => {
      if (p.payment_date) {
        const d = new Date(p.payment_date)
        if (d.getFullYear() === new Date().getFullYear()) {
          monthData[d.getMonth()] += Number(p.amount) || 0
        }
      }
    })
    return {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      datasets: [{
        label: 'Payments Made',
        data: monthData,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: '#10b981'
      }]
    }
  }, [payments])

  // Chart: Category Distribution (Doughnut)
  const categoryChart = useMemo(() => {
    const catCounts = {}
    jobs.forEach(j => {
      const c = j.category || 'General'
      catCounts[c] = (catCounts[c] || 0) + 1
    })
    const labels = Object.keys(catCounts)
    const data = Object.values(catCounts)
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']
    return { labels, datasets: [{ data, backgroundColor: colors.slice(0, labels.length), borderWidth: 0 }] }
  }, [jobs])

  // ---- NOW the loading guard ----
  if (loading) return <Preloader fullScreen />

  // Render different tabs
  const renderContent = () => {
    if (activeTab === 'dashboard') {
      return (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
            <h1 style={{ fontSize: '28px', margin: 0 }}>Welcome back, {customer.name.split(' ')[0]}!</h1>
            
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <ExportToolbar 
                tableData={exportTableData} 
                columns={exportColumns} 
                fileName={`Customer_Portal_Report_${customer.name.replace(/\s+/g, '_')}`}
                title={`${customer.companies?.name || 'SoluoPrint'} - ${customer.name}'s Portal Summary`}
                currency={currency}
                reportRef={reportRef}
              />
              <button className="btn btn-primary" onClick={() => setShowUploadModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={18} /> Upload New Job
              </button>
            </div>
          </div>
          
          <div ref={reportRef} style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px' }}>
          
          {/* Stat Cards - matching admin dashboard spacing */}
          <div className="stat-grid" style={{ marginBottom: '32px' }}>
            <div className="stat-card" style={{ position: 'relative' }}>
              <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.1)' }}><CreditCard size={22} color="#ef4444" /></div>
              <div className="stat-info">
                <div className="stat-label">Outstanding Balance</div>
                <div className="stat-value" style={{ color: Number(customer?.balance || 0) > 0 ? '#ef4444' : '#10b981' }}>
                  {currency} {Math.max(0, Number(customer?.balance || 0)).toLocaleString('en', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </div>
              </div>
              {Number(customer.balance) > 0 && gatewaysActive && (
                <button 
                  className="btn btn-primary btn-sm" 
                  style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)' }}
                  onClick={() => setShowPaymentModal(true)}
                >
                  Pay Now
                </button>
              )}
            </div>
            
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)' }}><Clock size={22} color="#f59e0b" /></div>
              <div className="stat-info">
                <div className="stat-label">Active Jobs</div>
                <div className="stat-value">{activeJobs.length}</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)' }}><CheckCircle size={22} color="#10b981" /></div>
              <div className="stat-info">
                <div className="stat-label">Completed Jobs</div>
                <div className="stat-value">{completedJobs.length}</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(99, 102, 241, 0.1)' }}><Receipt size={22} color="#6366f1" /></div>
              <div className="stat-info">
                <div className="stat-label">Total Payments</div>
                <div className="stat-value">{currency} {Number(totalPayments).toLocaleString('en', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '32px' }}>
            <div className="card">
              <div className="card-header"><div className="card-title">Monthly Spending ({new Date().getFullYear()})</div></div>
              <div className="card-body" style={{ height: '300px' }}>
                <Bar 
                  data={monthlySpendingChart} 
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
              <div className="card-header"><div className="card-title">Payment Trend ({new Date().getFullYear()})</div></div>
              <div className="card-body" style={{ height: '300px' }}>
                <Line 
                  data={paymentTrendChart}
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
          </div>

          {/* Second Charts Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '32px' }}>
            <div className="card">
              <div className="card-header"><div className="card-title">Job Status Distribution</div></div>
              <div className="card-body" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '280px' }}>
                {jobs.length > 0 ? (
                  <Doughnut 
                    data={jobStatusChart}
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
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    <FileText size={40} style={{ opacity: 0.2, marginBottom: '8px' }} />
                    <p>No jobs yet</p>
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-header"><div className="card-title">Job Categories</div></div>
              <div className="card-body" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '280px' }}>
                {jobs.length > 0 ? (
                  <Doughnut 
                    data={categoryChart}
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
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    <FileText size={40} style={{ opacity: 0.2, marginBottom: '8px' }} />
                    <p>No jobs yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recent Jobs Table */}
          <div className="card" style={{ padding: '0' }}>
            <div className="card-header">
              <div className="card-title">Recent Print Jobs</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setActiveTab('jobs')}>View All</button>
            </div>
            
            {jobs.length === 0 ? (
              <div style={{ padding: '60px 40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <FileText size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
                <p>You have no print jobs yet.</p>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Job Number</th>
                      <th>Category</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                      <th style={{ textAlign: 'right' }}>Balance</th>
                      <th style={{ width: '80px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.slice(0, 10).map(job => (
                      <tr key={job.id}>
                        <td style={{ fontWeight: 500 }}>
                          <button 
                            onClick={() => setSelectedJobForReceipt(job)}
                            style={{ background: 'none', border: 'none', padding: 0, color: '#2563eb', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'underline' }}
                            title="Click to view Invoice/Receipt"
                          >
                            <Receipt size={14} />
                            <span>{job.job_number || 'N/A'}</span>
                          </button>
                          {job.design_file_url && (
                            <a 
                              href={job.design_file_url} 
                              target="_blank" 
                              rel="noreferrer" 
                              style={{ 
                                marginLeft: '8px', 
                                fontSize: '11px', 
                                fontWeight: 600,
                                background: '#eff6ff', 
                                color: '#2563eb', 
                                border: '1px solid #bfdbfe',
                                padding: '2px 8px', 
                                borderRadius: '12px',
                                textDecoration: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                              title="View or download uploaded artwork file"
                            >
                              📄 Artwork
                            </a>
                          )}
                        </td>
                        <td>{job.category || 'General'}</td>
                        <td>{formatDateTime(job.job_date || job.created_at)}</td>
                        <td>
                          <span className={`status-badge status-${job.status?.toLowerCase().replace(' ', '-') || 'pending'}`}>
                            {job.status || 'Pending'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>{currency} {Number(job.total_price || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td style={{ textAlign: 'right' }}>{currency} {Number(job.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => setSelectedJobForReceipt(job)} title="View Receipt">
                              Receipt
                            </button>
                            {Number(job.balance) > 0 && gatewaysActive && (
                              <button className="btn btn-primary btn-sm" onClick={() => setSelectedJobToPay(job)}>Pay</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        </>
      )
    }

    if (activeTab === 'jobs') {
      return (
        <>
          <div className="page-header">
            <div>
              <h1 className="page-title">My Print Jobs</h1>
              <div className="page-subtitle">View and track all your orders</div>
            </div>
            <button className="btn btn-primary" onClick={() => setShowUploadModal(true)}>
              <Plus size={16} /> Upload New Job
            </button>
          </div>
          <div className="card" style={{ padding: 0 }}>
            <div className="card-header">
              <div style={{ position: 'relative', width: '300px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Search jobs..." 
                  value={searchTerm}
                  onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  style={{ paddingLeft: '36px' }}
                />
              </div>
            </div>
            {filteredJobs.length === 0 ? (
              <div style={{ padding: '60px 40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <FileText size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
                <p>No jobs found.</p>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Job Number</th>
                      <th>Category</th>
                      <th>Details</th>
                      <th>Date & Time</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                      <th style={{ textAlign: 'right' }}>Balance</th>
                      <th style={{ width: '140px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedJobs.map(job => (
                      <tr key={job.id}>
                        <td style={{ fontWeight: 500 }}>
                          <button 
                            onClick={() => setSelectedJobForReceipt(job)}
                            style={{ background: 'none', border: 'none', padding: 0, color: '#2563eb', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'underline' }}
                            title="Click to view Invoice/Receipt"
                          >
                            <Receipt size={14} />
                            <span>{job.job_number || 'N/A'}</span>
                          </button>
                          {job.design_file_url && (
                            <a 
                              href={job.design_file_url} 
                              target="_blank" 
                              rel="noreferrer" 
                              style={{ 
                                marginLeft: '8px', 
                                fontSize: '11px', 
                                fontWeight: 600,
                                background: '#eff6ff', 
                                color: '#2563eb', 
                                border: '1px solid #bfdbfe',
                                padding: '2px 8px', 
                                borderRadius: '12px',
                                textDecoration: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                              title="View or download uploaded artwork file"
                            >
                              📄 Artwork
                            </a>
                          )}
                        </td>
                        <td>{job.category || 'General'}</td>
                        <td>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {job.quantity}x {job.width && job.height ? `${job.width}x${job.height} ${job.unit}` : ''}
                          </div>
                        </td>
                        <td>{formatDateTime(job.job_date || job.created_at)}</td>
                        <td>
                          <span className={`status-badge status-${job.status?.toLowerCase().replace(' ', '-') || 'pending'}`}>
                            {job.status || 'Pending'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>{currency} {Number(job.total_price || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td style={{ textAlign: 'right' }}>{currency} {Number(job.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => setSelectedJobForReceipt(job)} title="View Receipt">
                              Receipt
                            </button>
                            {Number(job.balance) > 0 && gatewaysActive && (
                              <button className="btn btn-primary btn-sm" onClick={() => setSelectedJobToPay(job)}>Pay</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {filteredJobs.length > 0 && (
              <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Showing {((currentPage - 1) * jobsPerPage) + 1} to {Math.min(currentPage * jobsPerPage, filteredJobs.length)} of {filteredJobs.length} jobs
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
        </>
      )
    }

    if (activeTab === 'staged') {
      return (
        <>
          <div className="page-header">
            <div>
              <h1 className="page-title">Job List (Staged Uploads)</h1>
              <div className="page-subtitle">Your uploaded jobs waiting for shop review & pricing</div>
            </div>
            <button className="btn btn-primary" onClick={() => setShowUploadModal(true)}>
              <Plus size={16} /> Upload New Job
            </button>
          </div>

          <div style={{ display: 'grid', gap: '20px' }}>
            {stagedJobs.length === 0 ? (
              <div className="card" style={{ padding: '60px 40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <ClipboardList size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
                <h3>No staged jobs uploaded yet</h3>
                <p style={{ fontSize: '13px' }}>Upload your design files or artwork and the shop will review and convert them into print jobs.</p>
                <button className="btn btn-primary" onClick={() => setShowUploadModal(true)} style={{ marginTop: '12px' }}>
                  <Plus size={16} /> Upload Your First Job
                </button>
              </div>
            ) : (
              stagedJobs.map(item => (
                <div key={item.id} className="card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '16px', color: '#1e293b' }}>
                        {item.description || 'Custom Print Upload'}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Uploaded on {new Date(item.created_at).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(item.created_at).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <span className={`status-badge status-${item.status?.toLowerCase() === 'converted' ? 'completed' : 'pending'}`}>
                      {item.status === 'Converted' ? 'Converted to Print Job' : 'Pending Shop Review'}
                    </span>
                  </div>

                  {item.notes && (
                    <div style={{ fontSize: '13px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', color: '#92400e' }}>
                      <strong>Instructions:</strong> {item.notes}
                    </div>
                  )}

                  {(item.images || []).length > 0 && (
                    <FileGallery files={item.images} title="Attached Artwork & Documents" />
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )
    }

    if (activeTab === 'profile') {
      return (
        <>
          <div className="page-header">
            <div>
              <h1 className="page-title">My Profile</h1>
              <div className="page-subtitle">Your personal and contact details</div>
            </div>
          </div>
          <div className="card" style={{ maxWidth: '600px' }}>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input type="text" className="form-control" value={customer.name} disabled />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="text" className="form-control" value={customer.email || 'N/A'} disabled />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input type="text" className="form-control" value={customer.phone || 'N/A'} disabled />
              </div>
              <div className="form-group">
                <label className="form-label">Address</label>
                <input type="text" className="form-control" value={customer.address || 'N/A'} disabled />
              </div>
            </div>
          </div>
        </>
      )
    }
  }

  return (
    <div className="app-layout">
      <SEO title="Customer Portal" />
      
      {/* Sidebar Overlay (Mobile) */}
      <div className={`sidebar-overlay ${sidebarOpen ? 'show' : ''}`} onClick={() => setSidebarOpen(false)}></div>
      
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo" style={{ cursor: 'default' }}>
            <div className="sidebar-logo-icon">{(customer.companies?.name || 'S')[0].toUpperCase()}</div>
            <span className="sidebar-logo-text" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
              {customer.companies?.name || 'SoluoPrint'}
            </span>
          </div>
        </div>

        <nav className="sidebar-nav" style={{ marginTop: '10px' }}>
          <button 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} 
            onClick={() => { setActiveTab('dashboard'); setSidebarOpen(false) }}
          >
            <LayoutDashboard />
            <span>Dashboard</span>
          </button>
          <button 
            className={`nav-item ${activeTab === 'staged' ? 'active' : ''}`} 
            onClick={() => { setActiveTab('staged'); setSidebarOpen(false) }}
          >
            <ClipboardList />
            <span>Job List (Staged)</span>
            {stagedJobs.filter(j => j.status === 'Pending').length > 0 && (
              <span style={{ marginLeft: 'auto', background: '#2563eb', color: 'white', fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '10px' }}>
                {stagedJobs.filter(j => j.status === 'Pending').length}
              </span>
            )}
          </button>
          <button 
            className={`nav-item ${activeTab === 'jobs' ? 'active' : ''}`} 
            onClick={() => { setActiveTab('jobs'); setSidebarOpen(false) }}
          >
            <FileText />
            <span>Print Jobs</span>
          </button>
          <button 
            className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`} 
            onClick={() => { setActiveTab('profile'); setSidebarOpen(false) }}
          >
            <User />
            <span>My Profile</span>
          </button>
          
          <button className="nav-item" onClick={handleLogout} style={{ color: 'var(--error)', marginTop: 'auto' }}>
            <LogOut />
            <span>Logout</span>
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        <header className="header" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button className="sidebar-toggle" onClick={() => setSidebarOpen(true)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </button>
            <h2 className="hide-mobile" style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>{activeTab === 'dashboard' ? 'Dashboard' : activeTab === 'jobs' ? 'My Jobs' : 'My Profile'}</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button 
              onClick={() => {
                localStorage.removeItem('onboarding_customer_v2_completed')
                setRunTour(prev => !prev)
              }} 
              className="btn btn-ghost btn-sm" 
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#2563eb' }}
              title="View Customer Portal Guide & Tour"
            >
              <HelpCircle size={16} /> Portal Guide
            </button>
            <span style={{ fontWeight: 500 }}>{customer.name}</span>
            <button onClick={handleLogout} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <LogOut size={14} /> Logout
            </button>
          </div>
        </header>

        <main className="page-content">
          {renderContent()}
        </main>
      </div>

      {showUploadModal && (
        <CustomerJobUploadModal 
          customer={customer}
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            setShowUploadModal(false)
            loadData()
            setActiveTab('jobs')
          }}
        />
      )}

      {selectedJobForReceipt && (
        <ReceiptModal
          job={selectedJobForReceipt}
          company={customer.companies}
          onClose={() => setSelectedJobForReceipt(null)}
          gatewaysActive={gatewaysActive}
          onPay={(job) => {
            setSelectedJobForReceipt(null)
            setSelectedJobToPay(job)
          }}
        />
      )}

      {(showPaymentModal || selectedJobToPay) && (
        <CustomerPaymentModal
          customer={customer}
          balance={customer.balance}
          job={selectedJobToPay}
          onClose={() => {
            setShowPaymentModal(false)
            setSelectedJobToPay(null)
          }}
          onSuccess={() => {
            setShowPaymentModal(false)
            setSelectedJobToPay(null)
            loadData()
          }}
        />
      )}

      <SupportChatWidget customer={customer} />

      <OnboardingTour 
        tourKey="onboarding_customer_v2" 
        steps={[
          { title: `Welcome to ${customer.companies?.name || 'our'}'s Portal!`, content: "Track all your print jobs, view your outstanding balances, and make payments all in one place." },
          { title: "Upload New Jobs", content: "Need something printed? Click the 'Upload New Job' button to securely send your design files and exact dimensions directly to the print shop." },
          { title: "Pay Online", content: "If you have an outstanding balance, you can easily pay it online. Just click the 'Pay' button next to any unpaid job!" }
        ]} 
      />
    </div>
  )
}
