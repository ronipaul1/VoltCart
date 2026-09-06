const fs = require('fs');
const path = require('path');
const db = require('../config/database');
const templates = require('./emailTemplates');
require('dotenv').config();

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
const logFilePath = path.join(__dirname, '..', 'email-service.log');

/**
 * File & console audit logger
 */
function logEmailActivity(level, message, details = {}) {
  const timestamp = new Date().toISOString();
  const detailStr = Object.keys(details).length ? ` | ${JSON.stringify(details)}` : '';
  const logLine = `[${timestamp}] [${level}] ${message}${detailStr}\n`;
  try {
    fs.appendFileSync(logFilePath, logLine);
  } catch (_) {}
  if (level === 'ERROR') {
    console.error(`[Brevo Email] ${message}`, details);
  } else {
    console.log(`[Brevo Email] ${message}`, details);
  }
}

// Initialize tracking table flag
let tableEnsured = false;

/**
 * Ensure `order_email_logs` table exists for tracking and duplicate prevention
 */
async function ensureTrackingTable() {
  if (tableEnsured) return;
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS order_email_logs (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        order_id INT UNSIGNED NOT NULL,
        event_type VARCHAR(64) NOT NULL,
        recipient_email VARCHAR(191) NOT NULL,
        recipient_type ENUM('customer', 'admin') NOT NULL DEFAULT 'customer',
        message_id VARCHAR(255) DEFAULT NULL,
        status ENUM('sent', 'failed', 'skipped') NOT NULL DEFAULT 'sent',
        error_message TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_order_event_recipient (order_id, event_type, recipient_email),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    tableEnsured = true;
  } catch (err) {
    logEmailActivity('WARN', `Could not initialize order_email_logs table: ${err.message}`);
  }
}

/**
 * Configuration getters
 */
const getBrevoApiKey = () => process.env.BREVO_API_KEY || '';
const getSenderName = () => process.env.EMAIL_FROM_NAME || process.env.STORE_NAME || 'VoltCart';
const getSenderEmail = () => process.env.EMAIL_FROM_ADDRESS || process.env.STORE_EMAIL || 'support@voltcart.com';
const getAdminEmail = () => process.env.ADMIN_EMAIL || process.env.STORE_EMAIL || 'admin@voltcart.com';

const isBrevoConfigured = () => {
  const key = getBrevoApiKey();
  return Boolean(key && !key.includes('your_') && key.trim().length > 10);
};

/**
 * Fetch full order context (order, user, items, address)
 * Supports direct pass-through via options to prevent database roundtrips or missing row race conditions.
 */
async function getFullOrderContext(orderIdOrNumber, options = {}) {
  // 1. Direct pass-through if caller already assembled context
  if (options.order && options.user) {
    return {
      order: options.order,
      user: options.user,
      items: options.items || [],
      address: options.address || null,
    };
  }

  // 2. Query database
  try {
    const isNumeric = !isNaN(orderIdOrNumber);
    const query = isNumeric
      ? 'SELECT * FROM orders WHERE id = ?'
      : 'SELECT * FROM orders WHERE order_number = ?';

    const [orders] = await db.execute(query, [orderIdOrNumber]);
    if (!orders.length) {
      logEmailActivity('WARN', `Order #${orderIdOrNumber} not found in database`);
      return null;
    }

    const order = orders[0];
    const orderId = order.id;

    // Fetch user details
    let user = options.user || { name: 'Customer', email: '' };
    if (order.user_id) {
      const [users] = await db.execute('SELECT id, name, email, phone FROM users WHERE id = ?', [order.user_id]);
      if (users.length) {
        user = users[0];
      }
    }

    // Fetch address details
    let address = options.address || null;
    if (order.address_id && !address) {
      const [addresses] = await db.execute('SELECT * FROM addresses WHERE id = ?', [order.address_id]);
      if (addresses.length) address = addresses[0];
    }

    // Fetch order items
    let items = options.items || [];
    if (!items.length) {
      const [dbItems] = await db.execute('SELECT * FROM order_items WHERE order_id = ?', [orderId]);
      items = dbItems;
    }

    return { order, user, items, address };
  } catch (err) {
    logEmailActivity('ERROR', `Failed to retrieve order context for #${orderIdOrNumber}: ${err.message}`);
    return null;
  }
}

/**
 * Low-level Brevo API email sender with deduplication and logging
 */
async function sendBrevoEmail({
  orderId,
  eventType,
  toEmail,
  toName,
  recipientType = 'customer',
  subject,
  htmlContent,
  textContent,
}) {
  try {
    await ensureTrackingTable();

    if (!toEmail) {
      console.warn(`[Brevo Email] Skipped ${eventType}: No recipient email provided.`);
      return { success: false, skipped: true, reason: 'Recipient email is missing' };
    }

    // ── 1. Duplicate Prevention Check ──────────────────────────────────────
    if (orderId && eventType) {
      try {
        const [existing] = await db.execute(
          'SELECT id FROM order_email_logs WHERE order_id = ? AND event_type = ? AND recipient_email = ? AND status = "sent" LIMIT 1',
          [orderId, eventType, toEmail]
        );
        if (existing.length > 0) {
          console.log(`[Brevo Email] Duplicate prevented: '${eventType}' already sent to ${toEmail} for order #${orderId}.`);
          return { success: true, skipped: true, reason: 'Duplicate email prevented' };
        }
      } catch (checkErr) {
        console.warn('[Brevo Email] Duplicate check warning:', checkErr.message);
      }
    }

    // ── 2. Simulation Mode (if API key not configured) ────────────────────
    if (!isBrevoConfigured()) {
      const simMessageId = `sim_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      console.log(`[Brevo Simulation] Recipient: ${toEmail} (${toName || 'User'}) | Subject: "${subject}" | Event: ${eventType}`);

      if (orderId && eventType) {
        try {
          await db.execute(`
            INSERT INTO order_email_logs (order_id, event_type, recipient_email, recipient_type, message_id, status)
            VALUES (?, ?, ?, ?, ?, 'sent')
          `, [orderId, eventType, toEmail, recipientType, simMessageId]);
        } catch (logErr) {
          console.error('[Brevo Email] Failed to record simulation log:', logErr.message);
        }
      }

      return {
        success: true,
        simulated: true,
        messageId: simMessageId,
      };
    }

    // ── 3. Production Brevo API Request ──────────────────────────────────
    const payload = {
      sender: {
        name: getSenderName(),
        email: getSenderEmail(),
      },
      to: [
        {
          email: toEmail,
          name: toName || undefined,
        },
      ],
      subject,
      htmlContent,
      textContent: textContent || undefined,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'api-key': getBrevoApiKey(),
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = result.message || `Brevo API returned HTTP ${response.status}`;
      console.error(`[Brevo Email Error] HTTP ${response.status} for event ${eventType}: ${errorMsg}`);

      if (orderId && eventType) {
        await db.execute(`
          INSERT INTO order_email_logs (order_id, event_type, recipient_email, recipient_type, status, error_message)
          VALUES (?, ?, ?, ?, 'failed', ?)
        `, [orderId, eventType, toEmail, recipientType, errorMsg]).catch(() => {});
      }

      return { success: false, error: errorMsg };
    }

    const messageId = result.messageId || `msg_${Date.now()}`;
    console.log(`[Brevo Email Sent] Event: ${eventType} | To: ${toEmail} | MessageID: ${messageId}`);

    if (orderId && eventType) {
      await db.execute(`
        INSERT INTO order_email_logs (order_id, event_type, recipient_email, recipient_type, message_id, status)
        VALUES (?, ?, ?, ?, ?, 'sent')
      `, [orderId, eventType, toEmail, recipientType, messageId]).catch(() => {});
    }

    return { success: true, messageId };
  } catch (error) {
    const errorMsg = error.name === 'AbortError' ? 'Brevo API request timed out (10s)' : error.message;
    console.error(`[Brevo Email Exception] Event ${eventType}:`, errorMsg);

    if (orderId && eventType && toEmail) {
      try {
        await db.execute(`
          INSERT INTO order_email_logs (order_id, event_type, recipient_email, recipient_type, status, error_message)
          VALUES (?, ?, ?, ?, 'failed', ?)
        `, [orderId, eventType, toEmail, recipientType, errorMsg]);
      } catch (_) {}
    }

    return { success: false, error: errorMsg };
  }
}

// ============================================================================
// PUBLIC TRANSACTIONAL EMAIL METHODS
// ============================================================================

/**
 * 1. Send Order Confirmation Email (Customer)
 */
exports.sendOrderConfirmationEmail = async (orderId, options = {}) => {
  try {
    const ctx = await getFullOrderContext(orderId, options);
    if (!ctx) {
      logEmailActivity('WARN', `Order confirmation cancelled: Context could not be resolved for #${orderId}`);
      return { success: false, reason: 'Order context not found' };
    }
    if (!ctx.user || !ctx.user.email) {
      logEmailActivity('WARN', `Order confirmation cancelled for #${orderId}: No email on user record`, { user: ctx.user });
      return { success: false, reason: 'Customer email not found' };
    }

    logEmailActivity('INFO', `Preparing order confirmation for #${ctx.order?.order_number || orderId} to ${ctx.user.email}`);
    const { subject, htmlContent, textContent } = templates.orderConfirmationTemplate(ctx);
    return await sendBrevoEmail({
      orderId: ctx.order.id,
      eventType: 'order_confirmation',
      toEmail: ctx.user.email,
      toName: ctx.user.name,
      recipientType: 'customer',
      subject,
      htmlContent,
      textContent,
    });
  } catch (err) {
    logEmailActivity('ERROR', `sendOrderConfirmationEmail exception for #${orderId}: ${err.message}`);
    return { success: false, error: err.message };
  }
};

/**
 * 2. Send Order Shipped Email (Customer)
 */
exports.sendOrderShippedEmail = async (orderId, options = {}) => {
  try {
    const ctx = await getFullOrderContext(orderId);
    if (!ctx || !ctx.user.email) return { success: false, reason: 'Order or user email not found' };

    const tracking = {
      carrier: options.carrier || ctx.order.shippo_tracking_carrier || ctx.order.shippo_rate_provider,
      trackingNumber: options.trackingNumber || ctx.order.tracking_number,
      trackingUrl: options.trackingUrl || ctx.order.shippo_label_url,
    };

    const { subject, htmlContent, textContent } = templates.orderShippedTemplate({
      ...ctx,
      tracking,
    });

    return await sendBrevoEmail({
      orderId: ctx.order.id,
      eventType: 'order_shipped',
      toEmail: ctx.user.email,
      toName: ctx.user.name,
      recipientType: 'customer',
      subject,
      htmlContent,
      textContent,
    });
  } catch (err) {
    console.error('[Brevo Service] sendOrderShippedEmail failed:', err.message);
    return { success: false, error: err.message };
  }
};

/**
 * 3. Send Order Delivered Email (Customer)
 */
exports.sendOrderDeliveredEmail = async (orderId, options = {}) => {
  try {
    const ctx = await getFullOrderContext(orderId);
    if (!ctx || !ctx.user.email) return { success: false, reason: 'Order or user email not found' };

    const { subject, htmlContent, textContent } = templates.orderDeliveredTemplate(ctx);
    return await sendBrevoEmail({
      orderId: ctx.order.id,
      eventType: 'order_delivered',
      toEmail: ctx.user.email,
      toName: ctx.user.name,
      recipientType: 'customer',
      subject,
      htmlContent,
      textContent,
    });
  } catch (err) {
    console.error('[Brevo Service] sendOrderDeliveredEmail failed:', err.message);
    return { success: false, error: err.message };
  }
};

/**
 * 4. Send Order Cancelled Email (Customer)
 */
exports.sendOrderCancelledEmail = async (orderId, options = {}) => {
  try {
    const ctx = await getFullOrderContext(orderId);
    if (!ctx || !ctx.user.email) return { success: false, reason: 'Order or user email not found' };

    const reason = options.reason || ctx.order.cancel_reason || 'Cancelled by request';
    const { subject, htmlContent, textContent } = templates.orderCancelledTemplate({
      ...ctx,
      reason,
    });

    return await sendBrevoEmail({
      orderId: ctx.order.id,
      eventType: 'order_cancelled',
      toEmail: ctx.user.email,
      toName: ctx.user.name,
      recipientType: 'customer',
      subject,
      htmlContent,
      textContent,
    });
  } catch (err) {
    console.error('[Brevo Service] sendOrderCancelledEmail failed:', err.message);
    return { success: false, error: err.message };
  }
};

/**
 * 5. Send Payment Success Email (Customer)
 */
exports.sendPaymentSuccessEmail = async (orderId, paymentDetails = {}) => {
  try {
    const ctx = await getFullOrderContext(orderId);
    if (!ctx || !ctx.user.email) return { success: false, reason: 'Order or user email not found' };

    const payment = {
      amount: paymentDetails.amount || ctx.order.total_amount,
      gateway: paymentDetails.gateway || ctx.order.payment_method,
      transactionId: paymentDetails.transactionId || paymentDetails.gateway_payment_id || null,
    };

    const { subject, htmlContent, textContent } = templates.paymentSuccessTemplate({
      ...ctx,
      payment,
    });

    return await sendBrevoEmail({
      orderId: ctx.order.id,
      eventType: 'payment_success',
      toEmail: ctx.user.email,
      toName: ctx.user.name,
      recipientType: 'customer',
      subject,
      htmlContent,
      textContent,
    });
  } catch (err) {
    console.error('[Brevo Service] sendPaymentSuccessEmail failed:', err.message);
    return { success: false, error: err.message };
  }
};

/**
 * 6. Send Payment Failed Email (Customer)
 */
exports.sendPaymentFailedEmail = async (orderId, paymentDetails = {}) => {
  try {
    const ctx = await getFullOrderContext(orderId);
    if (!ctx || !ctx.user.email) return { success: false, reason: 'Order or user email not found' };

    const payment = {
      amount: paymentDetails.amount || ctx.order.total_amount,
      gateway: paymentDetails.gateway || ctx.order.payment_method,
      reason: paymentDetails.reason || 'Payment verification failed',
    };

    const { subject, htmlContent, textContent } = templates.paymentFailedTemplate({
      ...ctx,
      payment,
    });

    return await sendBrevoEmail({
      orderId: ctx.order.id,
      eventType: 'payment_failed',
      toEmail: ctx.user.email,
      toName: ctx.user.name,
      recipientType: 'customer',
      subject,
      htmlContent,
      textContent,
    });
  } catch (err) {
    console.error('[Brevo Service] sendPaymentFailedEmail failed:', err.message);
    return { success: false, error: err.message };
  }
};

/**
 * 7. Send Admin: New Order Received Email
 */
exports.sendAdminOrderReceivedEmail = async (orderId, options = {}) => {
  try {
    const adminEmail = getAdminEmail();
    if (!adminEmail) {
      logEmailActivity('WARN', `Skipped admin order alert: ADMIN_EMAIL not configured`);
      return { success: false, reason: 'ADMIN_EMAIL not configured' };
    }

    const ctx = await getFullOrderContext(orderId, options);
    if (!ctx) {
      logEmailActivity('WARN', `Skipped admin order alert: Order context not found for #${orderId}`);
      return { success: false, reason: 'Order not found' };
    }

    logEmailActivity('INFO', `Preparing admin order alert for #${ctx.order?.order_number || orderId} to ${adminEmail}`);
    const { subject, htmlContent, textContent } = templates.adminOrderReceivedTemplate(ctx);
    return await sendBrevoEmail({
      orderId: ctx.order.id,
      eventType: 'admin_order_received',
      toEmail: adminEmail,
      toName: 'VoltCart Admin',
      recipientType: 'admin',
      subject,
      htmlContent,
      textContent,
    });
  } catch (err) {
    logEmailActivity('ERROR', `sendAdminOrderReceivedEmail exception for #${orderId}: ${err.message}`);
    return { success: false, error: err.message };
  }
};

/**
 * 8. Send Admin: Order Delivered Email
 */
exports.sendAdminOrderDeliveredEmail = async (orderId) => {
  try {
    const adminEmail = getAdminEmail();
    if (!adminEmail) return { success: false, reason: 'ADMIN_EMAIL not configured' };

    const ctx = await getFullOrderContext(orderId);
    if (!ctx) return { success: false, reason: 'Order not found' };

    const { subject, htmlContent, textContent } = templates.adminOrderDeliveredTemplate(ctx);
    return await sendBrevoEmail({
      orderId: ctx.order.id,
      eventType: 'admin_order_delivered',
      toEmail: adminEmail,
      toName: 'VoltCart Admin',
      recipientType: 'admin',
      subject,
      htmlContent,
      textContent,
    });
  } catch (err) {
    console.error('[Brevo Service] sendAdminOrderDeliveredEmail failed:', err.message);
    return { success: false, error: err.message };
  }
};

/**
 * 9. Send Admin: Order Cancelled Email
 */
exports.sendAdminOrderCancelledEmail = async (orderId, options = {}) => {
  try {
    const adminEmail = getAdminEmail();
    if (!adminEmail) return { success: false, reason: 'ADMIN_EMAIL not configured' };

    const ctx = await getFullOrderContext(orderId);
    if (!ctx) return { success: false, reason: 'Order not found' };

    const reason = options.reason || ctx.order.cancel_reason || 'Cancelled';
    const { subject, htmlContent, textContent } = templates.adminOrderCancelledTemplate({
      ...ctx,
      reason,
    });

    return await sendBrevoEmail({
      orderId: ctx.order.id,
      eventType: 'admin_order_cancelled',
      toEmail: adminEmail,
      toName: 'VoltCart Admin',
      recipientType: 'admin',
      subject,
      htmlContent,
      textContent,
    });
  } catch (err) {
    console.error('[Brevo Service] sendAdminOrderCancelledEmail failed:', err.message);
    return { success: false, error: err.message };
  }
};

/**
 * 10. Send Admin: Payment Notification (Success or Failed)
 */
exports.sendAdminPaymentNotificationEmail = async (orderId, paymentDetails = {}) => {
  try {
    const adminEmail = getAdminEmail();
    if (!adminEmail) return { success: false, reason: 'ADMIN_EMAIL not configured' };

    const ctx = await getFullOrderContext(orderId);
    if (!ctx) return { success: false, reason: 'Order not found' };

    const status = paymentDetails.status || (ctx.order.payment_status === 'paid' ? 'success' : 'failed');
    const payment = {
      status,
      amount: paymentDetails.amount || ctx.order.total_amount,
      gateway: paymentDetails.gateway || ctx.order.payment_method,
      transactionId: paymentDetails.transactionId || paymentDetails.gateway_payment_id || null,
      reason: paymentDetails.reason || null,
    };

    const { subject, htmlContent, textContent } = templates.adminPaymentNotificationTemplate({
      ...ctx,
      payment,
    });

    return await sendBrevoEmail({
      orderId: ctx.order.id,
      eventType: `admin_payment_${status}`,
      toEmail: adminEmail,
      toName: 'VoltCart Admin',
      recipientType: 'admin',
      subject,
      htmlContent,
      textContent,
    });
  } catch (err) {
    console.error('[Brevo Service] sendAdminPaymentNotificationEmail failed:', err.message);
    return { success: false, error: err.message };
  }
};

/**
 * Generic sendEmail utility (for backward compatibility, e.g. welcome emails)
 */
exports.sendEmail = async ({ to, subject, html, text }) => {
  return await sendBrevoEmail({
    toEmail: to,
    subject,
    htmlContent: html,
    textContent: text,
    eventType: 'general_notification',
  });
};
