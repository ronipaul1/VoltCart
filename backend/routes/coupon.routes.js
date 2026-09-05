const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate, adminOnly } = require('../middleware/auth.middleware');

router.post('/validate', authenticate, async (req, res) => {
  const { code, order_amount } = req.body;
  const [rows] = await db.execute(
    `SELECT * FROM coupons WHERE code = ? AND is_active = 1
     AND (expires_at IS NULL OR expires_at > NOW())
     AND (usage_limit IS NULL OR used_count < usage_limit)`, [code]
  );
  if (!rows.length) return res.status(404).json({ success: false, message: 'Invalid or expired coupon.' });
  const coupon = rows[0];
  if (parseFloat(order_amount) < parseFloat(coupon.min_order_amount)) {
    return res.status(400).json({ success: false, message: `Minimum order ₹${coupon.min_order_amount} required.` });
  }
  let discount = coupon.discount_type === 'percentage'
    ? Math.min((parseFloat(order_amount) * coupon.discount_value) / 100, parseFloat(coupon.max_discount_amount || Infinity))
    : parseFloat(coupon.discount_value);
  res.json({ success: true, data: { ...coupon, discount_amount: discount.toFixed(2) } });
});

router.get('/', authenticate, adminOnly, async (req, res) => {
  const [rows] = await db.execute('SELECT * FROM coupons ORDER BY created_at DESC');
  res.json({ success: true, data: rows });
});

router.post('/', authenticate, adminOnly, async (req, res) => {
  const { code, description, discount_type, discount_value, min_order_amount, max_discount_amount, usage_limit, expires_at } = req.body;
  await db.execute(
    'INSERT INTO coupons (code, description, discount_type, discount_value, min_order_amount, max_discount_amount, usage_limit, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [code, description, discount_type, discount_value, min_order_amount || 0, max_discount_amount || null, usage_limit || null, expires_at || null]
  );
  res.status(201).json({ success: true, message: 'Coupon created!' });
});

router.put('/:id', authenticate, adminOnly, async (req, res) => {
  const { is_active, expires_at } = req.body;
  await db.execute('UPDATE coupons SET is_active = ?, expires_at = ? WHERE id = ?', [is_active, expires_at, req.params.id]);
  res.json({ success: true, message: 'Coupon updated!' });
});

module.exports = router;
