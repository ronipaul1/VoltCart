const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate, adminOnly } = require('../middleware/auth.middleware');

router.get('/product/:product_id', async (req, res) => {
  const [reviews] = await db.execute(`
    SELECT r.*, u.name AS user_name, u.avatar AS user_avatar
    FROM reviews r JOIN users u ON r.user_id = u.id
    WHERE r.product_id = ? AND r.is_approved = 1
    ORDER BY r.created_at DESC
  `, [req.params.product_id]);
  res.json({ success: true, data: reviews });
});

router.get('/eligibility/:product_id', authenticate, async (req, res) => {
  try {
    const [deliveredItems] = await db.execute(`
      SELECT o.id AS order_id, o.order_number, o.delivered_at
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE oi.product_id = ? AND o.user_id = ? AND o.order_status = 'delivered'
      ORDER BY o.delivered_at DESC, o.created_at DESC
      LIMIT 1
    `, [req.params.product_id, req.user.id]);

    const [existingReviews] = await db.execute(
      'SELECT id FROM reviews WHERE product_id = ? AND user_id = ? LIMIT 1',
      [req.params.product_id, req.user.id]
    );

    res.json({
      success: true,
      data: {
        canReview: deliveredItems.length > 0 && existingReviews.length === 0,
        hasDeliveredOrder: deliveredItems.length > 0,
        alreadyReviewed: existingReviews.length > 0,
        order: deliveredItems[0] || null,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to check review eligibility.' });
  }
});

router.get('/admin', authenticate, adminOnly, async (req, res) => {
  try {
    const { product_id, search = '', rating = '' } = req.query;
    const conditions = [];
    const params = [];

    if (product_id) {
      conditions.push('r.product_id = ?');
      params.push(product_id);
    }
    if (rating) {
      conditions.push('r.rating = ?');
      params.push(rating);
    }
    if (search) {
      conditions.push('(p.name LIKE ? OR u.name LIKE ? OR u.email LIKE ? OR r.title LIKE ? OR r.body LIKE ?)');
      const term = `%${search}%`;
      params.push(term, term, term, term, term);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [reviews] = await db.execute(`
      SELECT r.*, p.name AS product_name, p.slug AS product_slug,
        u.name AS user_name, u.email AS user_email, o.order_number
      FROM reviews r
      JOIN products p ON p.id = r.product_id
      JOIN users u ON u.id = r.user_id
      LEFT JOIN orders o ON o.id = r.order_id
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT 200
    `, params);

    res.json({ success: true, data: reviews });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch reviews.' });
  }
});

router.post('/', authenticate, async (req, res) => {
  const { product_id, order_id, rating, title, body } = req.body;
  try {
    const numericRating = Number(rating);
    if (!product_id || !Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ success: false, message: 'Please select a valid rating.' });
    }

    const params = [product_id, req.user.id];
    const orderFilter = order_id ? 'AND o.id = ?' : '';
    if (order_id) params.push(order_id);

    const [orders] = await db.execute(`
      SELECT o.id
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE oi.product_id = ? AND o.user_id = ? AND o.order_status = 'delivered' ${orderFilter}
      ORDER BY o.delivered_at DESC, o.created_at DESC
      LIMIT 1
    `, params);

    if (!orders.length) {
      return res.status(403).json({ success: false, message: 'You can review this product after it is delivered.' });
    }

    await db.execute(
      'INSERT INTO reviews (product_id, user_id, order_id, rating, title, body, is_verified_purchase, is_approved) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
      [product_id, req.user.id, orders[0].id, numericRating, title || null, body || null, 1]
    );
    res.status(201).json({ success: true, message: 'Review submitted!' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'You have already reviewed this product.' });
    res.status(500).json({ success: false, message: 'Failed to submit review.' });
  }
});

router.delete('/:id', authenticate, adminOnly, async (req, res) => {
  await db.execute('DELETE FROM reviews WHERE id = ?', [req.params.id]);
  res.json({ success: true, message: 'Review deleted.' });
});

module.exports = router;
