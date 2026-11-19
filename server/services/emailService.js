import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
})

/**
 * Send enquiry notification to the fixed owner mailbox.
 * Returns { sent: true } on success or { sent: false, error } on failure.
 */
export async function sendEnquiryEmail(enquiry, business) {
  const recipient = process.env.ENQUIRY_TO
  if (!recipient) {
    console.error('ENQUIRY_TO not set in environment')
    return { sent: false, error: 'ENQUIRY_TO not configured' }
  }

  const subject = `New enquiry from ${enquiry.customerName} | ${business.name}`
  const text = `
You have received a new enquiry from your Bizdwaar storefront.

Business: ${business.name}
Customer: ${enquiry.customerName}
Email: ${enquiry.customerEmail || 'Not provided'}
Phone: ${enquiry.customerPhone || 'Not provided'}

Message:
${enquiry.message}

---
Received: ${new Date(enquiry.createdAt).toLocaleString()}
Bizdwaar | Your business's doorway to the digital world
  `.trim()

  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: recipient,
      subject,
      text
    })
    return { sent: true }
  } catch (err) {
    console.error('SMTP send failed:', err.message)
    return { sent: false, error: err.message }
  }
}
