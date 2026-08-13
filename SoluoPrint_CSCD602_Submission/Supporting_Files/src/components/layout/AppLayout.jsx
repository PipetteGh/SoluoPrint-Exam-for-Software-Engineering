import { useState, useRef, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  LayoutDashboard, Users, Briefcase, CreditCard, FileText,
  Star, Receipt, BarChart2, Settings, ChevronDown,
  Search, Plus, Bell, Printer, LogOut, User,
  Building2, Wrench, Tag, Maximize2, Wallet,
  TrendingUp, AlertCircle, ChevronRight, X, ClipboardList, MessageSquare, CheckCheck
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import NewJobModal from '../modals/NewJobModal'
import NewPaymentModal from '../modals/NewPaymentModal'
import NewCustomerModal from '../modals/NewCustomerModal'
import AdminSupportChatModal from '../chat/AdminSupportChatModal'
import OnboardingTour from '../ui/OnboardingTour'

export default function AppLayout() {
  const { user, profile, company, signOut, hasPermission } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [reportsOpen, setReportsOpen] = useState(false)
  const [configOpen, setConfigOpen] = useState(false)
  const [financeOpen, setFinanceOpen] = useState(false)
  const [showQuickActions, setShowQuickActions] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showAdminChat, setShowAdminChat] = useState(false)
  const [showNewJob, setShowNewJob] = useState(false)
  const [showNewPayment, setShowNewPayment] = useState(false)
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const quickActionsRef = useRef(null)
  const userMenuRef = useRef(null)
  const notificationsRef = useRef(null)

  // Real-time notifications listener for current company
  useEffect(() => {
    if (!company?.id) return
    loadNotifications()

    const channel = supabase
      .channel(`public:notifications:${company.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `company_id=eq.${company.id}` },
        (payload) => {
          setNotifications(prev => [payload.new, ...prev])
          setUnreadCount(count => count + 1)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [company?.id])

  async function loadNotifications() {
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (data) {
        setNotifications(data)
        const unread = data.filter(n => !n.read).length
        setUnreadCount(unread)
      }
    } catch (e) {
      console.error(e)
    }
  }

  async function markAllAsRead() {
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('company_id', company.id)

      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (e) {
      console.error(e)
    }
  }

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e) {
      if (quickActionsRef.current && !quickActionsRef.current.contains(e.target)) setShowQuickActions(false)
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setShowUserMenu(false)
      if (notificationsRef.current && !notificationsRef.current.contains(e.target)) setShowNotifications(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Auto-expand sidebar group based on current path
  useEffect(() => {
    if (location.pathname.startsWith('/reports')) setReportsOpen(true)
    if (location.pathname.startsWith('/services') || location.pathname.startsWith('/service-categories') || location.pathname.startsWith('/customer-types') || location.pathname.startsWith('/preset-sizes')) setConfigOpen(true)
    if (location.pathname.startsWith('/payment-accounts')) setFinanceOpen(true)
    setSidebarOpen(false) // Close sidebar on mobile when navigating
  }, [location.pathname])

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const companyInitial = company?.name?.[0]?.toUpperCase() || 'C'
  const userInitial = profile?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'

  return (
    <div className="app-layout">
      {/* Sidebar Overlay (Mobile) */}
      <div className={`sidebar-overlay ${sidebarOpen ? 'show' : ''}`} onClick={() => setSidebarOpen(false)}></div>

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <NavLink to="/dashboard" className="sidebar-logo">
            <div className="sidebar-logo-icon">{companyInitial}</div>
            <span className="sidebar-logo-text" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
              {company?.name || 'SoluoPrint'}
            </span>
          </NavLink>
          {/* Mobile Close Button */}
          <button className="icon-btn" style={{ marginLeft: 'auto', border: 'none', display: 'flex', color: 'white' }} onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {hasPermission('view_dashboard') && (
            <NavLink to="/dashboard" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
              <LayoutDashboard />
              <span>Dashboard</span>
            </NavLink>
          )}

          {hasPermission('view_customers') && (
            <NavLink to="/customers" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
              <Users />
              <span>Customers</span>
            </NavLink>
          )}

          {hasPermission('view_jobs') && (
            <NavLink to="/jobs" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
              <Printer />
              <span>Print Jobs</span>
            </NavLink>
          )}

          {hasPermission('view_jobs') && (
            <NavLink to="/job-list" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
              <ClipboardList />
              <span>Job List</span>
            </NavLink>
          )}

          {hasPermission('view_payments') && (
            <NavLink to="/payments" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
              <CreditCard />
              <span>Payments</span>
            </NavLink>
          )}

          {hasPermission('view_reports') && (
            <NavLink to="/receivables" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
              <FileText />
              <span>Receivables</span>
            </NavLink>
          )}

          {hasPermission('view_reports') && (
            <NavLink to="/reviews" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
              <Star />
              <span>Reviews</span>
            </NavLink>
          )}

          {hasPermission('view_expenses') && (
            <NavLink to="/expenses" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
              <Receipt />
              <span>Expenses</span>
            </NavLink>
          )}

          {/* Reports group */}
          {hasPermission('view_reports') && (
            <div className="nav-group">
              <button className="nav-group-header" onClick={() => setReportsOpen(v => !v)}>
                <div className="nav-group-label">
                  <BarChart2 size={18} />
                  <span>Reports</span>
                </div>
                <ChevronDown size={14} className={`nav-group-chevron ${reportsOpen ? 'open' : ''}`} />
              </button>
              {reportsOpen && (
                <>
                  <NavLink to="/reports/revenue" className={({isActive}) => `nav-sub-item ${isActive ? 'active' : ''}`}>
                    <TrendingUp size={14} />
                    Revenue Reports
                  </NavLink>
                  <NavLink to="/reports/expenses" className={({isActive}) => `nav-sub-item ${isActive ? 'active' : ''}`}>
                    <Receipt size={14} />
                    Expense Reports
                  </NavLink>
                  <NavLink to="/reports/profit-loss" className={({isActive}) => `nav-sub-item ${isActive ? 'active' : ''}`}>
                    <BarChart2 size={14} />
                    Profit &amp; Loss
                  </NavLink>
                </>
              )}
            </div>
          )}

          {/* Configuration group */}
          {hasPermission('manage_settings') && (
            <div className="nav-group">
              <button className="nav-group-header" onClick={() => setConfigOpen(v => !v)}>
                <div className="nav-group-label">
                  <Settings size={18} />
                  <span>Configuration</span>
                </div>
                <ChevronDown size={14} className={`nav-group-chevron ${configOpen ? 'open' : ''}`} />
              </button>
              {configOpen && (
                <>
                  <NavLink to="/services" className={({isActive}) => `nav-sub-item ${isActive ? 'active' : ''}`}>
                    <Wrench size={14} />
                    Services
                  </NavLink>
                  <NavLink to="/service-categories" className={({isActive}) => `nav-sub-item ${isActive ? 'active' : ''}`}>
                    <Tag size={14} />
                    Service Categories
                  </NavLink>
                  <NavLink to="/customer-types" className={({isActive}) => `nav-sub-item ${isActive ? 'active' : ''}`}>
                    <Users size={14} />
                    Customer Types
                  </NavLink>
                  <NavLink to="/preset-sizes" className={({isActive}) => `nav-sub-item ${isActive ? 'active' : ''}`}>
                    <Maximize2 size={14} />
                    Preset Sizes
                  </NavLink>
                </>
              )}
            </div>
          )}

          {/* Financial Settings group */}
          {hasPermission('manage_settings') && (
            <div className="nav-group">
              <button className="nav-group-header" onClick={() => setFinanceOpen(v => !v)}>
                <div className="nav-group-label">
                  <Wallet size={18} />
                  <span>Financial Settings</span>
                </div>
                <ChevronDown size={14} className={`nav-group-chevron ${financeOpen ? 'open' : ''}`} />
              </button>
              {financeOpen && (
                <>
                  <NavLink to="/payment-accounts" className={({isActive}) => `nav-sub-item ${isActive ? 'active' : ''}`}>
                    <CreditCard size={14} />
                    Payment Accounts
                  </NavLink>
                  <NavLink to="/expense-accounts" className={({isActive}) => `nav-sub-item ${isActive ? 'active' : ''}`}>
                    <Receipt size={14} />
                    Expense Accounts
                  </NavLink>
                </>
              )}
            </div>
          )}
          {hasPermission('manage_settings') && (
            <NavLink to="/settings" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
              <Settings />
              <span>Settings</span>
            </NavLink>
          )}
          
          <button className="nav-item" onClick={handleSignOut} style={{ color: 'var(--error)', marginTop: 'auto' }}>
            <LogOut />
            <span>Logout</span>
          </button>
        </nav>

        <div className="sidebar-footer" style={{ padding: '20px', marginTop: 'auto', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', borderTop: '1px solid var(--border)' }}>
          <div>&copy; {new Date().getFullYear()} SoluoPrint</div>
          <div>Developed by <a href="https://www.soluotech.com" target="_blank" rel="noopener noreferrer" style={{color: '#ffffff', textDecoration: 'none', fontWeight: 700}}>Soluotech</a></div>
          <div style={{ marginTop: '4px' }}>App Version: 1.1.4</div>
        </div>
      </aside>

      {/* Main content */}
      <div className="main-content">
        {/* Header */}
        <header className="header">
          {/* Mobile Menu Toggle */}
          <button className="sidebar-toggle" onClick={() => setSidebarOpen(true)}>
            <LayoutDashboard size={20} />
          </button>

          {/* Search */}
          <div className="header-search">
            <Search />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="header-actions">
            {/* Company selector */}
            <div className="company-selector">
              <div className="company-avatar">{companyInitial}</div>
              <span className="hide-mobile">{company?.name || 'My Company'}</span>
              <ChevronDown size={14} />
            </div>

            {/* Quick Add */}
            <div className="dropdown" ref={quickActionsRef}>
              <button className="quick-add-btn" onClick={() => setShowQuickActions(v => !v)}>
                <Plus />
              </button>
              {showQuickActions && (
                <div className="quick-actions-dropdown">
                  {hasPermission('add_jobs') && (
                    <button className="quick-action-item" onClick={() => { setShowQuickActions(false); setShowNewJob(true) }}>
                      <div className="quick-action-icon" style={{background:'#dbeafe'}}><Printer size={16} color="#2563eb"/></div>
                      <div>
                        <div style={{fontWeight:600}}>New Job</div>
                        <div style={{fontSize:'11px',color:'var(--text-muted)'}}>Create a print job</div>
                      </div>
                    </button>
                  )}
                  {hasPermission('add_payments') && (
                    <button className="quick-action-item" onClick={() => { setShowQuickActions(false); setShowNewPayment(true) }}>
                      <div className="quick-action-icon" style={{background:'#dcfce7'}}><CreditCard size={16} color="#22c55e"/></div>
                      <div>
                        <div style={{fontWeight:600}}>New Payment</div>
                        <div style={{fontSize:'11px',color:'var(--text-muted)'}}>Record a payment</div>
                      </div>
                    </button>
                  )}
                  {hasPermission('add_customers') && (
                    <button className="quick-action-item" onClick={() => { setShowQuickActions(false); setShowNewCustomer(true) }}>
                      <div className="quick-action-icon" style={{background:'#fef3c7'}}><Users size={16} color="#f59e0b"/></div>
                      <div>
                        <div style={{fontWeight:600}}>New Customer</div>
                        <div style={{fontSize:'11px',color:'var(--text-muted)'}}>Add a customer</div>
                      </div>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Live Support Chat Button */}
            <button className="icon-btn" title="Live Customer Support Desk" onClick={() => setShowAdminChat(true)} style={{ color: '#2563eb', background: '#eff6ff' }}>
              <MessageSquare size={18} />
            </button>

            {/* Notifications */}
            <div className="dropdown" ref={notificationsRef} style={{ position: 'relative' }}>
              <button className="icon-btn" onClick={() => setShowNotifications(v => !v)} style={{ position: 'relative' }}>
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-2px',
                    right: '-2px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    fontSize: '10px',
                    fontWeight: 800,
                    padding: '2px 5px',
                    borderRadius: '10px',
                    lineHeight: 1
                  }}>
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div style={{
                  position: 'absolute',
                  right: 0,
                  top: '100%',
                  marginTop: '8px',
                  width: '340px',
                  maxHeight: '420px',
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
                  border: '1px solid var(--border)',
                  zIndex: 100,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden'
                }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b' }}>Notifications ({unreadCount})</div>
                    {unreadCount > 0 && (
                      <button onClick={markAllAsRead} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCheck size={14} /> Mark all read
                      </button>
                    )}
                  </div>

                  <div style={{ flex: 1, overflowY: 'auto', maxHeight: '320px' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '30px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', background: n.read ? 'white' : '#eff6ff' }}>
                          <div style={{ fontWeight: 600, fontSize: '13px', color: '#1e293b', marginBottom: '2px' }}>{n.title}</div>
                          <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.3 }}>{n.message}</div>
                          <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User menu */}
            <div className="dropdown" ref={userMenuRef}>
              <button className="user-avatar-btn" onClick={() => setShowUserMenu(v => !v)}>
                {userInitial}
              </button>
              {showUserMenu && (
                <div className="dropdown-menu">
                  <div style={{padding:'12px 14px',borderBottom:'1px solid var(--border)'}}>
                    <div style={{fontWeight:600,fontSize:'14px'}}>{profile?.full_name || user?.email}</div>
                    <div style={{fontSize:'12px',color:'var(--text-muted)'}}>{user?.email}</div>
                  </div>
                  <button className="dropdown-item" onClick={() => { setShowUserMenu(false); navigate('/settings') }}>
                    <Settings size={15} />
                    Settings
                  </button>
                  <hr className="dropdown-divider" />
                  <button className="dropdown-item danger" onClick={handleSignOut}>
                    <LogOut size={15} />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="page-content">
          <Outlet />
        </main>
      </div>

      {/* Modals */}
      {showAdminChat && company?.id && (
        <AdminSupportChatModal companyId={company.id} onClose={() => setShowAdminChat(false)} />
      )}
      {showNewJob && <NewJobModal onClose={() => setShowNewJob(false)} />}
      {showNewPayment && <NewPaymentModal onClose={() => setShowNewPayment(false)} />}
      {showNewCustomer && <NewCustomerModal onClose={() => setShowNewCustomer(false)} />}

      <OnboardingTour 
        tourKey="onboarding_admin_v2" 
        steps={[
          { 
            title: "Welcome to SoluoPrint!", 
            content: "We're excited to have your print shop on board. This interactive tour will show you how to navigate the platform." 
          },
          { 
            title: "Manage Customers", 
            content: "Keep track of all your clients here. You can add new customers, view their balances, and even generate portal credentials for them.",
            actionText: "Go to Customers",
            actionPath: "/customers"
          },
          { 
            title: "Single Print Jobs", 
            content: "Create and track individual print orders. You can assign them to customers, set dimensions, quantities, and update statuses from Pending to Completed.",
            actionText: "Go to Print Jobs",
            actionPath: "/jobs"
          },
          { 
            title: "Bulk Printing & Job List", 
            content: "For a streamlined view of all your pending tasks, use the Job List. It's great for managing bulk printing queues and keeping your shop floor organized.",
            actionText: "Go to Job List",
            actionPath: "/job-list"
          },
          { 
            title: "Accounting & Payments", 
            content: "Record customer payments, track outstanding receivables, and log your daily business expenses here to keep your cash flow healthy.",
            actionText: "Go to Payments",
            actionPath: "/payments"
          },
          { 
            title: "Business Reports", 
            content: "Analyze your shop's performance with real-time revenue, expense, and profit/loss reports to make informed decisions.",
            actionText: "Go to Reports",
            actionPath: "/reports/revenue"
          },
          { 
            title: "Settings & User Management", 
            content: "Configure your payment integrations, SMS API keys, and manage your team/users from the main Settings page.",
            actionText: "Go to Settings",
            actionPath: "/settings"
          }
        ]} 
      />
    </div>
  )
}
