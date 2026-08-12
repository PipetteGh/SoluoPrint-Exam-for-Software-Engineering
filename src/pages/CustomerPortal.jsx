import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { LogOut, FileText, CheckCircle, Clock, CreditCard, Plus, Receipt } from 'lucide-react'
import SEO from '../components/ui/SEO'
import CustomerJobUploadModal from '../components/modals/CustomerJobUploadModal'
import CustomerPaymentModal from '../components/modals/CustomerPaymentModal'
import OnboardingTour from '../components/ui/OnboardingTour'

export default function CustomerPortal() {
  const [customer, setCustomer] = useState(null)
  const [jobs, setJobs] = useState([])
  const [totalPayments, setTotalPayments] = useState(0)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [gatewaysActive, setGatewaysActive] = useState(false)
  const [selectedJobToPay, setSelectedJobToPay] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const custId = localStorage.getItem('soluoprint_customer_id')
    if (!custId) {
      navigate('/login')
      return
    }

    const { data: cust, error: custErr } = await supabase
      .from('customers')
      .select('*, companies(name, currency_symbol)')
      .eq('id', custId)
      .single()
      
    if (custErr || !cust) {
      navigate('/login')
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

    // Fetch jobs
    const { data: jobData } = await supabase
      .from('print_jobs')
      .select('*')
      .eq('customer_id', custId)
      .order('created_at', { ascending: false })
    
    setJobs(jobData || [])

    // Fetch payments count
    const { count: paymentsCount } = await supabase
      .from('payments')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', custId)

    setTotalPayments(paymentsCount || 0)

    setLoading(false)
  }

  function handleLogout() {
    localStorage.removeItem('soluoprint_customer_id')
    navigate('/login')
  }

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>

  const activeJobs = jobs.filter(j => j.status !== 'Completed' && j.status !== 'Delivered' && j.status !== 'completed' && j.status !== 'delivered')
  const completedJobs = jobs.filter(j => j.status === 'Completed' || j.status === 'Delivered' || j.status === 'completed' || j.status === 'delivered')
  const currency = customer?.companies?.currency_symbol || '¢'

  // Render different tabs
  const renderContent = () => {
    if (activeTab === 'dashboard') {
      return (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
            <h1 style={{ fontSize: '28px', margin: 0 }}>Welcome back to {customer.companies?.name}'s Portal, {customer.name.split(' ')[0]}!</h1>
            
            <button className="btn btn-primary" onClick={() => setShowUploadModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={18} /> Upload New Job
            </button>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '40px' }}>
            <div className="card" style={{ padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CreditCard size={24} />
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '4px' }}>Outstanding Balance</div>
                  <div style={{ fontSize: '24px', fontWeight: 700 }}>{currency} {Number(customer.balance || 0).toFixed(2)}</div>
                </div>
              </div>
              {Number(customer.balance) > 0 && gatewaysActive && (
                <button 
                  className="btn btn-primary" 
                  style={{ padding: '6px 12px', fontSize: '14px' }}
                  onClick={() => setShowPaymentModal(true)}
                >
                  Pay Balance
                </button>
              )}
            </div>
            
            <div className="card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={24} />
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '4px' }}>Active Jobs</div>
                <div style={{ fontSize: '24px', fontWeight: 700 }}>{activeJobs.length}</div>
              </div>
            </div>

            <div className="card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle size={24} />
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '4px' }}>Completed Jobs</div>
                <div style={{ fontSize: '24px', fontWeight: 700 }}>{completedJobs.length}</div>
              </div>
            </div>

            <div className="card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Receipt size={24} />
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '4px' }}>Total Payments</div>
                <div style={{ fontSize: '24px', fontWeight: 700 }}>{totalPayments}</div>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '0' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Recent Print Jobs</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setActiveTab('jobs')}>View All</button>
            </div>
            
            {jobs.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <FileText size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
                <p>You have no print jobs yet.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table">
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
                          {job.job_number || 'N/A'}
                          {job.design_file_url && <a href={job.design_file_url} target="_blank" rel="noreferrer" style={{ marginLeft: '8px', fontSize: '12px', color: 'var(--primary)', textDecoration: 'none' }}>(File)</a>}
                        </td>
                        <td>{job.category || 'General'}</td>
                        <td>{new Date(job.job_date).toLocaleDateString()}</td>
                        <td>
                          <span className={`status-badge status-${job.status?.toLowerCase().replace(' ', '-') || 'pending'}`}>
                            {job.status || 'Pending'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>{currency} {Number(job.total_price).toFixed(2)}</td>
                        <td style={{ textAlign: 'right' }}>{currency} {Number(job.balance).toFixed(2)}</td>
                        <td style={{ textAlign: 'right' }}>
                          {Number(job.balance) > 0 && gatewaysActive && (
                            <button className="btn btn-primary btn-sm" onClick={() => setSelectedJobToPay(job)}>Pay</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
            {jobs.length === 0 ? (
              <div style={{ padding: '60px 40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <FileText size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
                <p>You have no print jobs yet.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Job Number</th>
                      <th>Category</th>
                      <th>Details</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                      <th style={{ textAlign: 'right' }}>Balance</th>
                      <th style={{ width: '80px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map(job => (
                      <tr key={job.id}>
                        <td style={{ fontWeight: 500 }}>
                          {job.job_number || 'N/A'}
                          {job.design_file_url && <a href={job.design_file_url} target="_blank" rel="noreferrer" style={{ marginLeft: '8px', fontSize: '12px', color: 'var(--primary)', textDecoration: 'none' }}>(File)</a>}
                        </td>
                        <td>{job.category || 'General'}</td>
                        <td>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {job.quantity}x {job.width && job.height ? `${job.width}x${job.height} ${job.unit}` : ''}
                          </div>
                        </td>
                        <td>{new Date(job.job_date).toLocaleDateString()}</td>
                        <td>
                          <span className={`status-badge status-${job.status?.toLowerCase().replace(' ', '-') || 'pending'}`}>
                            {job.status || 'Pending'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>{currency} {Number(job.total_price).toFixed(2)}</td>
                        <td style={{ textAlign: 'right' }}>{currency} {Number(job.balance).toFixed(2)}</td>
                        <td style={{ textAlign: 'right' }}>
                          {Number(job.balance) > 0 && gatewaysActive && (
                            <button className="btn btn-primary btn-sm" onClick={() => setSelectedJobToPay(job)}>Pay</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
        <div className="sidebar-header" style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'white' }}>{customer.companies?.name || 'SoluoPrint'}</h2>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginTop: '2px' }}>Customer Portal</div>
          </div>
        </div>

        <nav className="sidebar-nav" style={{ marginTop: '10px' }}>
          <button 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} 
            onClick={() => { setActiveTab('dashboard'); setSidebarOpen(false) }}
          >
            <Clock />
            <span>Dashboard</span>
          </button>
          <button 
            className={`nav-item ${activeTab === 'jobs' ? 'active' : ''}`} 
            onClick={() => { setActiveTab('jobs'); setSidebarOpen(false) }}
          >
            <FileText />
            <span>My Jobs</span>
          </button>
          <button 
            className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`} 
            onClick={() => { setActiveTab('profile'); setSidebarOpen(false) }}
          >
            <CreditCard />
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontWeight: 500 }}>{customer.name}</span>
            <button onClick={handleLogout} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <LogOut size={14} /> Logout
            </button>
          </div>
        </header>

        <main className="page-content" style={{ backgroundColor: 'var(--bg-light)' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {renderContent()}
          </div>
        </main>
      </div>

      {showUploadModal && (
        <CustomerJobUploadModal 
          customer={customer}
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            setShowUploadModal(false)
            loadData() // Refresh jobs
            setActiveTab('jobs')
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
            loadData() // Refresh balance and data
          }}
        />
      )}

      <OnboardingTour 
        tourKey="onboarding_customer_v1" 
        steps={[
          { title: `Welcome to ${customer.companies?.name || 'our'}'s Portal!`, content: "Track all your print jobs, view your outstanding balances, and make payments all in one place." },
          { title: "Upload New Jobs", content: "Need something printed? Click the 'Upload New Job' button to securely send your design files and exact dimensions directly to the print shop." },
          { title: "Pay Online", content: "If you have an outstanding balance, you can easily pay it online. Just click the 'Pay' button next to any unpaid job!" }
        ]} 
      />
    </div>
  )
}
