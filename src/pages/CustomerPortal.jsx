import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { LogOut, FileText, CheckCircle, Clock, CreditCard, Plus } from 'lucide-react'
import SEO from '../components/ui/SEO'
import CustomerJobUploadModal from '../components/modals/CustomerJobUploadModal'
import CustomerPaymentModal from '../components/modals/CustomerPaymentModal'

export default function CustomerPortal() {
  const [customer, setCustomer] = useState(null)
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const navigate = useNavigate()

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

    const { data: jobData } = await supabase
      .from('print_jobs')
      .select('*')
      .eq('customer_id', custId)
      .order('created_at', { ascending: false })
    
    setJobs(jobData || [])
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

  return (
    <div style={{ backgroundColor: 'var(--bg-light)', minHeight: '100vh' }}>
      <SEO title="Customer Portal" />
      
      {/* Header */}
      <header style={{ backgroundColor: 'var(--bg-card)', padding: '20px 40px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontWeight: 600 }}>{customer.companies?.name || 'SoluoPrint'}</h2>
          <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Customer Portal</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span style={{ fontWeight: 500 }}>{customer.name}</span>
          <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', margin: 0 }}>Welcome back, {customer.name.split(' ')[0]}!</h1>
          
          <button className="btn btn-primary" onClick={() => setShowUploadModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} /> Upload New Job
          </button>
        </div>
        
        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '40px' }}>
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
            {Number(customer.balance) > 0 && (
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
        </div>

        {/* Jobs List */}
        <div className="card" style={{ padding: '0' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Recent Print Jobs</h3>
          </div>
          
          {jobs.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <FileText size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {showUploadModal && (
        <CustomerJobUploadModal 
          customer={customer}
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            setShowUploadModal(false)
            loadData() // Refresh jobs
          }}
        />
      )}

      {showPaymentModal && (
        <CustomerPaymentModal
          customer={customer}
          balance={customer.balance}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={() => {
            setShowPaymentModal(false)
            loadData() // Refresh balance and data
          }}
        />
      )}
    </div>
  )
}
