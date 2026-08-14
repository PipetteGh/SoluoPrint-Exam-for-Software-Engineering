import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import nodemailer from 'nodemailer'
import fs from 'fs'
import path from 'path'

const emailPlugin = (env) => {
  return {
    name: 'custom-email-plugin',
    configureServer(server) {
      server.middlewares.use('/api/send_email.php', async (req, res, next) => {
        if (req.method === 'POST') {
          let body = ''
          req.on('data', chunk => {
            body += chunk.toString()
          })
          req.on('end', async () => {
            try {
              const parsedBody = JSON.parse(body)
              
              const transporter = nodemailer.createTransport({
                host: env.SMTP_HOST || 'premium237.web-hosting.com',
                port: Number(env.SMTP_PORT) || 465,
                secure: true, 
                auth: {
                  user: env.SMTP_USER,
                  pass: env.SMTP_PASS
                }
              })

              await transporter.sendMail({
                from: `"${parsedBody.sender_name}" <${env.SMTP_USER}>`,
                to: parsedBody.to,
                subject: parsedBody.subject,
                html: parsedBody.message
              })

              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: true }))
            } catch (err) {
              console.error('SMTP Error:', err)
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: false, error: err.message }))
            }
          })
        } else {
          next()
        }
      })
    }
  }
}

const uploadPlugin = () => {
  return {
    name: 'custom-upload-plugin',
    configureServer(server) {
      // Serve files from /uploads directory
      server.middlewares.use('/uploads', (req, res, next) => {
        const relativePath = decodeURIComponent(req.url.split('?')[0])
        const filePath = path.join(process.cwd(), 'uploads', relativePath)
        
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          const ext = path.extname(filePath).toLowerCase()
          const mimeTypes = {
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.pdf': 'application/pdf',
            '.svg': 'image/svg+xml',
            '.txt': 'text/plain',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          }
          res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream')
          res.setHeader('Access-Control-Allow-Origin', '*')
          fs.createReadStream(filePath).pipe(res)
        } else {
          next()
        }
      })

      // Upload handler for POST /api/upload.php
      server.middlewares.use('/api/upload.php', (req, res, next) => {
        if (req.method === 'POST') {
          const chunks = []
          req.on('data', chunk => chunks.push(chunk))
          req.on('end', () => {
            try {
              const buffer = Buffer.concat(chunks)
              const contentType = req.headers['content-type'] || ''
              
              if (!contentType.includes('multipart/form-data')) {
                res.statusCode = 400
                return res.end(JSON.stringify({ success: false, error: 'Expected multipart/form-data' }))
              }

              const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/)
              if (!boundaryMatch) {
                res.statusCode = 400
                return res.end(JSON.stringify({ success: false, error: 'Invalid boundary' }))
              }

              const boundary = boundaryMatch[1] || boundaryMatch[2]
              const boundaryBuffer = Buffer.from('--' + boundary)
              
              // Extract company_id from fields
              let companyId = 'general'
              const companyIdMatch = buffer.toString('utf8').match(/name="company_id"\r\n\r\n([^\r\n]+)/)
              if (companyIdMatch && companyIdMatch[1]) {
                companyId = companyIdMatch[1].trim()
              }

              const uploadDir = path.join(process.cwd(), 'uploads', 'joblist', companyId)
              if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true })
              }

              const uploadedFiles = []
              
              // Split multipart buffer by boundary
              let start = 0
              while (start < buffer.length) {
                const boundaryIdx = buffer.indexOf(boundaryBuffer, start)
                if (boundaryIdx === -1) break

                const nextBoundaryIdx = buffer.indexOf(boundaryBuffer, boundaryIdx + boundaryBuffer.length)
                if (nextBoundaryIdx === -1) break

                const partBuffer = buffer.slice(boundaryIdx + boundaryBuffer.length, nextBoundaryIdx)
                const headerEndIdx = partBuffer.indexOf('\r\n\r\n')

                if (headerEndIdx !== -1) {
                  const headersText = partBuffer.slice(0, headerEndIdx).toString('utf8')
                  const filenameMatch = headersText.match(/filename="([^"]+)"/)

                  if (filenameMatch && filenameMatch[1]) {
                    const rawName = filenameMatch[1]
                    const fileContent = partBuffer.slice(headerEndIdx + 4, partBuffer.length - 2)

                    const safeName = rawName.replace(/[^a-zA-Z0-9_.-]/g, '_')
                    const savePath = path.join(uploadDir, safeName)
                    fs.writeFileSync(savePath, fileContent)

                    const publicUrl = `/uploads/joblist/${companyId}/${safeName}`
                    uploadedFiles.push({ url: publicUrl, name: safeName })
                  }
                }

                start = nextBoundaryIdx
              }

              res.setHeader('Content-Type', 'application/json')
              res.setHeader('Access-Control-Allow-Origin', '*')
              res.end(JSON.stringify({ success: true, uploaded: uploadedFiles }))
            } catch (err) {
              console.error('Vite Upload Plugin Error:', err)
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: false, error: err.message }))
            }
          })
        } else {
          next()
        }
      })
    }
  }
}

const hubtelPlugin = () => {
  return {
    name: 'hubtel-proxy-plugin',
    configureServer(server) {
      // POST /api/hubtel/initiate - Initiate Hubtel checkout
      server.middlewares.use('/api/hubtel/initiate', (req, res, next) => {
        if (req.method === 'POST') {
          let body = ''
          req.on('data', chunk => { body += chunk.toString() })
          req.on('end', async () => {
            try {
              const parsed = JSON.parse(body)
              const { clientId, clientSecret, totalAmount, title, description, clientReference, callbackUrl, returnUrl, cancellationUrl, merchantAccountNumber } = parsed

              if (!clientId || !clientSecret) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                return res.end(JSON.stringify({ success: false, error: 'Missing Hubtel credentials' }))
              }

              const authHeader = 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

              const hubtelPayload = {
                totalAmount: parseFloat(totalAmount),
                title: title || 'Payment',
                description: description || 'Payment',
                callbackUrl: callbackUrl || '',
                returnUrl: returnUrl || '',
                cancellationUrl: cancellationUrl || '',
                merchantAccountNumber: merchantAccountNumber || '',
                clientReference: clientReference || ''
              }

              const response = await fetch('https://payproxyapi.hubtel.com/items/initiate', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': authHeader
                },
                body: JSON.stringify(hubtelPayload)
              })

              const rawText = await response.text()
              let result = {}
              try {
                result = rawText ? JSON.parse(rawText) : {}
              } catch (e) {
                console.error('Hubtel non-JSON response:', rawText)
                result = { error: 'Invalid response from Hubtel', details: rawText }
              }

              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: response.ok, status: response.status, data: result }))
            } catch (err) {
              console.error('Hubtel Proxy Error:', err)
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: false, error: err.message }))
            }
          })
        } else {
          next()
        }
      })

      // GET /api/hubtel/status?clientId=...&clientSecret=...&clientReference=... - Check payment status
      server.middlewares.use('/api/hubtel/status', (req, res, next) => {
        if (req.method === 'GET') {
          ;(async () => {
            try {
              const url = new URL(req.url, `http://${req.headers.host}`)
              const clientId = url.searchParams.get('clientId')
              const clientSecret = url.searchParams.get('clientSecret')
              const clientReference = url.searchParams.get('clientReference')
              const merchantAccountNumber = url.searchParams.get('merchantAccountNumber')

              if (!clientId || !clientSecret || !clientReference || !merchantAccountNumber) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                return res.end(JSON.stringify({ success: false, error: 'Missing required parameters' }))
              }

              const authHeader = 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
              // The status check endpoint uses a different base URL and path format according to Hubtel docs
              const statusUrl = `https://api-txnstatus.hubtel.com/transactions/${encodeURIComponent(merchantAccountNumber)}/status?clientReference=${encodeURIComponent(clientReference)}`

              const response = await fetch(statusUrl, {
                method: 'GET',
                headers: { 'Authorization': authHeader }
              })

              const rawText = await response.text()
              let result = {}
              try {
                result = rawText ? JSON.parse(rawText) : {}
              } catch (e) {
                console.error('Hubtel status non-JSON response:', rawText)
                result = { error: 'Invalid response from Hubtel', details: rawText }
              }

              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: response.ok, status: response.status, data: result }))
            } catch (err) {
              console.error('Hubtel Status Check Error:', err)
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: false, error: err.message }))
            }
          })()
        } else {
          next()
        }
      })
    }
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), emailPlugin(env), uploadPlugin(), hubtelPlugin()],
    base: '/',
    server: {
      port: 3000,
      open: true
    }
  }
})
