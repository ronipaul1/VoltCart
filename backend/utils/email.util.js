const nodemailer = require('nodemailer');
let emailService;
try {
  emailService = require('../services/emailService');
} catch (_) {}

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const templates = {
  welcome: (data) => ({
    subject: `Welcome to VoltCart, ${data.name}! ⚡`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;background:#0b0f19;padding:24px;border-radius:12px">
        <div style="background:linear-gradient(135deg,#090d16 0%,#0f172a 100%);padding:32px 24px;border-radius:8px 8px 0 0;text-align:center;border-bottom:2px solid #06b6d4">
          <h1 style="color:#ffffff;margin:0;font-size:26px;letter-spacing:-0.5px">⚡ VoltCart</h1>
        </div>
        <div style="background:#ffffff;padding:32px 28px;border-radius:0 0 8px 8px;color:#334155">
          <h2 style="color:#0f172a;margin-top:0;font-size:22px">Welcome, ${data.name}!</h2>
          <p style="font-size:15px;line-height:1.6">Thank you for creating an account with VoltCart. Discover top-rated smartphones, computers, audio equipment, and the latest electronics with fast, secure delivery.</p>
          <div style="text-align:center;margin:28px 0">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" style="background:linear-gradient(135deg,#06b6d4 0%,#0284c7 100%);color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600;font-size:15px">Explore Tech</a>
          </div>
          <p style="color:#64748b;font-size:12px;margin:24px 0 0 0;border-top:1px solid #e2e8f0;padding-top:16px;text-align:center">Questions? Reach out to support at ${process.env.STORE_EMAIL || 'support@voltcart.com'}</p>
        </div>
      </div>`,
  }),

  'order-confirmed': (data) => ({
    subject: `Order Confirmed #${data.orderNumber} - VoltCart`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;background:#0b0f19;padding:24px;border-radius:12px">
        <div style="background:linear-gradient(135deg,#090d16 0%,#0f172a 100%);padding:28px 24px;text-align:center;border-bottom:2px solid #06b6d4;border-radius:8px 8px 0 0">
          <h1 style="color:#ffffff;margin:0;font-size:24px">⚡ VoltCart</h1>
        </div>
        <div style="padding:28px;background:#ffffff;border-radius:0 0 8px 8px;color:#334155">
          <h2 style="color:#0f172a;margin-top:0">Order Confirmed!</h2>
          <p>Dear ${data.name},</p>
          <p>Your order <b>#${data.orderNumber}</b> has been placed successfully.</p>
          <div style="background:#ecfeff;padding:16px;border-radius:8px;border-left:4px solid #06b6d4;margin:20px 0">
            <p style="margin:0;color:#0e7490;font-size:15px"><b>Order Total: ₹${data.totalAmount}</b></p>
          </div>
          <p>We'll notify you as soon as your items ship.</p>
          <div style="text-align:center;margin-top:24px">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/orders" style="background:linear-gradient(135deg,#06b6d4 0%,#0284c7 100%);color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600">Track Order</a>
          </div>
        </div>
      </div>`,
  }),
};

exports.sendEmail = async ({ to, subject, template, data, html, text }) => {
  const templateContent = template && templates[template] ? templates[template](data) : { subject, html, text };

  // If Brevo service is available and configured, use Brevo
  if (emailService && (process.env.BREVO_API_KEY || !process.env.EMAIL_USER)) {
    return await emailService.sendEmail({
      to,
      subject: templateContent.subject || subject,
      html: templateContent.html || html,
      text: templateContent.text || text,
    });
  }

  // Fallback to Nodemailer if EMAIL_USER is configured
  if (process.env.EMAIL_USER && !process.env.EMAIL_USER.includes('your_email')) {
    return await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"${process.env.STORE_NAME || 'VoltCart'}" <${process.env.EMAIL_USER}>`,
      to,
      subject: templateContent.subject,
      html: templateContent.html,
    });
  }

  console.log(`[Email Simulation] To: ${to}, Subject: ${templateContent.subject || subject}`);
  return { success: true, simulated: true };
};

