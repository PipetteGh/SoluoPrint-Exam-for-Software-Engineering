const getApiUrl = () => {
  // If running locally in dev mode, we might need an absolute URL if proxy isn't setup
  // but generally, we can use the current origin if deployed, or localhost path
  if (import.meta.env.DEV) {
    return 'http://localhost/api/send_email.php' // Assumes local PHP server is running, or we just fallback
  }
  return '/api/send_email.php'
}

/**
 * Sends an email using the custom SMTP PHP backend
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject line
 * @param {string} message - HTML email body
 * @param {string} senderName - Name of the sender (e.g., Company Name)
 */
export async function sendEmail(to, subject, message, senderName = 'SoluoPrint') {
  if (!to || !message) return { success: false, error: 'Recipient or message missing' }

  try {
    // Determine the base path dynamically to avoid hardcoded localhost in production
    const baseUrl = window.location.origin;
    // In dev, the Vite proxy might not exist for /api. 
    // We assume the PHP files are accessible at /api/send_email.php relative to the web root.
    let url = `${baseUrl}/api/send_email.php`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to,
        subject,
        message,
        sender_name: senderName
      })
    })

    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Failed to send email')
    
    return { success: true, data }
  } catch (error) {
    console.error('Email Error:', error)
    return { success: false, error: error.message }
  }
}
