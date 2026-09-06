const db = require('../config/database');
const https = require('https');
const emailService = require('../services/emailService');
require('dotenv').config();

// Razorpay setup
let Razorpay;
let razorpay;
try {
  Razorpay = require('razorpay');
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
} catch (e) {
  console.warn('Razorpay not configured');
}

const cashfreeBaseUrl = process.env.CASHFREE_ENV === 'production'
  ? 'https://api.cashfree.com/pg'
  : 'https://sandbox.cashfree.com/pg';

const isCashfreeConfigured = () => Boolean(process.env.CASHFREE_APP_ID && process.env.CASHFREE_SECRET_KEY);

const getCashfreeReturnUrl = (orderId, cashfreeOrderId) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const productionReturnUrl = process.env.CASHFREE_RETURN_URL || process.env.PUBLIC_FRONTEND_URL;
  const baseUrl = process.env.CASHFREE_ENV === 'production'
    ? productionReturnUrl
    : frontendUrl;

  if (!baseUrl) {
    throw new Error('Set CASHFREE_RETURN_URL or PUBLIC_FRONTEND_URL to an HTTPS website URL for production Cashfree payments.');
  }

  if (process.env.CASHFREE_ENV === 'production' && !baseUrl.startsWith('https://')) {
    throw new Error('Production Cashfree payments require CASHFREE_RETURN_URL to start with https://');
  }

  return `${baseUrl.replace(/\/$/, '')}/order-success/${orderId}?gateway=cashfree&cf_order_id=${cashfreeOrderId}`;
};

const cashfreeRequest = (method, path, body) => new Promise((resolve, reject) => {
  const payload = body ? JSON.stringify(body) : null;
  const url = new URL(`${cashfreeBaseUrl}${path}`);

  const req = https.request({
    method,
    hostname: url.hostname,
    path: url.pathname + url.search,
    headers: {
      'Content-Type': 'application/json',
      'x-api-version': process.env.CASHFREE_API_VERSION || '2025-01-01',
      'x-client-id': process.env.CASHFREE_APP_ID,
      'x-client-secret': process.env.CASHFREE_SECRET_KEY,
      ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
    },
  }, (res) => {
    const chunks = [];
    res.on('data', (chunk) => chunks.push(chunk));
    res.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      const data = raw ? JSON.parse(raw) : {};

      if (res.statusCode >= 200 && res.statusCode < 300) {
        resolve(data);
      } else {
        const error = new Error(data.message || data.error_description || 'Cashfree request failed.');
        error.statusCode = res.statusCode;
        error.data = data;
        reject(error);
      }
    });
  });

  req.on('error', reject);
  if (payload) req.write(payload);
  req.end();
});

// ── Create Razorpay Order ─────────────────────────────────────
exports.createRazorpayOrder = async (req, res) => {
  try {
    const { order_id } = req.body;

    const [orders] = await db.execute(
      'SELECT * FROM orders WHERE id = ? AND user_id = ?',
      [order_id, req.user.id]
    );
    if (!orders.length) return res.status(404).json({ success: false, message: 'Order not found.' });

    const order = orders[0];
    const amountInPaise = Math.round(parseFloat(order.total_amount) * 100);

    // Simulate if Razorpay not configured
    if (!razorpay) {
      const simulatedOrder = {
        id: `rp_sim_${Date.now()}`,
        amount: amountInPaise,
        currency: 'INR',
        receipt: order.order_number,
        simulated: true,
      };
      return res.json({ success: true, data: simulatedOrder, key: 'SIMULATED_KEY' });
    }

    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: order.order_number,
      notes: { order_id: order.id, user_id: req.user.id },
    });

    await db.execute(`
      INSERT INTO payments (order_id, user_id, payment_gateway, gateway_order_id, amount, currency, status)
      VALUES (?, ?, 'razorpay', ?, ?, 'INR', 'pending')
    `, [order.id, req.user.id, razorpayOrder.id, order.total_amount]);

    res.json({
      success: true,
      data: razorpayOrder,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error('Razorpay order error:', error);
    res.status(500).json({ success: false, message: 'Failed to create payment order.' });
  }
};

// ── Verify Razorpay Payment ───────────────────────────────────
exports.verifyRazorpayPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id } = req.body;

    // Simulate success if no Razorpay
    if (!razorpay) {
      await db.execute('UPDATE orders SET payment_status = "paid" WHERE id = ?', [order_id]);
      await db.execute(`UPDATE payments SET status = 'success', gateway_payment_id = ? WHERE order_id = ?`,
        [razorpay_payment_id || 'simulated', order_id]);

      // Brevo transactional emails (Customer + Admin)
      emailService.sendPaymentSuccessEmail(order_id, {
        gateway: 'razorpay',
        transactionId: razorpay_payment_id || 'simulated',
      }).catch((err) => console.error('[Brevo] Payment success email error:', err.message));

      emailService.sendAdminPaymentNotificationEmail(order_id, {
        status: 'success',
        gateway: 'razorpay',
        transactionId: razorpay_payment_id || 'simulated',
      }).catch((err) => console.error('[Brevo] Admin payment notification error:', err.message));

      return res.json({ success: true, message: 'Payment verified (simulated).' });
    }

    const crypto = require('crypto');
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      emailService.sendPaymentFailedEmail(order_id, {
        gateway: 'razorpay',
        reason: 'Payment signature mismatch or cancelled transaction.',
      }).catch((err) => console.error('[Brevo] Payment failed email error:', err.message));

      emailService.sendAdminPaymentNotificationEmail(order_id, {
        status: 'failed',
        gateway: 'razorpay',
        reason: 'Payment signature mismatch.',
      }).catch((err) => console.error('[Brevo] Admin payment failure error:', err.message));

      return res.status(400).json({ success: false, message: 'Payment verification failed.' });
    }

    await db.execute('UPDATE orders SET payment_status = "paid" WHERE id = ?', [order_id]);
    await db.execute(`
      UPDATE payments SET status = 'success', gateway_payment_id = ?, gateway_signature = ?
      WHERE order_id = ?
    `, [razorpay_payment_id, razorpay_signature, order_id]);

    // Brevo transactional emails (Customer + Admin)
    emailService.sendPaymentSuccessEmail(order_id, {
      gateway: 'razorpay',
      transactionId: razorpay_payment_id,
    }).catch((err) => console.error('[Brevo] Payment success email error:', err.message));

    emailService.sendAdminPaymentNotificationEmail(order_id, {
      status: 'success',
      gateway: 'razorpay',
      transactionId: razorpay_payment_id,
    }).catch((err) => console.error('[Brevo] Admin payment notification error:', err.message));

    res.json({ success: true, message: 'Payment verified successfully!' });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ success: false, message: 'Payment verification failed.' });
  }
};

// Create Cashfree Order
exports.createCashfreeOrder = async (req, res) => {
  try {
    const { order_id } = req.body;

    const [orders] = await db.execute(`
      SELECT o.*, u.name AS customer_name, u.email AS customer_email, u.phone AS customer_phone,
        a.phone AS address_phone
      FROM orders o
      JOIN users u ON o.user_id = u.id
      JOIN addresses a ON o.address_id = a.id
      WHERE o.id = ? AND o.user_id = ? AND o.payment_method = 'cashfree'
    `, [order_id, req.user.id]);

    if (!orders.length) return res.status(404).json({ success: false, message: 'Order not found.' });

    const order = orders[0];
    const phone = order.address_phone || order.customer_phone;

    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number is required for Cashfree payment.' });
    }

    if (!isCashfreeConfigured()) {
      return res.status(400).json({
        success: false,
        message: 'Cashfree is not configured. Add CASHFREE_APP_ID and CASHFREE_SECRET_KEY, then restart the backend.',
      });
    }

    const cashfreeOrderId = `cf_${order.id}_${Date.now()}`;
    const returnUrl = getCashfreeReturnUrl(order.id, cashfreeOrderId);

    const cashfreeOrder = await cashfreeRequest('POST', '/orders', {
      order_id: cashfreeOrderId,
      order_amount: Number(order.total_amount),
      order_currency: 'INR',
      customer_details: {
        customer_id: String(req.user.id),
        customer_name: order.customer_name || 'Customer',
        customer_email: order.customer_email || undefined,
        customer_phone: String(phone).replace(/\D/g, '').slice(-10),
      },
      order_meta: {
        return_url: returnUrl,
      },
      order_note: `VoltCart order ${order.order_number}`,
      order_tags: {
        app_order_id: String(order.id),
        order_number: order.order_number,
      },
    });

    await db.execute(`
      INSERT INTO payments (order_id, user_id, payment_gateway, gateway_order_id, amount, currency, status)
      VALUES (?, ?, 'cashfree', ?, ?, 'INR', 'pending')
    `, [order.id, req.user.id, cashfreeOrder.order_id, order.total_amount]);

    res.json({
      success: true,
      data: cashfreeOrder,
      mode: process.env.CASHFREE_ENV || 'sandbox',
    });
  } catch (error) {
    console.error('Cashfree order error:', error.data || error);
    res.status(502).json({ success: false, message: error.message || 'Failed to create Cashfree order.' });
  }
};

// Verify Cashfree Payment
exports.verifyCashfreePayment = async (req, res) => {
  try {
    const { order_id, cashfree_order_id } = req.body;

    const [orders] = await db.execute(
      'SELECT * FROM orders WHERE id = ? AND user_id = ? AND payment_method = "cashfree"',
      [order_id, req.user.id]
    );
    if (!orders.length) return res.status(404).json({ success: false, message: 'Order not found.' });

    if (!isCashfreeConfigured()) {
      return res.status(400).json({
        success: false,
        message: 'Cashfree is not configured. Add CASHFREE_APP_ID and CASHFREE_SECRET_KEY, then restart the backend.',
      });
    }

    const cashfreeOrder = await cashfreeRequest('GET', `/orders/${encodeURIComponent(cashfree_order_id)}`);
    const isPaid = cashfreeOrder.order_status === 'PAID';

    await db.execute(
      'UPDATE orders SET payment_status = ? WHERE id = ?',
      [isPaid ? 'paid' : 'pending', order_id]
    );

    await db.execute(`
      UPDATE payments SET status = ?, gateway_payment_id = ?
      WHERE order_id = ? AND payment_gateway = 'cashfree' AND gateway_order_id = ?
    `, [isPaid ? 'success' : 'pending', cashfreeOrder.cf_order_id || null, order_id, cashfree_order_id]);

    // Brevo transactional emails (Customer + Admin)
    if (isPaid) {
      emailService.sendPaymentSuccessEmail(order_id, {
        gateway: 'cashfree',
        transactionId: cashfreeOrder.cf_order_id || cashfree_order_id,
      }).catch((err) => console.error('[Brevo] Cashfree payment success email error:', err.message));

      emailService.sendAdminPaymentNotificationEmail(order_id, {
        status: 'success',
        gateway: 'cashfree',
        transactionId: cashfreeOrder.cf_order_id || cashfree_order_id,
      }).catch((err) => console.error('[Brevo] Cashfree admin payment notification error:', err.message));
    } else if (['FAILED', 'USER_DROPPED', 'CANCELLED'].includes(cashfreeOrder.order_status)) {
      emailService.sendPaymentFailedEmail(order_id, {
        gateway: 'cashfree',
        reason: `Cashfree payment ${cashfreeOrder.order_status.toLowerCase()}.`,
      }).catch((err) => console.error('[Brevo] Cashfree payment failed email error:', err.message));

      emailService.sendAdminPaymentNotificationEmail(order_id, {
        status: 'failed',
        gateway: 'cashfree',
        reason: `Cashfree payment ${cashfreeOrder.order_status.toLowerCase()}.`,
      }).catch((err) => console.error('[Brevo] Cashfree admin payment failure error:', err.message));
    }

    res.json({
      success: isPaid,
      message: isPaid ? 'Cashfree payment verified successfully!' : 'Cashfree payment is not complete yet.',
      status: cashfreeOrder.order_status,
      data: cashfreeOrder,
    });
  } catch (error) {
    console.error('Cashfree verify error:', error.data || error);
    res.status(502).json({ success: false, message: error.message || 'Cashfree payment verification failed.' });
  }
};

// ── COD Payment ───────────────────────────────────────────────
exports.processCOD = async (req, res) => {
  try {
    const { order_id } = req.body;

    const [orders] = await db.execute(
      'SELECT * FROM orders WHERE id = ? AND user_id = ? AND payment_method = "cod"',
      [order_id, req.user.id]
    );
    if (!orders.length) return res.status(404).json({ success: false, message: 'Order not found.' });

    await db.execute(`
      INSERT INTO payments (order_id, user_id, payment_gateway, amount, currency, status)
      VALUES (?, ?, 'cod', ?, 'INR', 'pending')
    `, [order_id, req.user.id, orders[0].total_amount]);

    res.json({ success: true, message: 'COD order confirmed. Pay on delivery.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to process COD order.' });
  }
};
