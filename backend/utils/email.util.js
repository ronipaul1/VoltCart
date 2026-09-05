const nodemailer = require('nodemailer');

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
    subject: `Welcome to Herbal Remedies, ${data.name}! 🌿`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;padding:20px;border-radius:8px">
        <div style="background:linear-gradient(135deg,#2d6a4f,#52b788);padding:30px;border-radius:8px 8px 0 0;text-align:center">
          <h1 style="color:white;margin:0">🌿 Herbal Remedies</h1>
        </div>
        <div style="background:white;padding:30px;border-radius:0 0 8px 8px">
          <h2>Welcome, ${data.name}!</h2>
          <p>Thank you for joining our herbal family. Explore our range of 100% natural remedies.</p>
          <a href="${process.env.FRONTEND_URL}" style="background:#2d6a4f;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:16px">Shop Now</a>
          <p style="color:#888;font-size:12px;margin-top:20px">Use code <b>WELCOME10</b> for 10% off your first order!</p>
        </div>
      </div>`,
  }),

  'order-confirmed': (data) => ({
    subject: `Order Confirmed #${data.orderNumber}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#2d6a4f;padding:20px;text-align:center">
          <h1 style="color:white;margin:0">🌿 Order Confirmed!</h1>
        </div>
        <div style="padding:20px;background:white">
          <p>Dear ${data.name},</p>
          <p>Your order <b>#${data.orderNumber}</b> has been placed successfully.</p>
          <div style="background:#f0fff4;padding:16px;border-radius:8px;border-left:4px solid #2d6a4f">
            <p style="margin:0"><b>Order Total: ₹${data.totalAmount}</b></p>
          </div>
          <p>We'll notify you when your order is shipped.</p>
          <a href="${process.env.FRONTEND_URL}/orders" style="background:#2d6a4f;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:16px">Track Order</a>
        </div>
      </div>`,
  }),
};

exports.sendEmail = async ({ to, subject, template, data, html }) => {
  if (!process.env.EMAIL_USER || process.env.EMAIL_USER.includes('your_email')) {
    console.log(`[Email Simulation] To: ${to}, Subject: ${subject || (template && templates[template]?.(data)?.subject)}`);
    return;
  }

  const templateContent = template && templates[template] ? templates[template](data) : { subject, html };

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || `"Herbal Remedies" <${process.env.EMAIL_USER}>`,
    to,
    subject: templateContent.subject,
    html: templateContent.html,
  });
};
