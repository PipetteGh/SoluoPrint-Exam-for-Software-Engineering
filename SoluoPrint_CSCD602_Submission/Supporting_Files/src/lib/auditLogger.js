import { supabase } from './supabase'

/**
 * Audit Logger for SoluoPrint ERP
 * Captures: timestamp, actor, role, action, details, IP address, browser/OS info.
 * Syncs with Supabase table `audit_logs` and maintains local fallback buffer.
 */

// ---- Client Environment Detection Utilities ----

let cachedVisitorInfo = null

/**
 * Fetches full visitor info via IPWhois (free, no API key needed).
 * Returns: { ip, country, city, region, isp, timezone, org }
 * Cached after first successful call for the entire browser session.
 */
async function getVisitorInfo() {
  if (cachedVisitorInfo) return cachedVisitorInfo
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 4000)
    const res = await fetch('https://ipwhois.app/json/?objects=ip,country,city,region,isp,timezone,org', { signal: controller.signal })
    clearTimeout(timeout)
    if (res.ok) {
      const data = await res.json()
      if (data && data.ip) {
        cachedVisitorInfo = {
          ip: data.ip || '127.0.0.1',
          country: data.country || '',
          city: data.city || '',
          region: data.region || '',
          isp: data.isp || '',
          timezone: data.timezone || '',
          org: data.org || ''
        }
        return cachedVisitorInfo
      }
    }
  } catch (e) {
    // Silent fallback — network error, ad-blocker, etc.
  }
  cachedVisitorInfo = { ip: '127.0.0.1', country: '', city: '', region: '', isp: '', timezone: '', org: '' }
  return cachedVisitorInfo
}

/**
 * Parses navigator.userAgent to extract browser name + version and OS
 */
function getBrowserInfo() {
  if (typeof window === 'undefined' || !navigator) return 'Unknown'
  const ua = navigator.userAgent || ''

  // Browser detection
  let browser = 'Unknown Browser'
  if (ua.includes('Firefox/')) {
    const v = ua.match(/Firefox\/(\d+)/)
    browser = `Firefox ${v ? v[1] : ''}`
  } else if (ua.includes('Edg/')) {
    const v = ua.match(/Edg\/(\d+)/)
    browser = `Edge ${v ? v[1] : ''}`
  } else if (ua.includes('OPR/') || ua.includes('Opera/')) {
    const v = ua.match(/OPR\/(\d+)/)
    browser = `Opera ${v ? v[1] : ''}`
  } else if (ua.includes('Chrome/')) {
    const v = ua.match(/Chrome\/(\d+)/)
    browser = `Chrome ${v ? v[1] : ''}`
  } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
    const v = ua.match(/Version\/(\d+)/)
    browser = `Safari ${v ? v[1] : ''}`
  } else if (ua.includes('MSIE') || ua.includes('Trident/')) {
    browser = 'Internet Explorer'
  }

  // OS detection
  let os = 'Unknown OS'
  if (ua.includes('Windows NT 10')) os = 'Windows 10/11'
  else if (ua.includes('Windows NT 6.3')) os = 'Windows 8.1'
  else if (ua.includes('Windows NT 6.1')) os = 'Windows 7'
  else if (ua.includes('Windows')) os = 'Windows'
  else if (ua.includes('Mac OS X')) {
    const v = ua.match(/Mac OS X (\d+[._]\d+)/)
    os = `macOS ${v ? v[1].replace('_', '.') : ''}`
  }
  else if (ua.includes('Android')) {
    const v = ua.match(/Android (\d+\.?\d*)/)
    os = `Android ${v ? v[1] : ''}`
  }
  else if (ua.includes('iPhone') || ua.includes('iPad')) {
    const v = ua.match(/OS (\d+_\d+)/)
    os = `iOS ${v ? v[1].replace('_', '.') : ''}`
  }
  else if (ua.includes('Linux')) os = 'Linux'
  else if (ua.includes('CrOS')) os = 'ChromeOS'

  // Device type
  let device = 'Desktop'
  if (/Mobile|Android|iPhone|iPod/.test(ua)) device = 'Mobile'
  else if (/iPad|Tablet/.test(ua)) device = 'Tablet'

  return `${browser.trim()} on ${os.trim()} (${device})`
}

// ---- Core Audit Functions ----

export async function logAudit({ companyId, userId, actorName, actorRole, action, details }) {
  try {
    const timestamp = new Date().toISOString()

    // Capture client environment info via IPWhois + User Agent
    const browserInfo = getBrowserInfo()
    let visitorInfo = { ip: '127.0.0.1', country: '', city: '', isp: '', timezone: '' }
    try {
      visitorInfo = await getVisitorInfo()
    } catch (e) {
      // Use defaults
    }

    // Build a rich location string: "Accra, Ghana | Vodafone GH | Africa/Accra"
    const locationParts = [
      visitorInfo.city,
      visitorInfo.country
    ].filter(Boolean).join(', ')
    const ispPart = visitorInfo.isp || visitorInfo.org || ''
    const tzPart = visitorInfo.timezone || ''
    const locationString = [locationParts, ispPart, tzPart].filter(Boolean).join(' | ')

    // Combine browser + location into one device string
    const deviceString = locationString ? `${browserInfo} — ${locationString}` : browserInfo

    const logItem = {
      company_id: companyId || null,
      user_id: userId || null,
      actor_name: actorName || 'System User',
      actor_role: actorRole || 'User',
      action: action || 'GENERAL_EVENT',
      details: typeof details === 'object' ? JSON.stringify(details) : String(details || ''),
      ip_address: visitorInfo.ip,
      browser_info: deviceString,
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
      // If Supabase rejects ip_address/browser_info columns (doesn't exist), retry without them
      if (error.message && (error.message.includes('ip_address') || error.message.includes('browser_info') || error.message.includes('column'))) {
        const fallbackItem = {
          company_id: logItem.company_id,
          user_id: logItem.user_id,
          actor_name: logItem.actor_name,
          actor_role: logItem.actor_role,
          action: logItem.action,
          details: `${logItem.details} [IP: ${visitorInfo.ip} | Device: ${deviceString}]`,
          created_at: logItem.created_at
        }
        const { error: retryErr } = await supabase.from('audit_logs').insert(fallbackItem)
        if (retryErr) {
          console.warn('Supabase audit_logs fallback insert warning:', retryErr.message)
        }
      } else {
        console.warn('Supabase audit_logs insert warning (using local audit cache):', error.message)
      }
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
        .limit(500)

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
