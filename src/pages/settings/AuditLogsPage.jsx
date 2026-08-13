import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { fetchAuditLogs } from '../../lib/auditLogger'
import { ArrowLeft, ShieldCheck, Search, Filter, RefreshCw, Calendar, Download, UserCheck, Clock, Activity } from 'lucide-react'
import SEO from '../../components/ui/SEO'

export default function AuditLogsPage() {
  const navigate = useNavigate()
  const { company, profile } = useAuth()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('All')
  const [actionFilter, setActionFilter] = useState('All')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    if (company) loadLogs()
  }, [company])

  async function loadLogs() {
    setLoading(true)
    const data = await fetchAuditLogs(company?.id)
    setLogs(data || [])
    setLoading(false)
  }

  const filteredLogs = logs.filter(log => {
    if (roleFilter !== 'All' && log.actor_role?.toLowerCase() !== roleFilter.toLowerCase()) return false
    if (actionFilter !== 'All' && !log.action?.includes(actionFilter)) return false
    if (dateFrom && log.created_at < dateFrom) return false
    if (dateTo && log.created_at > dateTo) return false
    if (search) {
      const q = search.toLowerCase()
      const actor = log.actor_name?.toLowerCase() || ''
      const action = log.action?.toLowerCase() || ''
      const details = log.details?.toLowerCase() || ''
      if (!actor.includes(q) && !action.includes(q) && !details.includes(q)) return false
    }
    return true
  })

  function exportCSV() {
    const headers = ['Timestamp', 'Actor Name', 'Role', 'Action', 'Details']
    const rows = filteredLogs.map(l => [
      new Date(l.created_at).toLocaleString(),
      `"${l.actor_name || ''}"`,
      `"${l.actor_role || ''}"`,
      `"${l.action || ''}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `SoluoPrint_Audit_Logs_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  function getActionBadge(action) {
    if (action.includes('LOGIN')) return { bg: '#dbeafe', color: '#1e40af', label: 'Login' }
    if (action.includes('JOB_CREATE') || action.includes('JOB_UPLOAD')) return { bg: '#dcfce7', color: '#15803d', label: 'Job Created' }
    if (action.includes('JOB_DELETE')) return { bg: '#fee2e2', color: '#b91c1c', label: 'Job Deleted' }
    if (action.includes('PAYMENT')) return { bg: '#fef3c7', color: '#b45309', label: 'Payment' }
    if (action.includes('USER')) return { bg: '#f3e8ff', color: '#6b21a8', label: 'User Admin' }
    return { bg: '#f1f5f9', color: '#475569', label: action }
  }

  return (
    <div>
      <SEO title="Audit & Activity Logs" description="Review full activity trail of admins, staff, and customer interactions." />
      
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/settings')}>
            <ArrowLeft size={16} /> Back
          </button>
          <div>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={22} color="var(--primary)" />
              Audit &amp; Activity Logs
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
              Comprehensive security and operational activity history across admins, staff, and customer portal.
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={loadLogs} title="Refresh Logs">
            <RefreshCw size={16} /> Refresh
          </button>
          <button className="btn btn-primary" onClick={exportCSV}>
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      {/* Filters row */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center', background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-control"
            style={{ paddingLeft: '34px', fontSize: '13px' }}
            placeholder="Search by actor, action, or details..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UserCheck size={14} color="var(--text-muted)" />
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Role:</span>
          <select className="filter-select" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
            <option value="All">All Roles</option>
            <option value="Admin">Admin</option>
            <option value="Owner">Owner</option>
            <option value="Manager">Manager</option>
            <option value="Staff">Staff</option>
            <option value="Customer">Customer</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={14} color="var(--text-muted)" />
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Action:</span>
          <select className="filter-select" value={actionFilter} onChange={e => setActionFilter(e.target.value)}>
            <option value="All">All Actions</option>
            <option value="LOGIN">Logins</option>
            <option value="JOB">Job Operations</option>
            <option value="PAYMENT">Payments</option>
            <option value="USER">User Changes</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Calendar size={14} color="var(--text-muted)" />
          <input type="date" className="filter-select" style={{ fontSize: '12px' }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>to</span>
          <input type="date" className="filter-select" style={{ fontSize: '12px' }} value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
      </div>

      {/* Logs Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th style={{ width: '180px' }}>Date &amp; Time</th>
              <th>Actor</th>
              <th>Role</th>
              <th>Action Event</th>
              <th>Details &amp; Parameters</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px' }}>Loading audit logs...</td></tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}>
                  No audit logs found for the selected criteria.
                </td>
              </tr>
            ) : (
              filteredLogs.map(l => {
                const badge = getActionBadge(l.action || '')
                return (
                  <tr key={l.id}>
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={12} color="var(--text-muted)" />
                        <span>{new Date(l.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '18px' }}>
                        {new Date(l.created_at).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {l.actor_name || 'System'}
                    </td>
                    <td>
                      <span className={`pill ${l.actor_role === 'Customer' ? 'pill-blue' : 'pill-green'}`} style={{ fontSize: '11px' }}>
                        {l.actor_role || 'User'}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: badge.bg,
                        color: badge.color
                      }}>
                        {l.action}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'sans-serif' }}>
                      {l.details}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
