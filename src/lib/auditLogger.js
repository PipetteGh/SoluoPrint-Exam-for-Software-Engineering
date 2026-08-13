import { supabase } from './supabase'

/**
 * Audit Logger for SoluoPrint ERP
 * Stores activity logs for Admins, Users, Staff, and Customers.
 * Syncs with Supabase table `audit_logs` and maintains local fallback buffer.
 */
export async function logAudit({ companyId, userId, actorName, actorRole, action, details }) {
  try {
    const timestamp = new Date().toISOString()
    const logItem = {
      company_id: companyId || null,
      user_id: userId || null,
      actor_name: actorName || 'System User',
      actor_role: actorRole || 'User',
      action: action || 'GENERAL_EVENT',
      details: typeof details === 'object' ? JSON.stringify(details) : String(details || ''),
      created_at: timestamp
    }

    // 1. Try writing to Supabase audit_logs table
    const { error } = await supabase.from('audit_logs').insert(logItem)

    // 2. Also keep a persistent local cache for instant UI rendering and offline backup
    const localLogs = JSON.parse(localStorage.getItem('soluoprint_audit_logs') || '[]')
    localLogs.unshift({ ...logItem, id: 'log_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6) })
    localStorage.setItem('soluoprint_audit_logs', JSON.stringify(localLogs.slice(0, 500)))

    if (error) {
      console.warn('Supabase audit_logs insert warning (using local audit cache):', error.message)
    }
  } catch (err) {
    console.error('Audit Logger Exception:', err)
  }
}

export async function fetchAuditLogs(companyId) {
  try {
    // Try fetching from Supabase
    if (companyId) {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(200)

      if (!error && data && data.length > 0) {
        return data
      }
    }

    // Fallback to local logs
    const localLogs = JSON.parse(localStorage.getItem('soluoprint_audit_logs') || '[]')
    if (companyId) {
      return localLogs.filter(l => !l.company_id || l.company_id === companyId)
    }
    return localLogs
  } catch (err) {
    console.error('Error fetching audit logs:', err)
    return JSON.parse(localStorage.getItem('soluoprint_audit_logs') || '[]')
  }
}
