import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import nodemailer from 'nodemailer'

const emailPlugin = (env) => {
  return {
    name: 'custom-email-plugin',
    configureServer(server) {
      server.middlewares.use('/api/send_email.php', async (req, res, next) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => {
            body += chunk.toString();
          });
          req.on('end', async () => {
            try {
              const parsedBody = JSON.parse(body);
              
              // Nodemailer config using env variables
              const transporter = nodemailer.createTransport({
                host: env.SMTP_HOST || 'premium237.web-hosting.com',
                port: Number(env.SMTP_PORT) || 465,
                secure: true, 
                auth: {
                  user: env.SMTP_USER,
                  pass: env.SMTP_PASS
                }
              });

              await transporter.sendMail({
                from: `"${parsedBody.sender_name}" <${env.SMTP_USER}>`,
                to: parsedBody.to,
                subject: parsedBody.subject,
                html: parsedBody.message
              });

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            } catch (err) {
              console.error('SMTP Error:', err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
        } else {
          next();
        }
      });
    }
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), emailPlugin(env)],
    base: '/',
    server: {
      port: 3000,
      open: true
    }
  }
})
