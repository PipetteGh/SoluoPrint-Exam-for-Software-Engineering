import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { fetchAuditLogs } from '../../lib/auditLogger'
import { ArrowLeft, ShieldCheck, Search, Filter, RefreshCw, Calendar, Download, UserCheck, Clock, Activity, Globe, Monitor, Smartphone } from 'lucide-react'
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
      const ip = log.ip_address?.toLowerCase() || ''
      const browser = log.browser_info?.toLowerCase() || ''
      if (!actor.includes(q) && !action.includes(q) && !details.includes(q) && !ip.includes(q) && !browser.includes(q)) return false
    }
    return true
  })

  function exportCSV() {
    const headers = ['Timestamp', 'Actor Name', 'Role', 'Action', 'Details', 'IP Address', 'Browser / Device']
    const rows = filteredLogs.map(l => [
      new Date(l.created_at).toLocaleString(),
      `"${l.actor_name || ''}"`,
      `"${l.actor_role || ''}"`,
      `"${l.action || ''}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`,
      `"${l.ip_address || 'N/A'}"`,
      `"${(l.browser_info || 'N/A').replace(/"/g, '""')}"`
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
    if (action.includes('LOGOUT')) return { bg: '#e0e7ff', color: '#3730a3', label: 'Logout' }
    if (action.includes('JOB_CREATE') || action.includes('JOB_UPLOAD') || action.includes('UPLOAD')) return { bg: '#dcfce7', color: '#15803d', label: 'Upload' }
    if (action.includes('DELETE')) return { bg: '#fee2e2', color: '#b91c1c', label: 'Deleted' }
    if (action.includes('STATUS')) return { bg: '#fef3c7', color: '#92400e', label: 'Status Update' }
    if (action.includes('PAYMENT') || action.includes('PAY')) return { bg: '#fef3c7', color: '#b45309', label: 'Payment' }
    if (action.includes('USER') || action.includes('REGISTER')) return { bg: '#f3e8ff', color: '#6b21a8', label: 'User Admin' }
    if (action.includes('DOWNLOAD')) return { bg: '#e0f2fe', color: '#0369a1', label: 'Download' }
    return { bg: '#f1f5f9', color: '#475569', label: action }
  }

  /** Extract a shortened device label from browser_info for the icon */
  function getDeviceIcon(info) {
    if (!info) return <Monitor size={13} style={{ color: 'var(--text-muted)' }} />
    if (info.includes('Mobile') || info.includes('iPhone') || info.includes('Android')) {
      return <Smartphone size={13} style={{ color: '#7c3aed' }} />
    }
    return <Monitor size={13} style={{ color: '#0284c7' }} />
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

      {/* Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px', marginBottom: '16px' }}>
        <div style={{ background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', padding: '14px 16px', borderRadius: '12px', border: '1px solid #bfdbfe' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Logs</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#1e3a5f', marginTop: '4px' }}>{logs.length}</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)', padding: '14px 16px', borderRadius: '12px', border: '1px solid #a7f3d0' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Logins Today</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#065f46', marginTop: '4px' }}>
            {logs.filter(l => l.action?.includes('LOGIN') && new Date(l.created_at).toDateString() === new Date().toDateString()).length}
          </div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #fefce8, #fef9c3)', padding: '14px 16px', borderRadius: '12px', border: '1px solid #fde68a' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Customer Actions</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#78350f', marginTop: '4px' }}>
            {logs.filter(l => l.actor_role === 'Customer').length}
          </div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #fdf2f8, #fce7f3)', padding: '14px 16px', borderRadius: '12px', border: '1px solid #fbcfe8' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#be185d', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Filtered</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#831843', marginTop: '4px' }}>{filteredLogs.length}</div>
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
            placeholder="Search by actor, action, details, IP address..."
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
            <option value="UPLOAD">Uploads</option>
            <option value="DOWNLOAD">Downloads</option>
            <option value="DELETE">Deletions</option>
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
              <th style={{ width: '170px' }}>Date &amp; Time</th>
              <th>Actor</th>
              <th>Role</th>
              <th>Action Event</th>
              <th>Details &amp; Parameters</th>
              <th style={{ width: '120px' }}>IP Address</th>
              <th style={{ width: '200px' }}>Browser / Device</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>Loading audit logs...</td></tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}>
                  No audit logs found for the selected criteria.
                </td>
              </tr>
            ) : (
              filteredLogs.map((l, idx) => {
                const badge = getActionBadge(l.action || '')
                return (
                  <tr key={l.id || idx}>
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
                      <span className={`pill ${l.actor_role === 'Customer' ? 'pill-blue' : l.actor_role === 'Admin' || l.actor_role === 'Owner' ? 'pill-purple' : 'pill-green'}`} style={{ fontSize: '11px' }}>
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
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'sans-serif', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l.details}>
                      {l.details}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Globe size={12} color="#6b7280" />
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                          {l.ip_address || '—'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {getDeviceIcon(l.browser_info)}
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.3' }}>
                          {l.browser_info || '—'}
                        </span>
                      </div>
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
