const db = require('../config/database');
const { generateInvoicePDF, generatePackingSlipPDF, generateShippingLabelPDF } = require('../utils/invoice.util');
const { sendEmail } = require('../utils/email.util');
const emailService = require('../services/emailService');
const { createNotification } = require('../utils/notification.util');
const {
  buildParcelsFromCartItems,
  buildShippoAddressFromAddressRow,
  createShipment,
  createTransaction,
  getShipment,
  getTrackingStatus,
  getShippoOriginAddress,
  isShippoConfigured,
  toAmount,
} = require('../utils/shippo.util');

const generateOrderNumber = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `VC-${timestamp}-${random}`;
};

const generateInvoiceNumber = () => {
  const year = new Date().getFullYear();
  const random = Math.floor(100000 + Math.random() * 900000);
  return `INV-VC-${year}-${random}`;
};

const LEGACY_SHIPPING_NOTE = 'Shippo is not configured, falling back to product shipping amounts.';
const SHIPPO_NO_RATES_NOTE = 'Shippo has no rates for this address yet, so store shipping is being used instead.';

const normalizeShippoTrackingStatus = (status) => String(status || '').trim().toLowerCase();

const buildLegacyShippingRate = (amount, message = LEGACY_SHIPPING_NOTE) => ({
  fallback: true,
  message,
  data: [{
    rateId: 'legacy-flat-shipping',
    provider: 'Store Shipping',
    carrier: 'Store Shipping',
    amount: amount.toFixed(2),
    currency: 'INR',
    estimatedDays: null,
    durationTerms: 'Standard delivery',
    serviceLevel: 'Flat shipping',
    serviceToken: null,
    shipmentId: null,
    attributes: [],
  }],
});

const getShippoCarrierAccounts = () => (
  (process.env.SHIPPO_CARRIER_ACCOUNT_IDS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
);

const getCartItemsForConnection = async (conn, userId) => {
  const [cartItems] = await conn.execute(`
    SELECT c.quantity, p.id AS product_id, p.name, p.price, p.gst_percent,
      p.stock, p.is_active, p.shipping_amount, p.free_shipping, p.weight,
      pi.image_url AS image
    FROM cart c
    JOIN products p ON c.product_id = p.id
    LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = 1
    WHERE c.user_id = ?
  `, [userId]);

  return cartItems;
};

const calculateCartTotals = (cartItems) => {
  let subtotal = 0;
  let totalGst = 0;

  for (const item of cartItems) {
    if (!item.is_active) throw new Error(`Product "${item.name}" is no longer available.`);
    if (item.stock < item.quantity) throw new Error(`Insufficient stock for "${item.name}". Only ${item.stock} left.`);

    const basePrice = toAmount(item.price);
    const gstAmount = (basePrice * toAmount(item.gst_percent)) / 100;
    subtotal += basePrice * item.quantity;
    totalGst += gstAmount * item.quantity;
  }

  const legacyShippingAmount = cartItems.reduce((sum, item) => {
    if (Number(item.free_shipping) === 1) return sum;
    return sum + (toAmount(item.shipping_amount) * item.quantity);
  }, 0);

  return {
    subtotal,
    totalGst,
    legacyShippingAmount,
  };
};

const validateAndGetAddress = async (conn, addressId, userId) => {
  const [rows] = await conn.execute(
    'SELECT * FROM addresses WHERE id = ? AND user_id = ?',
    [addressId, userId]
  );

  if (!rows.length) {
    throw new Error('Invalid delivery address.');
  }

  return rows[0];
};

const getCouponDetails = async (conn, couponCode, subtotal) => {
  if (!couponCode) {
    return { discountAmount: 0, couponId: null };
  }

  const [couponRows] = await conn.execute(`
    SELECT * FROM coupons
    WHERE code = ? AND is_active = 1
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (usage_limit IS NULL OR used_count < usage_limit)
  `, [couponCode]);

  if (!couponRows.length) {
    return { discountAmount: 0, couponId: null };
  }

  const coupon = couponRows[0];
  if (subtotal < toAmount(coupon.min_order_amount)) {
    return { discountAmount: 0, couponId: null };
  }

  let discountAmount = 0;
  if (coupon.discount_type === 'percentage') {
    discountAmount = (subtotal * toAmount(coupon.discount_value)) / 100;
    if (coupon.max_discount_amount) {
      discountAmount = Math.min(discountAmount, toAmount(coupon.max_discount_amount));
    }
  } else {
    discountAmount = toAmount(coupon.discount_value);
  }

  return { discountAmount, couponId: coupon.id };
};

const quoteShippoRates = async ({ cartItems, address, fallbackName, fallbackEmail, metadata }) => {
  const shipment = await createShipment({
    address_from: getShippoOriginAddress(),
    address_to: buildShippoAddressFromAddressRow(address, fallbackName, fallbackEmail),
    parcels: buildParcelsFromCartItems(cartItems),
    async: false,
    ...(getShippoCarrierAccounts().length ? { carrier_accounts: getShippoCarrierAccounts() } : {}),
    metadata,
  });

  const rates = (shipment.rates || [])
    .filter((rate) => !rate.messages?.length)
    .map((rate) => ({
      rateId: rate.object_id,
      provider: rate.provider,
      carrier: rate.provider,
      amount: toAmount(rate.amount).toFixed(2),
      currency: rate.currency || 'INR',
      estimatedDays: rate.estimated_days || null,
      durationTerms: rate.duration_terms || '',
      serviceLevel: rate.servicelevel?.name || rate.servicelevel?.token || 'Standard',
      serviceToken: rate.servicelevel?.token || null,
      shipmentId: shipment.object_id,
      attributes: rate.attributes || [],
    }))
    .sort((a, b) => toAmount(a.amount) - toAmount(b.amount));

  return { shipment, rates };
};

const getShippoRateFromShipment = async (shipmentId, rateId) => {
  const shipment = await getShipment(shipmentId);
  const rate = (shipment.rates || []).find((entry) => entry.object_id === rateId);

  if (!rate) {
    throw new Error('Selected Shippo rate is no longer available. Please refresh shipping options.');
  }

  return { shipment, rate };
};

const getOrderQueryForUser = (user) => {
  const params = user.role === 'admin' ? [] : [user.id];
  const whereClause = user.role === 'admin' ? 'o.id = ?' : 'o.id = ? AND o.user_id = ?';
  return { params, whereClause };
};

const getOrderForTracking = async (orderId, user) => {
  const base = getOrderQueryForUser(user);
  const params = user.role === 'admin' ? [orderId] : [orderId, user.id];

  const [rows] = await db.execute(`
    SELECT o.*, a.full_name, a.phone AS addr_phone, a.address_line1, a.address_line2,
      a.city, a.state, a.pincode, a.country, u.name AS customer_name, u.email AS customer_email
    FROM orders o
    JOIN addresses a ON a.id = o.address_id
    JOIN users u ON u.id = o.user_id
    WHERE ${base.whereClause}
  `, params);

  return rows[0] || null;
};

exports.getShippingRates = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { address_id } = req.body;
    if (!address_id) {
      return res.status(400).json({ success: false, message: 'address_id is required.' });
    }

    const address = await validateAndGetAddress(conn, address_id, req.user.id);
    const cartItems = await getCartItemsForConnection(conn, req.user.id);
    if (!cartItems.length) {
      return res.status(400).json({ success: false, message: 'Cart is empty.' });
    }

    const { legacyShippingAmount } = calculateCartTotals(cartItems);

    if (!isShippoConfigured()) {
      return res.json({ success: true, ...buildLegacyShippingRate(legacyShippingAmount) });
    }

    const [userRows] = await conn.execute('SELECT name, email FROM users WHERE id = ?', [req.user.id]);
    const user = userRows[0] || {};
    const { shipment, rates } = await quoteShippoRates({
      cartItems,
      address,
      fallbackName: user.name,
      fallbackEmail: user.email,
      metadata: `Cart quote for user ${req.user.id}`,
    });

    if (!rates.length) {
      console.warn('Shippo returned no rates, using legacy shipping fallback.', shipment.messages || []);
      return res.json({
        success: true,
        shippoMessages: shipment.messages || [],
        shipmentId: shipment.object_id,
        ...buildLegacyShippingRate(legacyShippingAmount, SHIPPO_NO_RATES_NOTE),
      });
    }

    res.json({ success: true, data: rates, shipmentId: shipment.object_id });
  } catch (error) {
    console.error('Shippo quote error:', error.data || error);
    try {
      const address = await validateAndGetAddress(conn, req.body.address_id, req.user.id);
      const cartItems = await getCartItemsForConnection(conn, req.user.id);
      const { legacyShippingAmount } = calculateCartTotals(cartItems);
      return res.json({
        success: true,
        shippoError: error.message || 'Failed to fetch Shippo rates.',
        addressId: address.id,
        ...buildLegacyShippingRate(legacyShippingAmount, SHIPPO_NO_RATES_NOTE),
      });
    } catch (fallbackError) {
      console.error('Legacy shipping fallback error:', fallbackError);
      res.status(502).json({ success: false, message: error.message || 'Failed to fetch shipping rates.' });
    }
  } finally {
    conn.release();
  }
};

exports.placeOrder = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const { address_id, payment_method, coupon_code, notes, shippo_shipment_id, shippo_rate_id } = req.body;
    const userId = req.user.id;

    const address = await validateAndGetAddress(conn, address_id, userId);
    const cartItems = await getCartItemsForConnection(conn, userId);

    if (!cartItems.length) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Cart is empty.' });
    }

    const { subtotal, totalGst, legacyShippingAmount } = calculateCartTotals(cartItems);
    const { discountAmount, couponId } = await getCouponDetails(conn, coupon_code, subtotal);

    let shippingAmount = legacyShippingAmount;
    let selectedShipmentId = null;
    let selectedRateId = null;
    let selectedRateProvider = null;
    let selectedServiceLevel = null;

    if (shippo_rate_id) {
      if (!shippo_shipment_id) {
        throw new Error('shippo_shipment_id is required when selecting a Shippo rate.');
      }
      if (!isShippoConfigured()) {
        throw new Error('Shippo is not configured on the backend.');
      }

      const { shipment, rate } = await getShippoRateFromShipment(shippo_shipment_id, shippo_rate_id);
      shippingAmount = toAmount(rate.amount);
      selectedShipmentId = shipment.object_id;
      selectedRateId = rate.object_id;
      selectedRateProvider = rate.provider || null;
      selectedServiceLevel = rate.servicelevel?.name || rate.servicelevel?.token || null;
    } else if (isShippoConfigured()) {
      const [userRows] = await conn.execute('SELECT name, email FROM users WHERE id = ?', [userId]);
      const user = userRows[0] || {};
      const { rates } = await quoteShippoRates({
        cartItems,
        address,
        fallbackName: user.name,
        fallbackEmail: user.email,
        metadata: `Order ${userId} ${Date.now()}`,
      });

      if (rates.length) {
        return res.status(400).json({
          success: false,
          message: 'Select a shipping option before placing the order.',
          data: rates,
        });
      }
    }

    const totalAmount = subtotal + totalGst - discountAmount + shippingAmount;
    const orderNumber = generateOrderNumber();

    const [orderResult] = await conn.execute(`
      INSERT INTO orders
        (order_number, user_id, address_id, coupon_id, subtotal, discount_amount,
         gst_amount, shipping_amount, total_amount, payment_method, order_status, notes,
         shippo_shipment_id, shippo_rate_id, shippo_rate_provider, shippo_service_level)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'placed', ?, ?, ?, ?, ?)
    `, [
      orderNumber, userId, address_id, couponId,
      subtotal.toFixed(2), discountAmount.toFixed(2),
      totalGst.toFixed(2), shippingAmount.toFixed(2),
      totalAmount.toFixed(2), payment_method, notes || null,
      selectedShipmentId, selectedRateId, selectedRateProvider, selectedServiceLevel,
    ]);

    const orderId = orderResult.insertId;

    for (const item of cartItems) {
      const gstAmt = (toAmount(item.price) * toAmount(item.gst_percent)) / 100;
      await conn.execute(`
        INSERT INTO order_items (order_id, product_id, product_name, product_image, quantity, unit_price, gst_percent, gst_amount, total_price)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        orderId, item.product_id, item.name, item.image || null,
        item.quantity, item.price, item.gst_percent,
        (gstAmt * item.quantity).toFixed(2),
        ((toAmount(item.price) + gstAmt) * item.quantity).toFixed(2),
      ]);
      await conn.execute('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.product_id]);
    }

    if (couponId) {
      await conn.execute('UPDATE coupons SET used_count = used_count + 1 WHERE id = ?', [couponId]);
      await conn.execute(
        'INSERT INTO coupon_usage (coupon_id, user_id, order_id, discount_amount) VALUES (?, ?, ?, ?)',
        [couponId, userId, orderId, discountAmount.toFixed(2)]
      );
    }

    await conn.execute(
      'INSERT INTO order_tracking (order_id, status, description) VALUES (?, ?, ?)',
      [
        orderId,
        'Order Placed',
        selectedRateProvider
          ? `Your order has been placed successfully with ${selectedRateProvider} shipping.`
          : 'Your order has been placed successfully.',
      ]
    );

    await conn.execute('DELETE FROM cart WHERE user_id = ?', [userId]);
    await conn.commit();

    const [userRows] = await db.execute('SELECT email, name FROM users WHERE id = ?', [userId]);
    const user = userRows[0] || {};
    const customerEmail = user.email || req.user?.email || null;
    const customerName = user.name || req.user?.name || 'Customer';

    createNotification(userId, 'Order Placed!', `Your order ${orderNumber} has been placed successfully.`, 'order', { orderId });

    // Assemble full order context to guarantee instant dispatch without database latency
    const orderContext = {
      order: {
        id: orderId,
        order_number: orderNumber,
        user_id: userId,
        address_id,
        subtotal: subtotal.toFixed(2),
        discount_amount: discountAmount.toFixed(2),
        gst_amount: totalGst.toFixed(2),
        shipping_amount: shippingAmount.toFixed(2),
        total_amount: totalAmount.toFixed(2),
        payment_method,
        order_status: 'placed',
        created_at: new Date(),
      },
      user: {
        id: userId,
        name: customerName,
        email: customerEmail,
      },
      items: cartItems.map(item => ({
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: ((toAmount(item.price) + ((toAmount(item.price) * toAmount(item.gst_percent)) / 100)) * item.quantity).toFixed(2),
      })),
      address,
    };

    // Non-blocking Brevo transactional emails (Customer + Admin)
    emailService.sendOrderConfirmationEmail(orderId, orderContext).then((result) => {
      if (!result?.success && !result?.skipped) {
        console.warn('[Brevo] Order confirmation email not delivered:', result?.reason || result?.error);
      }
    }).catch((err) => console.error('[Brevo] Order confirmation error:', err.message));

    emailService.sendAdminOrderReceivedEmail(orderId, orderContext).then((result) => {
      if (!result?.success && !result?.skipped) {
        console.warn('[Brevo] Admin order received email not delivered:', result?.reason || result?.error);
      }
    }).catch((err) => console.error('[Brevo] Admin order received error:', err.message));

    res.status(201).json({
      success: true,
      message: 'Order placed successfully!',
      data: {
        orderId,
        orderNumber,
        totalAmount: totalAmount.toFixed(2),
        shippingAmount: shippingAmount.toFixed(2),
        shippoRateSelected: Boolean(selectedRateId),
      },
    });
  } catch (error) {
    await conn.rollback();
    console.error('Place order error:', error.data || error);
    res.status(500).json({ success: false, message: error.message || 'Failed to place order.' });
  } finally {
    conn.release();
  }
};

exports.getUserOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = ['o.user_id = ?'];
    const params = [req.user.id];

    if (status) {
      conditions.push('o.order_status = ?');
      params.push(status);
    }

    const [orders] = await db.execute(`
      SELECT o.id, o.order_number, o.total_amount, o.order_status, o.payment_method,
        o.payment_status, o.created_at, o.estimated_delivery, o.tracking_number,
        o.shippo_rate_provider, o.shippo_service_level, o.shippo_tracking_status,
        COUNT(oi.id) AS item_count
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE ${conditions.join(' AND ')}
      GROUP BY o.id
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);

    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch orders.' });
  }
};

exports.getOrderDetails = async (req, res) => {
  try {
    const order = await getOrderForTracking(req.params.id, req.user);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const [items] = await db.execute(`
      SELECT oi.*, p.slug AS product_slug, r.id AS review_id
      FROM order_items oi
      LEFT JOIN products p ON p.id = oi.product_id
      LEFT JOIN reviews r ON r.product_id = oi.product_id AND r.user_id = ?
      WHERE oi.order_id = ?
    `, [req.user.id, req.params.id]);
    const [tracking] = await db.execute(
      'SELECT * FROM order_tracking WHERE order_id = ? ORDER BY tracked_at ASC',
      [req.params.id]
    );
    const [payment] = await db.execute('SELECT * FROM payments WHERE order_id = ? LIMIT 1', [req.params.id]);

    res.json({ success: true, data: { ...order, items, tracking, payment: payment[0] || null } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch order details.' });
  }
};

exports.createShippoLabel = async (req, res) => {
  try {
    if (!isShippoConfigured()) {
      return res.status(400).json({ success: false, message: 'Shippo is not configured on the backend.' });
    }

    const [orders] = await db.execute('SELECT * FROM orders WHERE id = ? LIMIT 1', [req.params.id]);
    if (!orders.length) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const order = orders[0];
    if (!order.shippo_rate_id) {
      return res.status(400).json({ success: false, message: 'This order was not placed with a Shippo shipping rate.' });
    }

    const transaction = await createTransaction({
      rate: order.shippo_rate_id,
      async: false,
      label_file_type: process.env.SHIPPO_LABEL_FILE_TYPE || 'PDF_4x6',
      metadata: `Order ${order.order_number}`,
    });

    if (transaction.status !== 'SUCCESS') {
      return res.status(400).json({
        success: false,
        message: transaction.messages?.map((item) => item.text || item.code).join(', ') || 'Shippo label purchase failed.',
        data: transaction,
      });
    }

    const nextOrderStatus = ['placed', 'accepted', 'processing'].includes(order.order_status)
      ? 'shipped'
      : order.order_status;

    await db.execute(`
      UPDATE orders
      SET shippo_transaction_id = ?, shippo_label_url = ?, tracking_number = ?,
          shippo_tracking_carrier = ?, shippo_tracking_status = ?, estimated_delivery = ?,
          order_status = ?
      WHERE id = ?
    `, [
      transaction.object_id,
      transaction.label_url || null,
      transaction.tracking_number || null,
      transaction.rate?.provider || order.shippo_rate_provider || null,
      normalizeShippoTrackingStatus(transaction.tracking_status),
      transaction.eta ? new Date(transaction.eta).toISOString().slice(0, 10) : null,
      nextOrderStatus,
      req.params.id,
    ]);

    await db.execute(
      'INSERT INTO order_tracking (order_id, status, description, location) VALUES (?, ?, ?, ?)',
      [
        req.params.id,
        'Shipped',
        transaction.tracking_number
          ? `Shippo label created. Tracking number: ${transaction.tracking_number}`
          : 'Shippo label created.',
        transaction.rate?.provider || order.shippo_rate_provider || null,
      ]
    );

    // If order transitioned to shipped, send customer notification
    if (nextOrderStatus === 'shipped') {
      emailService.sendOrderShippedEmail(req.params.id, {
        carrier: transaction.rate?.provider || order.shippo_rate_provider,
        trackingNumber: transaction.tracking_number,
        trackingUrl: transaction.label_url,
      }).catch((err) => console.error('[Brevo] Order shipped error:', err.message));
    }

    res.json({
      success: true,
      message: 'Shippo label created successfully.',
      data: {
        transactionId: transaction.object_id,
        trackingNumber: transaction.tracking_number,
        trackingStatus: transaction.tracking_status || null,
        eta: transaction.eta || null,
        labelUrl: transaction.label_url || null,
      },
    });
  } catch (error) {
    console.error('Shippo label error:', error.data || error);
    res.status(502).json({ success: false, message: error.message || 'Failed to create Shippo label.' });
  }
};

exports.syncShippoTracking = async (req, res) => {
  try {
    if (!isShippoConfigured()) {
      return res.status(400).json({ success: false, message: 'Shippo is not configured on the backend.' });
    }

    const order = await getOrderForTracking(req.params.id, req.user);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }
    if (!order.tracking_number || !order.shippo_tracking_carrier) {
      return res.status(400).json({ success: false, message: 'Tracking information is not available for this order yet.' });
    }

    const tracking = await getTrackingStatus(order.shippo_tracking_carrier, order.tracking_number);
    const trackingStatus = normalizeShippoTrackingStatus(tracking.tracking_status?.status);
    const latestEvent = tracking.tracking_history?.[tracking.tracking_history.length - 1];
    const location = latestEvent?.location
      ? [latestEvent.location.city, latestEvent.location.state, latestEvent.location.country].filter(Boolean).join(', ')
      : null;

    await db.execute(`
      UPDATE orders
      SET shippo_tracking_status = ?, estimated_delivery = ?, shippo_tracking_synced_at = NOW()
      WHERE id = ?
    `, [
      trackingStatus || null,
      tracking.eta ? new Date(tracking.eta).toISOString().slice(0, 10) : order.estimated_delivery,
      order.id,
    ]);

    if (latestEvent?.status) {
      await db.execute(
        'INSERT INTO order_tracking (order_id, status, description, location) VALUES (?, ?, ?, ?)',
        [
          order.id,
          latestEvent.status,
          latestEvent.status_details || `Carrier update: ${latestEvent.status}`,
          location,
        ]
      );
    }

    res.json({
      success: true,
      message: 'Tracking synced successfully.',
      data: {
        trackingNumber: order.tracking_number,
        carrier: order.shippo_tracking_carrier,
        trackingStatus,
        eta: tracking.eta || null,
        history: tracking.tracking_history || [],
      },
    });
  } catch (error) {
    console.error('Shippo tracking sync error:', error.data || error);
    res.status(502).json({ success: false, message: error.message || 'Failed to sync Shippo tracking.' });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, description, location } = req.body;

    const validStatuses = ['accepted', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }

    await db.execute('UPDATE orders SET order_status = ? WHERE id = ?', [status, id]);

    const statusMessages = {
      accepted: 'Order Accepted',
      processing: 'Processing',
      shipped: 'Shipped',
      out_for_delivery: 'Out for Delivery',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
    };

    await db.execute(
      'INSERT INTO order_tracking (order_id, status, description, location) VALUES (?, ?, ?, ?)',
      [id, statusMessages[status], description || statusMessages[status], location || null]
    );

    if (status === 'delivered') {
      await db.execute(
        'UPDATE orders SET delivered_at = NOW(), payment_status = ? WHERE id = ?',
        ['paid', id]
      );
    }

    const [orderRows] = await db.execute('SELECT user_id, order_number FROM orders WHERE id = ?', [id]);
    if (orderRows.length) {
      const { user_id, order_number } = orderRows[0];
      createNotification(
        user_id,
        `Order ${statusMessages[status]}`,
        `Your order ${order_number} is now: ${statusMessages[status]}`,
        'order',
        { orderId: id }
      );
    }

    // Trigger Brevo transactional emails based on new status
    if (status === 'shipped') {
      emailService.sendOrderShippedEmail(id).catch((err) => console.error('[Brevo] Order shipped email error:', err.message));
    } else if (status === 'delivered') {
      emailService.sendOrderDeliveredEmail(id).catch((err) => console.error('[Brevo] Order delivered email error:', err.message));
      emailService.sendAdminOrderDeliveredEmail(id).catch((err) => console.error('[Brevo] Admin delivered email error:', err.message));
    } else if (status === 'cancelled') {
      emailService.sendOrderCancelledEmail(id, { reason: description }).catch((err) => console.error('[Brevo] Order cancelled email error:', err.message));
      emailService.sendAdminOrderCancelledEmail(id, { reason: description }).catch((err) => console.error('[Brevo] Admin cancelled email error:', err.message));
    }

    res.json({ success: true, message: 'Order status updated!' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update order status.' });
  }
};

exports.downloadInvoice = async (req, res) => {
  try {
    const isAdmin = req.user && req.user.role === 'admin';
    const whereClause = isAdmin ? 'o.id = ?' : 'o.id = ? AND o.user_id = ?';
    const params = isAdmin ? [req.params.id] : [req.params.id, req.user.id];

    const [orders] = await db.execute(`
      SELECT o.*, u.name AS customer_name, u.email, u.phone AS customer_phone,
        a.full_name, a.address_line1, a.address_line2, a.city, a.state, a.pincode, a.country
      FROM orders o
      JOIN users u ON o.user_id = u.id
      JOIN addresses a ON o.address_id = a.id
      WHERE ${whereClause}
    `, params);

    if (!orders.length) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const order = orders[0];
    if (!order.invoice_number) {
      order.invoice_number = generateInvoiceNumber();
      await db.execute('UPDATE orders SET invoice_number = ?, invoice_generated_at = NOW() WHERE id = ?', [order.invoice_number, order.id]);
    }

    const [items] = await db.execute('SELECT * FROM order_items WHERE order_id = ?', [req.params.id]);

    const pdfBuffer = await generateInvoicePDF({ ...order, items });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${order.invoice_number || order.order_number}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Invoice error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate invoice.' });
  }
};

exports.downloadPackingSlip = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied. Packing slips are admin only.' });
    }

    const [orders] = await db.execute(`
      SELECT o.*, u.name AS customer_name, u.email, u.phone AS customer_phone,
        a.full_name, a.address_line1, a.address_line2, a.city, a.state, a.pincode, a.country
      FROM orders o
      JOIN users u ON o.user_id = u.id
      JOIN addresses a ON o.address_id = a.id
      WHERE o.id = ?
    `, [req.params.id]);

    if (!orders.length) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const order = orders[0];
    await db.execute('UPDATE orders SET packing_slip_generated_at = NOW() WHERE id = ?', [order.id]);

    const [items] = await db.execute('SELECT * FROM order_items WHERE order_id = ?', [req.params.id]);

    const pdfBuffer = await generatePackingSlipPDF({ ...order, items });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=packingslip-${order.order_number}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Packing slip error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate packing slip.' });
  }
};

exports.downloadShippingLabel = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied. Shipping labels are admin only.' });
    }

    const [orders] = await db.execute(`
      SELECT o.*, u.name AS customer_name, u.email, u.phone AS customer_phone,
        a.full_name, a.address_line1, a.address_line2, a.city, a.state, a.pincode, a.country
      FROM orders o
      JOIN users u ON o.user_id = u.id
      JOIN addresses a ON o.address_id = a.id
      WHERE o.id = ?
    `, [req.params.id]);

    if (!orders.length) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const order = orders[0];

    // If Shippo already returned an official carrier label URL and client wants redirect or download
    if (order.shippo_label_url && req.query.official === 'true') {
      return res.redirect(order.shippo_label_url);
    }

    const [items] = await db.execute('SELECT * FROM order_items WHERE order_id = ?', [req.params.id]);

    const pdfBuffer = await generateShippingLabelPDF({ ...order, items });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=shippinglabel-${order.order_number}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Shipping label error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate shipping label.' });
  }
};

exports.cancelOrder = async (req, res) => {
  try {
    const { reason } = req.body;

    const [orders] = await db.execute(
      'SELECT * FROM orders WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    if (!orders.length) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const order = orders[0];
    if (!['placed', 'accepted'].includes(order.order_status)) {
      return res.status(400).json({ success: false, message: 'Order cannot be cancelled at this stage.' });
    }

    await db.execute(
      'UPDATE orders SET order_status = "cancelled", cancelled_at = NOW(), cancel_reason = ? WHERE id = ?',
      [reason || 'Cancelled by customer', req.params.id]
    );

    const [items] = await db.execute('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [req.params.id]);
    for (const item of items) {
      await db.execute('UPDATE products SET stock = stock + ? WHERE id = ?', [item.quantity, item.product_id]);
    }

    await db.execute(
      'INSERT INTO order_tracking (order_id, status, description) VALUES (?, ?, ?)',
      [req.params.id, 'Cancelled', reason || 'Order cancelled by customer']
    );

    // Brevo transactional emails for cancellation (Customer + Admin)
    emailService.sendOrderCancelledEmail(req.params.id, { reason }).catch((err) => console.error('[Brevo] Order cancelled error:', err.message));
    emailService.sendAdminOrderCancelledEmail(req.params.id, { reason }).catch((err) => console.error('[Brevo] Admin cancelled error:', err.message));

    res.json({ success: true, message: 'Order cancelled successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to cancel order.' });
  }
};
