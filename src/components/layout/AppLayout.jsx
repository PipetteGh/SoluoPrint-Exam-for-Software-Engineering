import { useState, useRef, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  LayoutDashboard, Users, Briefcase, CreditCard, FileText,
  Star, Receipt, BarChart2, Settings, ChevronDown,
  Search, Plus, Bell, Printer, LogOut, User,
  Building2, Wrench, Tag, Maximize2, Wallet,
  TrendingUp, AlertCircle, ChevronRight, X, ClipboardList
} from 'lucide-react'
import NewJobModal from '../modals/NewJobModal'
import NewPaymentModal from '../modals/NewPaymentModal'
import NewCustomerModal from '../modals/NewCustomerModal'

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
  const [showNewJob, setShowNewJob] = useState(false)
  const [showNewPayment, setShowNewPayment] = useState(false)
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const quickActionsRef = useRef(null)
  const userMenuRef = useRef(null)

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e) {
      if (quickActionsRef.current && !quickActionsRef.current.contains(e.target)) setShowQuickActions(false)
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setShowUserMenu(false)
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
            <div className="sidebar-logo-icon">PD</div>
            <span className="sidebar-logo-text">SoluoPrint</span>
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

            {/* Notifications */}
            <button className="icon-btn" onClick={() => setShowNotifications(v => !v)}>
              <Bell />
            </button>

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
      {showNewJob && <NewJobModal onClose={() => setShowNewJob(false)} />}
      {showNewPayment && <NewPaymentModal onClose={() => setShowNewPayment(false)} />}
      {showNewCustomer && <NewCustomerModal onClose={() => setShowNewCustomer(false)} />}
    </div>
  )
}
