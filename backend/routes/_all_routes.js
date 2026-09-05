// ════════════════════════════════════════════════
// review.routes.js
// ════════════════════════════════════════════════
const express = require('express');
const reviewRouter = express.Router();
const db = require('../config/database');
const { authenticate, adminOnly } = require('../middleware/auth.middleware');

reviewRouter.get('/product/:product_id', async (req, res) => {
  const { product_id } = req.params;
  const [reviews] = await db.execute(`
    SELECT r.*, u.name AS user_name, u.avatar AS user_avatar
    FROM reviews r JOIN users u ON r.user_id = u.id
    WHERE r.product_id = ? AND r.is_approved = 1
    ORDER BY r.created_at DESC
  `, [product_id]);
  res.json({ success: true, data: reviews });
});

reviewRouter.post('/', authenticate, async (req, res) => {
  const { product_id, order_id, rating, title, body } = req.body;
  try {
    // Check verified purchase
    const [orders] = await db.execute(
      'SELECT id FROM order_items oi JOIN orders o ON oi.order_id = o.id WHERE oi.product_id = ? AND o.user_id = ? AND o.order_status = "delivered"',
      [product_id, req.user.id]
    );
    const isVerified = orders.length > 0;

    await db.execute(
      'INSERT INTO reviews (product_id, user_id, order_id, rating, title, body, is_verified_purchase, is_approved) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
      [product_id, req.user.id, order_id || null, rating, title || null, body || null, isVerified]
    );
    res.status(201).json({ success: true, message: 'Review submitted!' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'You have already reviewed this product.' });
    }
    res.status(500).json({ success: false, message: 'Failed to submit review.' });
  }
});

reviewRouter.delete('/:id', authenticate, adminOnly, async (req, res) => {
  await db.execute('DELETE FROM reviews WHERE id = ?', [req.params.id]);
  res.json({ success: true, message: 'Review deleted.' });
});

// ════════════════════════════════════════════════
// coupon.routes.js
// ════════════════════════════════════════════════
const couponRouter = express.Router();

couponRouter.post('/validate', authenticate, async (req, res) => {
  const { code, order_amount } = req.body;
  const [rows] = await db.execute(`
    SELECT * FROM coupons
    WHERE code = ? AND is_active = 1
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (usage_limit IS NULL OR used_count < usage_limit)
  `, [code]);

  if (!rows.length) return res.status(404).json({ success: false, message: 'Invalid or expired coupon.' });

  const coupon = rows[0];
  if (parseFloat(order_amount) < parseFloat(coupon.min_order_amount)) {
    return res.status(400).json({
      success: false,
      message: `Minimum order amount ₹${coupon.min_order_amount} required.`
    });
  }

  let discount = 0;
  if (coupon.discount_type === 'percentage') {
    discount = (parseFloat(order_amount) * coupon.discount_value) / 100;
    if (coupon.max_discount_amount) discount = Math.min(discount, parseFloat(coupon.max_discount_amount));
  } else {
    discount = parseFloat(coupon.discount_value);
  }

  res.json({
    success: true,
    data: {
      coupon_id: coupon.id,
      code: coupon.code,
      description: coupon.description,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      discount_amount: discount.toFixed(2),
    }
  });
});

couponRouter.get('/', authenticate, adminOnly, async (req, res) => {
  const [rows] = await db.execute('SELECT * FROM coupons ORDER BY created_at DESC');
  res.json({ success: true, data: rows });
});

couponRouter.post('/', authenticate, adminOnly, async (req, res) => {
  const { code, description, discount_type, discount_value, min_order_amount, max_discount_amount, usage_limit, per_user_limit, expires_at } = req.body;
  await db.execute(
    'INSERT INTO coupons (code, description, discount_type, discount_value, min_order_amount, max_discount_amount, usage_limit, per_user_limit, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [code, description, discount_type, discount_value, min_order_amount || 0, max_discount_amount || null, usage_limit || null, per_user_limit || 1, expires_at || null]
  );
  res.status(201).json({ success: true, message: 'Coupon created!' });
});

couponRouter.put('/:id', authenticate, adminOnly, async (req, res) => {
  const { is_active, expires_at } = req.body;
  await db.execute('UPDATE coupons SET is_active = ?, expires_at = ? WHERE id = ?', [is_active, expires_at, req.params.id]);
  res.json({ success: true, message: 'Coupon updated!' });
});

// ════════════════════════════════════════════════
// notification.routes.js
// ════════════════════════════════════════════════
const notifRouter = express.Router();
notifRouter.use(authenticate);

notifRouter.get('/', async (req, res) => {
  const [rows] = await db.execute(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
    [req.user.id]
  );
  res.json({ success: true, data: rows });
});

notifRouter.put('/mark-all-read', async (req, res) => {
  await db.execute('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id]);
  res.json({ success: true, message: 'All notifications marked as read.' });
});

notifRouter.put('/:id/read', async (req, res) => {
  await db.execute('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  res.json({ success: true });
});

// ════════════════════════════════════════════════
// address.routes.js
// ════════════════════════════════════════════════
const addrRouter = express.Router();
addrRouter.use(authenticate);

addrRouter.get('/', async (req, res) => {
  const [rows] = await db.execute('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC', [req.user.id]);
  res.json({ success: true, data: rows });
});

addrRouter.post('/', async (req, res) => {
  const { full_name, phone, address_line1, address_line2, city, state, pincode, country, address_type, is_default } = req.body;
  if (is_default) {
    await db.execute('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [req.user.id]);
  }
  const [result] = await db.execute(
    'INSERT INTO addresses (user_id, full_name, phone, address_line1, address_line2, city, state, pincode, country, address_type, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [req.user.id, full_name, phone, address_line1, address_line2 || null, city, state, pincode, country || 'India', address_type || 'home', is_default ? 1 : 0]
  );
  res.status(201).json({ success: true, message: 'Address added!', data: { id: result.insertId } });
});

addrRouter.put('/:id', async (req, res) => {
  const { full_name, phone, address_line1, address_line2, city, state, pincode, address_type, is_default } = req.body;
  if (is_default) {
    await db.execute('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [req.user.id]);
  }
  await db.execute(
    'UPDATE addresses SET full_name=?, phone=?, address_line1=?, address_line2=?, city=?, state=?, pincode=?, address_type=?, is_default=? WHERE id=? AND user_id=?',
    [full_name, phone, address_line1, address_line2 || null, city, state, pincode, address_type, is_default ? 1 : 0, req.params.id, req.user.id]
  );
  res.json({ success: true, message: 'Address updated!' });
});

addrRouter.delete('/:id', async (req, res) => {
  await db.execute('DELETE FROM addresses WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  res.json({ success: true, message: 'Address deleted.' });
});

// ════════════════════════════════════════════════
// user.routes.js
// ════════════════════════════════════════════════
const userRouter = express.Router();
userRouter.use(authenticate);
userRouter.get('/profile', async (req, res) => {
  const [rows] = await db.execute('SELECT id, name, email, phone, avatar, role, created_at FROM users WHERE id = ?', [req.user.id]);
  res.json({ success: true, data: rows[0] });
});

// ════════════════════════════════════════════════
// admin.routes.js
// ════════════════════════════════════════════════
const adminRouter = express.Router();
const adminCtrl = require('../controllers/admin.controller');
adminRouter.use(authenticate, adminOnly);

adminRouter.get('/dashboard', adminCtrl.getDashboard);
adminRouter.get('/orders', adminCtrl.getAllOrders);
adminRouter.get('/customers', adminCtrl.getAllCustomers);
adminRouter.get('/finance', adminCtrl.getFinanceReport);
adminRouter.get('/inventory', adminCtrl.getInventory);

adminRouter.post('/expenses', async (req, res) => {
  const { category, description, amount, gst_amount, expense_date, receipt_url } = req.body;
  await db.execute(
    'INSERT INTO expenses (category, description, amount, gst_amount, expense_date, receipt_url, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [category, description || null, amount, gst_amount || 0, expense_date, receipt_url || null, req.user.id]
  );
  res.status(201).json({ success: true, message: 'Expense recorded!' });
});

adminRouter.get('/expenses', async (req, res) => {
  const [rows] = await db.execute('SELECT e.*, u.name AS created_by_name FROM expenses e JOIN users u ON e.created_by = u.id ORDER BY expense_date DESC');
  res.json({ success: true, data: rows });
});

adminRouter.put('/users/:id/toggle', async (req, res) => {
  await db.execute('UPDATE users SET is_active = NOT is_active WHERE id = ?', [req.params.id]);
  res.json({ success: true, message: 'User status toggled.' });
});

// Export all routers
const { authenticate: auth, adminOnly: admin } = require('../middleware/auth.middleware');

module.exports = {
  reviewRouter,
  couponRouter,
  notifRouter,
  addrRouter,
  userRouter,
  adminRouter,
};
