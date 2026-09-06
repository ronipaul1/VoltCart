/**
 * VoltCart Email Templates
 * Responsive, branded HTML email templates with plain-text alternatives.
 */

const formatCurrency = (amount) => {
  const val = Number(amount) || 0;
  return `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return new Date().toLocaleDateString('en-IN', { dateStyle: 'medium' });
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(dateStr);
  }
};

/**
 * Base layout wrapper for all VoltCart HTML emails
 */
const wrapInBaseLayout = ({ title, preheader, content, actionUrl, actionText }) => {
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
  const storeName = process.env.STORE_NAME || 'VoltCart';
  const storeEmail = process.env.STORE_EMAIL || 'support@voltcart.com';
  const currentYear = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #334155; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.3); }
    .header { background: linear-gradient(135deg, #090d16 0%, #0f172a 100%); padding: 32px 30px; text-align: center; border-bottom: 2px solid #06b6d4; }
    .logo { font-size: 26px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; text-decoration: none; }
    .logo span { color: #06b6d4; }
    .content-body { padding: 32px 30px; }
    .badge { display: inline-block; padding: 6px 14px; font-size: 12px; font-weight: 700; text-transform: uppercase; border-radius: 20px; letter-spacing: 0.5px; }
    .badge-success { background-color: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; }
    .badge-info { background-color: #ecfeff; color: #0891b2; border: 1px solid #a5f3fc; }
    .badge-warning { background-color: #fffbeb; color: #d97706; border: 1px solid #fde68a; }
    .badge-danger { background-color: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
    .table-order { width: 100%; border-collapse: collapse; margin-top: 16px; margin-bottom: 20px; }
    .table-order th { text-align: left; padding: 10px 12px; background: #f8fafc; font-size: 12px; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e2e8f0; }
    .table-order td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px; color: #1e293b; }
    .totals-box { background: #f8fafc; border-radius: 8px; padding: 16px; margin-top: 20px; border: 1px solid #e2e8f0; }
    .totals-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; color: #475569; }
    .totals-row.final { font-size: 16px; font-weight: 700; color: #0f172a; border-top: 1px solid #cbd5e1; padding-top: 8px; margin-bottom: 0; }
    .address-box { background: #f8fafc; border-radius: 8px; padding: 16px; margin-top: 20px; border-left: 4px solid #06b6d4; }
    .btn { display: inline-block; background: linear-gradient(135deg, #06b6d4 0%, #0284c7 100%); color: #ffffff !important; font-weight: 600; font-size: 15px; padding: 12px 28px; text-decoration: none; border-radius: 8px; margin-top: 24px; box-shadow: 0 4px 12px rgba(6, 182, 212, 0.3); }
    .footer { background-color: #090d16; padding: 24px 30px; text-align: center; color: #64748b; font-size: 13px; line-height: 1.6; }
    .footer a { color: #06b6d4; text-decoration: none; }
  </style>
</head>
<body style="margin: 0; padding: 30px 15px; background-color: #0b0f19;">
  ${preheader ? `<span style="display:none;font-size:0px;line-height:0px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}</span>` : ''}
  <div class="container">
    <div class="header">
      <a href="${frontendUrl}" class="logo">⚡ ${storeName}</a>
    </div>
    <div class="content-body">
      ${content}
      ${actionUrl && actionText ? `
        <div style="text-align: center; margin-top: 10px;">
          <a href="${actionUrl}" class="btn">${actionText}</a>
        </div>
      ` : ''}
    </div>
    <div class="footer">
      <p style="margin: 0 0 8px 0;">Need help with your order? Reach out to <a href="mailto:${storeEmail}">${storeEmail}</a>.</p>
      <p style="margin: 0; font-size: 11px; color: #475569;">© ${currentYear} ${storeName}. All rights reserved. This is an automated transactional notification.</p>
    </div>
  </div>
</body>
</html>`;
};

/**
 * Renders items table HTML
 */
const renderItemsTable = (items = []) => {
  if (!items.length) return '';
  const rows = items.map((item) => {
    const qty = item.quantity || 1;
    const unitPrice = Number(item.unit_price || item.price || 0);
    const lineTotal = Number(item.total_price || (unitPrice * qty));
    return `<tr>
      <td style="font-weight: 600;">${item.product_name || item.name || 'Product'}${item.sku ? ` <br><span style="font-size: 11px; color: #64748b;">SKU: ${item.sku}</span>` : ''}</td>
      <td style="text-align: center;">${qty}</td>
      <td style="text-align: right;">${formatCurrency(unitPrice)}</td>
      <td style="text-align: right; font-weight: 600;">${formatCurrency(lineTotal)}</td>
    </tr>`;
  }).join('');

  return `<table class="table-order">
    <thead>
      <tr>
        <th>Item</th>
        <th style="text-align: center;">Qty</th>
        <th style="text-align: right;">Price</th>
        <th style="text-align: right;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>`;
};

/**
 * Renders totals breakdown HTML
 */
const renderTotalsBox = (order) => {
  const subtotal = Number(order.subtotal || 0);
  const gst = Number(order.gst_amount || 0);
  const shipping = Number(order.shipping_amount || 0);
  const discount = Number(order.discount_amount || 0);
  const total = Number(order.total_amount || (subtotal + gst + shipping - discount));

  return `<table style="width: 100%; margin-top: 20px; background: #f8fafc; border-radius: 8px; padding: 14px; border: 1px solid #e2e8f0; font-size: 14px;">
    <tr><td style="padding: 4px 0; color: #64748b;">Subtotal</td><td style="text-align: right; font-weight: 500; color: #1e293b;">${formatCurrency(subtotal)}</td></tr>
    ${gst > 0 ? `<tr><td style="padding: 4px 0; color: #64748b;">GST / Tax</td><td style="text-align: right; font-weight: 500; color: #1e293b;">${formatCurrency(gst)}</td></tr>` : ''}
    <tr><td style="padding: 4px 0; color: #64748b;">Shipping</td><td style="text-align: right; font-weight: 500; color: #1e293b;">${shipping === 0 ? '<span style="color: #059669; font-weight: 600;">FREE</span>' : formatCurrency(shipping)}</td></tr>
    ${discount > 0 ? `<tr><td style="padding: 4px 0; color: #059669;">Coupon Discount</td><td style="text-align: right; font-weight: 600; color: #059669;">-${formatCurrency(discount)}</td></tr>` : ''}
    <tr><td colspan="2" style="border-top: 1px solid #cbd5e1; padding-top: 10px; margin-top: 6px;"></td></tr>
    <tr><td style="font-size: 16px; font-weight: 700; color: #0f172a;">Total Amount</td><td style="text-align: right; font-size: 16px; font-weight: 700; color: #0891b2;">${formatCurrency(total)}</td></tr>
  </table>`;
};

/**
 * Renders shipping address card
 */
const renderAddressCard = (address) => {
  if (!address) return '';
  return `<div class="address-box">
    <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #0891b2; margin-bottom: 6px; letter-spacing: 0.5px;">Shipping Destination</div>
    <div style="font-weight: 600; color: #1e293b; font-size: 14px;">${address.full_name || address.recipient_name || ''}</div>
    <div style="color: #475569; font-size: 13px; line-height: 1.5; margin-top: 4px;">
      ${address.address_line1 || ''}${address.address_line2 ? `, ${address.address_line2}` : ''}<br>
      ${address.city || ''}, ${address.state || ''} ${address.pincode || address.postal_code || ''}<br>
      ${address.country || 'India'}${address.phone ? `<br>Phone: ${address.phone}` : ''}
    </div>
  </div>`;
};

// ============================================================================
// CUSTOMER EMAIL TEMPLATES
// ============================================================================

/**
 * 1. Order Placed / Confirmation (Customer)
 */
exports.orderConfirmationTemplate = ({ order, user, items = [], address }) => {
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
  const trackUrl = `${frontendUrl}/orders/${order.id || order.order_number}`;

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span class="badge badge-success">✓ Order Confirmed</span>
      <h2 style="font-size: 22px; color: #0f172a; margin: 12px 0 6px 0;">Thank you for your order, ${user.name || 'Valued Customer'}!</h2>
      <p style="color: #64748b; margin: 0; font-size: 14px;">We've received your order and our team is preparing it for shipment.</p>
    </div>

    <div style="background: #f1f5f9; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px; font-size: 13px; color: #334155; display: flex; justify-content: space-between;">
      <div><strong>Order ID:</strong> #${order.order_number}</div>
      <div><strong>Placed:</strong> ${formatDate(order.created_at)}</div>
      <div><strong>Payment:</strong> ${(order.payment_method || 'Online').toUpperCase()}</div>
    </div>

    <h3 style="font-size: 15px; color: #0f172a; margin: 20px 0 10px 0;">Order Summary</h3>
    ${renderItemsTable(items)}
    ${renderTotalsBox(order)}
    ${renderAddressCard(address)}
  `;

  const textContent = `Thank you for your order, ${user.name || 'Valued Customer'}!
Order #${order.order_number} has been placed successfully.
Total: ${formatCurrency(order.total_amount)}
Payment Method: ${(order.payment_method || 'Online').toUpperCase()}
Track your order: ${trackUrl}`;

  return {
    subject: `Order Confirmed: #${order.order_number} - VoltCart`,
    htmlContent: wrapInBaseLayout({
      title: `Order Confirmed #${order.order_number}`,
      preheader: `Thank you for your order #${order.order_number}. We're getting it ready!`,
      content,
      actionUrl: trackUrl,
      actionText: 'Track Your Order',
    }),
    textContent,
  };
};

/**
 * 2. Order Shipped (Customer)
 */
exports.orderShippedTemplate = ({ order, user, items = [], tracking = {} }) => {
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
  const trackUrl = tracking.trackingUrl || `${frontendUrl}/orders/${order.id || order.order_number}`;
  const carrier = tracking.carrier || order.shippo_tracking_carrier || order.shippo_rate_provider || 'Standard Carrier';
  const trackingNumber = tracking.trackingNumber || order.tracking_number || 'Available soon';

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span class="badge badge-info">🚀 Order Shipped</span>
      <h2 style="font-size: 22px; color: #0f172a; margin: 12px 0 6px 0;">Your package is on its way!</h2>
      <p style="color: #64748b; margin: 0; font-size: 14px;">Great news! Order <strong>#${order.order_number}</strong> has shipped.</p>
    </div>

    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin-bottom: 20px;">
      <table style="width: 100%; font-size: 14px;">
        <tr>
          <td style="color: #64748b; padding-bottom: 6px;">Carrier:</td>
          <td style="font-weight: 600; text-align: right; color: #1e293b;">${carrier}</td>
        </tr>
        <tr>
          <td style="color: #64748b; padding-bottom: 6px;">Tracking Number:</td>
          <td style="font-weight: 600; font-family: monospace; text-align: right; color: #0891b2;">${trackingNumber}</td>
        </tr>
        ${order.estimated_delivery ? `
        <tr>
          <td style="color: #64748b;">Estimated Delivery:</td>
          <td style="font-weight: 600; text-align: right; color: #059669;">${formatDate(order.estimated_delivery)}</td>
        </tr>` : ''}
      </table>
    </div>

    <h3 style="font-size: 15px; color: #0f172a; margin: 20px 0 10px 0;">Items In This Shipment</h3>
    ${renderItemsTable(items)}
  `;

  const textContent = `Your order #${order.order_number} has shipped!
Carrier: ${carrier}
Tracking Number: ${trackingNumber}
Estimated Delivery: ${order.estimated_delivery || 'In transit'}
Track shipment: ${trackUrl}`;

  return {
    subject: `Your order #${order.order_number} has shipped! - VoltCart`,
    htmlContent: wrapInBaseLayout({
      title: `Order Shipped #${order.order_number}`,
      preheader: `Good news! Order #${order.order_number} is on its way with ${carrier}.`,
      content,
      actionUrl: trackUrl,
      actionText: 'Track Package',
    }),
    textContent,
  };
};

/**
 * 3. Order Delivered (Customer)
 */
exports.orderDeliveredTemplate = ({ order, user }) => {
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
  const orderUrl = `${frontendUrl}/orders/${order.id || order.order_number}`;

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span class="badge badge-success">📦 Delivered</span>
      <h2 style="font-size: 22px; color: #0f172a; margin: 12px 0 6px 0;">Your package was delivered!</h2>
      <p style="color: #64748b; margin: 0; font-size: 14px;">Order <strong>#${order.order_number}</strong> was successfully delivered.</p>
    </div>

    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-bottom: 20px; font-size: 14px; color: #166534; line-height: 1.5;">
      We hope you love your new electronics! If you have any questions or require support regarding your items, our team is always ready to assist.
    </div>

    <p style="font-size: 14px; color: #475569; text-align: center;">
      How was your experience? Leave a review to help other tech enthusiasts choose the best gear.
    </p>
  `;

  const textContent = `Your order #${order.order_number} has been delivered!
We hope you enjoy your purchase.
View order details or leave a review: ${orderUrl}`;

  return {
    subject: `Delivered: Your order #${order.order_number} has arrived! - VoltCart`,
    htmlContent: wrapInBaseLayout({
      title: `Order Delivered #${order.order_number}`,
      preheader: `Your VoltCart order #${order.order_number} has been delivered. Enjoy your tech!`,
      content,
      actionUrl: orderUrl,
      actionText: 'View Order & Leave Review',
    }),
    textContent,
  };
};

/**
 * 4. Order Cancelled (Customer)
 */
exports.orderCancelledTemplate = ({ order, user, reason }) => {
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
  const catalogUrl = `${frontendUrl}/products`;

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span class="badge badge-danger">✕ Order Cancelled</span>
      <h2 style="font-size: 22px; color: #0f172a; margin: 12px 0 6px 0;">Order #${order.order_number} has been cancelled</h2>
      <p style="color: #64748b; margin: 0; font-size: 14px;">We've processed the cancellation request for this order.</p>
    </div>

    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
      <div style="font-size: 13px; color: #64748b; margin-bottom: 4px;">Reason for cancellation:</div>
      <div style="font-size: 14px; font-weight: 600; color: #1e293b;">${reason || order.cancel_reason || 'Cancelled as per request'}</div>
    </div>

    <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 14px; border-radius: 4px; font-size: 13px; color: #1e40af; line-height: 1.5;">
      <strong>Refund Information:</strong> If you paid online (Razorpay / Cashfree / Card / UPI), any debited amount will be refunded back to your original payment method within 5-7 business days.
    </div>
  `;

  const textContent = `Order #${order.order_number} has been cancelled.
Reason: ${reason || order.cancel_reason || 'Cancelled as per request'}
If you made an online payment, your refund will be processed to the original payment method within 5-7 business days.`;

  return {
    subject: `Order Cancelled: #${order.order_number} - VoltCart`,
    htmlContent: wrapInBaseLayout({
      title: `Order Cancelled #${order.order_number}`,
      preheader: `Notification regarding cancellation of order #${order.order_number}.`,
      content,
      actionUrl: catalogUrl,
      actionText: 'Browse Catalog',
    }),
    textContent,
  };
};

/**
 * 5. Payment Successful (Customer)
 */
exports.paymentSuccessTemplate = ({ order, user, payment }) => {
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
  const orderUrl = `${frontendUrl}/orders/${order.id || order.order_number}`;

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span class="badge badge-success">✓ Payment Received</span>
      <h2 style="font-size: 22px; color: #0f172a; margin: 12px 0 6px 0;">Payment Successful</h2>
      <p style="color: #64748b; margin: 0; font-size: 14px;">Thank you! We have verified your payment for order <strong>#${order.order_number}</strong>.</p>
    </div>

    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin-bottom: 20px;">
      <table style="width: 100%; font-size: 14px;">
        <tr>
          <td style="color: #64748b; padding-bottom: 8px;">Amount Paid:</td>
          <td style="font-weight: 700; text-align: right; color: #0891b2; font-size: 16px;">${formatCurrency(payment.amount || order.total_amount)}</td>
        </tr>
        <tr>
          <td style="color: #64748b; padding-bottom: 8px;">Payment Gateway:</td>
          <td style="font-weight: 600; text-align: right; color: #1e293b; text-transform: uppercase;">${payment.gateway || order.payment_method || 'Online'}</td>
        </tr>
        ${payment.transactionId ? `
        <tr>
          <td style="color: #64748b; padding-bottom: 8px;">Transaction ID:</td>
          <td style="font-weight: 600; font-family: monospace; text-align: right; color: #334155;">${payment.transactionId}</td>
        </tr>` : ''}
        <tr>
          <td style="color: #64748b;">Order Reference:</td>
          <td style="font-weight: 600; text-align: right; color: #1e293b;">#${order.order_number}</td>
        </tr>
      </table>
    </div>
  `;

  const textContent = `Payment Successful for Order #${order.order_number}
Amount: ${formatCurrency(payment.amount || order.total_amount)}
Gateway: ${(payment.gateway || order.payment_method || 'Online').toUpperCase()}
Transaction ID: ${payment.transactionId || 'N/A'}
View order: ${orderUrl}`;

  return {
    subject: `Payment Successful: #${order.order_number} - VoltCart`,
    htmlContent: wrapInBaseLayout({
      title: `Payment Receipt #${order.order_number}`,
      preheader: `We've received your payment of ${formatCurrency(payment.amount || order.total_amount)} for order #${order.order_number}.`,
      content,
      actionUrl: orderUrl,
      actionText: 'View Order Details',
    }),
    textContent,
  };
};

/**
 * 6. Payment Failed (Customer)
 */
exports.paymentFailedTemplate = ({ order, user, payment = {} }) => {
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
  const retryUrl = `${frontendUrl}/checkout?order_id=${order.id || order.order_number}`;

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span class="badge badge-danger">! Payment Failed</span>
      <h2 style="font-size: 22px; color: #0f172a; margin: 12px 0 6px 0;">Payment Could Not Be Completed</h2>
      <p style="color: #64748b; margin: 0; font-size: 14px;">We were unable to process your payment for order <strong>#${order.order_number}</strong>.</p>
    </div>

    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 20px; font-size: 14px; color: #991b1b;">
      <strong>Details:</strong> ${payment.reason || 'The transaction was declined or interrupted by the payment provider.'}
    </div>

    <p style="font-size: 14px; color: #475569; line-height: 1.6;">
      Don't worry, your items have been reserved temporarily. You can retry paying with a different card, UPI, or select Cash on Delivery.
    </p>
  `;

  const textContent = `Payment Failed for Order #${order.order_number}
Amount: ${formatCurrency(payment.amount || order.total_amount)}
Reason: ${payment.reason || 'Transaction could not be verified'}
Retry payment: ${retryUrl}`;

  return {
    subject: `Payment Action Required: #${order.order_number} - VoltCart`,
    htmlContent: wrapInBaseLayout({
      title: `Payment Failed #${order.order_number}`,
      preheader: `Payment could not be completed for order #${order.order_number}. Please retry.`,
      content,
      actionUrl: retryUrl,
      actionText: 'Retry Payment Now',
    }),
    textContent,
  };
};

// ============================================================================
// ADMIN EMAIL TEMPLATES (Sent ONLY to ADMIN_EMAIL)
// ============================================================================

/**
 * 7. Admin: New Order Received
 */
exports.adminOrderReceivedTemplate = ({ order, user, items = [], address }) => {
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
  const adminOrderUrl = `${frontendUrl}/admin/orders?order=${order.order_number}`;

  const content = `
    <div style="margin-bottom: 20px;">
      <span class="badge badge-info">🔔 Admin Alert: New Order</span>
      <h2 style="font-size: 20px; color: #0f172a; margin: 12px 0 6px 0;">New Order Placed: #${order.order_number}</h2>
      <p style="color: #64748b; margin: 0; font-size: 14px;">A customer has placed a new order on VoltCart.</p>
    </div>

    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px; font-size: 14px;">
      <table style="width: 100%;">
        <tr><td style="color: #64748b; padding: 4px 0;">Customer Name:</td><td style="font-weight: 600; text-align: right;">${user.name || 'N/A'}</td></tr>
        <tr><td style="color: #64748b; padding: 4px 0;">Customer Email:</td><td style="font-weight: 600; text-align: right;">${user.email || 'N/A'}</td></tr>
        <tr><td style="color: #64748b; padding: 4px 0;">Customer Phone:</td><td style="font-weight: 600; text-align: right;">${address?.phone || user.phone || 'N/A'}</td></tr>
        <tr><td style="color: #64748b; padding: 4px 0;">Order Value:</td><td style="font-weight: 700; text-align: right; color: #0891b2;">${formatCurrency(order.total_amount)}</td></tr>
        <tr><td style="color: #64748b; padding: 4px 0;">Payment Method:</td><td style="font-weight: 600; text-align: right; text-transform: uppercase;">${order.payment_method}</td></tr>
        <tr><td style="color: #64748b; padding: 4px 0;">Payment Status:</td><td style="font-weight: 600; text-align: right; text-transform: uppercase;">${order.payment_status || 'Pending'}</td></tr>
      </table>
    </div>

    <h3 style="font-size: 15px; color: #0f172a; margin: 20px 0 10px 0;">Ordered Items (${items.length})</h3>
    ${renderItemsTable(items)}
    ${renderAddressCard(address)}
  `;

  const textContent = `Admin Alert: New Order #${order.order_number}
Customer: ${user.name} (${user.email})
Total: ${formatCurrency(order.total_amount)}
Payment: ${order.payment_method} (${order.payment_status || 'pending'})
Review in dashboard: ${adminOrderUrl}`;

  return {
    subject: `[Admin Alert] New Order #${order.order_number} - ${formatCurrency(order.total_amount)}`,
    htmlContent: wrapInBaseLayout({
      title: `Admin: New Order #${order.order_number}`,
      preheader: `New order #${order.order_number} placed by ${user.name} for ${formatCurrency(order.total_amount)}.`,
      content,
      actionUrl: adminOrderUrl,
      actionText: 'View in Admin Dashboard',
    }),
    textContent,
  };
};

/**
 * 8. Admin: Order Delivered
 */
exports.adminOrderDeliveredTemplate = ({ order, user }) => {
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
  const adminOrderUrl = `${frontendUrl}/admin/orders?order=${order.order_number}`;

  const content = `
    <div style="margin-bottom: 20px;">
      <span class="badge badge-success">✓ Admin Notification: Delivered</span>
      <h2 style="font-size: 20px; color: #0f172a; margin: 12px 0 6px 0;">Order #${order.order_number} Delivered</h2>
      <p style="color: #64748b; margin: 0; font-size: 14px;">The shipment has reached the customer successfully.</p>
    </div>

    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; font-size: 14px;">
      <table style="width: 100%;">
        <tr><td style="color: #64748b; padding: 4px 0;">Customer:</td><td style="font-weight: 600; text-align: right;">${user.name}</td></tr>
        <tr><td style="color: #64748b; padding: 4px 0;">Order Total:</td><td style="font-weight: 600; text-align: right;">${formatCurrency(order.total_amount)}</td></tr>
        <tr><td style="color: #64748b; padding: 4px 0;">Delivered At:</td><td style="font-weight: 600; text-align: right;">${formatDate(order.delivered_at || new Date())}</td></tr>
      </table>
    </div>
  `;

  const textContent = `Admin Notification: Order #${order.order_number} has been delivered to ${user.name}.
Total: ${formatCurrency(order.total_amount)}
Delivered at: ${order.delivered_at || new Date().toISOString()}`;

  return {
    subject: `[Admin Alert] Order Delivered: #${order.order_number}`,
    htmlContent: wrapInBaseLayout({
      title: `Admin: Order Delivered #${order.order_number}`,
      preheader: `Order #${order.order_number} delivered to ${user.name}.`,
      content,
      actionUrl: adminOrderUrl,
      actionText: 'View Order in Admin',
    }),
    textContent,
  };
};

/**
 * 9. Admin: Order Cancelled
 */
exports.adminOrderCancelledTemplate = ({ order, user, reason }) => {
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
  const adminOrderUrl = `${frontendUrl}/admin/orders?order=${order.order_number}`;

  const content = `
    <div style="margin-bottom: 20px;">
      <span class="badge badge-danger">! Admin Alert: Cancellation</span>
      <h2 style="font-size: 20px; color: #0f172a; margin: 12px 0 6px 0;">Order #${order.order_number} Cancelled</h2>
      <p style="color: #64748b; margin: 0; font-size: 14px;">An order has been cancelled.</p>
    </div>

    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; font-size: 14px;">
      <table style="width: 100%;">
        <tr><td style="color: #64748b; padding: 4px 0;">Customer:</td><td style="font-weight: 600; text-align: right;">${user.name}</td></tr>
        <tr><td style="color: #64748b; padding: 4px 0;">Order Total:</td><td style="font-weight: 600; text-align: right;">${formatCurrency(order.total_amount)}</td></tr>
        <tr><td style="color: #64748b; padding: 4px 0;">Reason:</td><td style="font-weight: 600; text-align: right; color: #dc2626;">${reason || order.cancel_reason || 'N/A'}</td></tr>
        <tr><td style="color: #64748b; padding: 4px 0;">Payment Status:</td><td style="font-weight: 600; text-align: right; text-transform: uppercase;">${order.payment_status}</td></tr>
      </table>
    </div>
  `;

  const textContent = `Admin Alert: Order #${order.order_number} Cancelled
Customer: ${user.name}
Total: ${formatCurrency(order.total_amount)}
Reason: ${reason || order.cancel_reason || 'N/A'}`;

  return {
    subject: `[Admin Alert] Order Cancelled: #${order.order_number}`,
    htmlContent: wrapInBaseLayout({
      title: `Admin: Order Cancelled #${order.order_number}`,
      preheader: `Order #${order.order_number} has been cancelled.`,
      content,
      actionUrl: adminOrderUrl,
      actionText: 'View Order in Admin',
    }),
    textContent,
  };
};

/**
 * 10. Admin: Payment Notification (Success or Failure)
 */
exports.adminPaymentNotificationTemplate = ({ order, user, payment }) => {
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
  const adminOrderUrl = `${frontendUrl}/admin/orders?order=${order.order_number}`;
  const isSuccess = (payment.status || '').toLowerCase() === 'success';

  const content = `
    <div style="margin-bottom: 20px;">
      <span class="badge ${isSuccess ? 'badge-success' : 'badge-danger'}">
        ${isSuccess ? '✓ Payment Confirmed' : '! Payment Failed'}
      </span>
      <h2 style="font-size: 20px; color: #0f172a; margin: 12px 0 6px 0;">
        Payment ${isSuccess ? 'Verified' : 'Failed'} for #${order.order_number}
      </h2>
      <p style="color: #64748b; margin: 0; font-size: 14px;">
        Payment event recorded on gateway ${payment.gateway || 'online'}.
      </p>
    </div>

    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; font-size: 14px;">
      <table style="width: 100%;">
        <tr><td style="color: #64748b; padding: 4px 0;">Customer:</td><td style="font-weight: 600; text-align: right;">${user.name} (${user.email})</td></tr>
        <tr><td style="color: #64748b; padding: 4px 0;">Amount:</td><td style="font-weight: 700; text-align: right; color: ${isSuccess ? '#059669' : '#dc2626'};">${formatCurrency(payment.amount || order.total_amount)}</td></tr>
        <tr><td style="color: #64748b; padding: 4px 0;">Gateway:</td><td style="font-weight: 600; text-align: right; text-transform: uppercase;">${payment.gateway || 'N/A'}</td></tr>
        ${payment.transactionId ? `<tr><td style="color: #64748b; padding: 4px 0;">Transaction ID:</td><td style="font-weight: 600; font-family: monospace; text-align: right;">${payment.transactionId}</td></tr>` : ''}
        ${!isSuccess && payment.reason ? `<tr><td style="color: #64748b; padding: 4px 0;">Failure Reason:</td><td style="font-weight: 600; text-align: right; color: #dc2626;">${payment.reason}</td></tr>` : ''}
      </table>
    </div>
  `;

  const textContent = `[Admin Alert] Payment ${isSuccess ? 'Success' : 'Failed'} for Order #${order.order_number}
Customer: ${user.name} (${user.email})
Amount: ${formatCurrency(payment.amount || order.total_amount)}
Gateway: ${payment.gateway}
Status: ${payment.status}
${payment.transactionId ? `Tx ID: ${payment.transactionId}` : ''}
${!isSuccess && payment.reason ? `Reason: ${payment.reason}` : ''}`;

  return {
    subject: `[Admin Alert] Payment ${isSuccess ? 'Success' : 'Failed'}: #${order.order_number} - ${formatCurrency(payment.amount || order.total_amount)}`,
    htmlContent: wrapInBaseLayout({
      title: `Admin: Payment Notification #${order.order_number}`,
      preheader: `Payment ${payment.status} for order #${order.order_number}.`,
      content,
      actionUrl: adminOrderUrl,
      actionText: 'Review in Dashboard',
    }),
    textContent,
  };
};
