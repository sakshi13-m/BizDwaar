import nodemailer from 'nodemailer'

/**
 * Outbound email.
 *
 * GoDaddy hosting blocks outbound SMTP (production log: "connect EACCES …:587"), so in
 * production mail goes through Resend's HTTPS API (port 443) when RESEND_API_KEY is set.
 * SMTP remains as a fallback for local development. If neither is configured, nothing
 * is sent and callers get { sent: false } — callers must never claim an email was sent.
 */

const RESEND_URL = 'https://api.resend.com/emails'

let smtpTransporter = null
function smtp() {
  if (!process.env.SMTP_HOST) return null
  if (!smtpTransporter) {
    const port = Number(process.env.SMTP_PORT || 587)
    smtpTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465, // 465 = implicit TLS; 587 = STARTTLS
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    })
  }
  return smtpTransporter
}

// Tests replace the transport to capture messages instead of sending them
let testTransport = null
export function setEmailTransportForTests(fn) {
  testTransport = fn
}

export function emailConfigured() {
  return Boolean(testTransport || process.env.RESEND_API_KEY || process.env.SMTP_HOST)
}

function fromAddress() {
  return process.env.EMAIL_FROM || process.env.SMTP_USER || 'Bizdwaar <no-reply@bizdwaar.in>'
}

/**
 * Send a plain-text email. Returns { sent: true } or { sent: false, error }.
 * Never throws; the error text is for server logs only.
 */
export async function sendEmail({ to, subject, text, replyTo }) {
  const message = { from: fromAddress(), to, subject, text, replyTo }
  try {
    if (testTransport) {
      await testTransport(message)
      return { sent: true }
    }
    if (process.env.RESEND_API_KEY) {
      const res = await fetch(RESEND_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: message.from,
          to: [to],
          subject,
          text,
          ...(replyTo ? { reply_to: replyTo } : {})
        }),
        signal: AbortSignal.timeout(10_000)
      })
      if (!res.ok) {
        const detail = (await res.text().catch(() => '')).slice(0, 200)
        return { sent: false, error: `Email API ${res.status}: ${detail}` }
      }
      return { sent: true }
    }
    const transporter = smtp()
    if (transporter) {
      await transporter.sendMail(message)
      return { sent: true }
    }
    return { sent: false, error: 'No email provider configured (RESEND_API_KEY or SMTP_HOST)' }
  } catch (err) {
    return { sent: false, error: err.message }
  }
}

/**
 * Enquiry notification. Goes to the business owner's login email when the page belongs to
 * an account, otherwise to the fixed ENQUIRY_TO address. Returns { sent, error? }.
 */
export async function sendEnquiryEmail(enquiry, business, ownerEmail = null) {
  const recipient = ownerEmail || process.env.ENQUIRY_TO
  if (!recipient) return { sent: false, error: 'No recipient (owner email or ENQUIRY_TO)' }

  const text = `
You have received a new enquiry from your Bizdwaar business page.

Business: ${business.name}
Customer: ${enquiry.customerName}
Email: ${enquiry.customerEmail || 'Not provided'}
Phone: ${enquiry.customerPhone || 'Not provided'}
Interested in: ${enquiry.productName || 'General enquiry'}

Message:
${enquiry.message}

---
Received: ${new Date(enquiry.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
See all enquiries in your Bizdwaar inbox: https://bizdwaar.in/owner
`.trim()

  const result = await sendEmail({
    to: recipient,
    subject: `New enquiry from ${enquiry.customerName} | ${business.name}`,
    text,
    replyTo: enquiry.customerEmail || undefined
  })
  if (!result.sent) console.error('Enquiry email not sent:', result.error)
  return result
}

export async function sendLoginCodeEmail(email, code) {
  return sendEmail({
    to: email,
    subject: `${code} is your Bizdwaar login code`,
    text: `
Your Bizdwaar login code is: ${code}

Enter it on the Bizdwaar login screen within 10 minutes to manage your business page.
If you didn't ask for this code, you can ignore this email — nobody can log in without it.

Bizdwaar · https://bizdwaar.in
`.trim()
  })
}
