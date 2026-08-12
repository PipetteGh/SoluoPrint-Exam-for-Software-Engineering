import { supabase } from './supabase'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Sends an SMS via the Supabase Edge Function (server-side proxy to avoid CORS)
 * Supports: SMSOnlineGH, Hubtel
 * @param {string} to - Recipient phone number
 * @param {string} content - Message content
 * @param {object} settings - API settings (provider, api_key, api_secret, sender_id, api_url)
 */
export async function sendSms(to, content, settings = {}) {
  if (!to || !content) return { success: false, error: 'Recipient or content missing' }

  const provider = settings.provider || 'hubtel'

  // Clean phone number: remove '+' and ensure it starts with 233 if it's 10 digits
  let formattedTo = to.replace(/\+/g, '').trim()
  if (formattedTo.length === 10 && formattedTo.startsWith('0')) {
    formattedTo = '233' + formattedTo.substring(1)
  } else if (formattedTo.length === 9) {
    formattedTo = '233' + formattedTo
  }

  try {
    // Call the Supabase Edge Function which handles the actual API call server-side
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-sms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        provider,
        to: formattedTo,
        content,
        api_key: settings.api_key || '',
        api_secret: settings.api_secret || '',
        sender_id: settings.sender_id || '',
        api_url: settings.api_url || ''
      })
    })

    const data = await response.json()
    console.log('SMS Response:', data)
    return { success: data.success, data }
  } catch (error) {
    console.error('SMS Error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Helper to check customer and company SMS settings before sending
 */
export async function notifyCustomer(companyId, customerId, eventType, content) {
  try {
    // 1. Fetch customer notification preference
    const { data: customer, error: customerErr } = await supabase
      .from('customers')
      .select('name, phone, sms_notifications')
      .eq('id', customerId)
      .single()

    if (customerErr || !customer || !customer.sms_notifications || !customer.phone) {
      console.warn('SMS skipped: Customer opted out or no phone')
      return { success: false, reason: 'Customer opted out or no phone' }
    }

    // 2. Fetch company SMS settings AND company info
    const [{ data: settings }, { data: company }] = await Promise.all([
      supabase.from('sms_settings').select('*').eq('company_id', companyId).single(),
      supabase.from('companies').select('name, phone').eq('id', companyId).single()
    ])

    // Map events to settings columns
    const eventMap = {
      'welcome': 'customer_welcome',
      'job_created': 'job_created',
      'job_completed': 'job_completed',
      'payment_received': 'payment_received',
      'job_list_created': 'job_created'
    }

    const settingKey = eventMap[eventType]

    // Check if the trigger is enabled in settings
    if (settings && settingKey && settings[settingKey] === false) {
      console.warn(`SMS skipped: ${eventType} trigger is disabled in company settings`)
      return { success: false, reason: 'Trigger disabled' }
    }

    // Format the message with Hello [Name] and Regards: [CompanyName] - [Phone]
    const companyName = company?.name || 'the shop'
    const companyPhone = company?.phone ? ` - ${company.phone}` : ''
    const personalizedContent = `Hello ${customer.name}, ${content} Regards: ${companyName}${companyPhone} Powered by: SoluoPrint`

    return await sendSms(customer.phone, personalizedContent, settings || {})
  } catch (error) {
    console.error('Notification Error:', error)
    return { success: false, error: error.message }
  }
}
