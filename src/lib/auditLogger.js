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

    // 1. Write to local storage immediately for fast UI rendering
    const localLogs = JSON.parse(localStorage.getItem('soluoprint_audit_logs') || '[]')
    const localItem = { ...logItem, id: 'log_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6) }
    localLogs.unshift(localItem)
    localStorage.setItem('soluoprint_audit_logs', JSON.stringify(localLogs.slice(0, 500)))

    // 2. Try writing to Supabase audit_logs table
    const { error } = await supabase.from('audit_logs').insert(logItem)
    if (error) {
      console.warn('Supabase audit_logs insert warning (using local audit cache):', error.message)
    }
  } catch (err) {
    console.error('Audit Logger Exception:', err)
  }
}

export async function fetchAuditLogs(companyId) {
  let remoteLogs = []
  try {
    // 1. Fetch from Supabase
    if (companyId) {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(250)

      if (!error && data) {
        remoteLogs = data
      }
    }
  } catch (err) {
    console.warn('Error fetching remote audit logs:', err)
  }

  // 2. Merge local logs
  const localLogs = JSON.parse(localStorage.getItem('soluoprint_audit_logs') || '[]')
  const filteredLocal = companyId
    ? localLogs.filter(l => !l.company_id || l.company_id === companyId)
    : localLogs

  // Combine and deduplicate
  const combined = [...remoteLogs]
  const existingKeys = new Set(remoteLogs.map(l => `${l.action}_${l.created_at}_${l.actor_name}`))

  for (const item of filteredLocal) {
    const key = `${item.action}_${item.created_at}_${item.actor_name}`
    if (!existingKeys.has(key)) {
      existingKeys.add(key)
      combined.push(item)
    }
  }

  // Sort by created_at descending
  combined.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
  return combined
}
