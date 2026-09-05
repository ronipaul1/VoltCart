// ═══════════════ category.routes.js ═══════════════
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate, adminOnly } = require('../middleware/auth.middleware');

router.get('/', async (req, res) => {
  const [rows] = await db.execute('SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order ASC');
  res.json({ success: true, data: rows });
});

router.post('/', authenticate, adminOnly, async (req, res) => {
  const { name, description, parent_id } = req.body;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  await db.execute('INSERT INTO categories (name, slug, description, parent_id) VALUES (?, ?, ?, ?)',
    [name, slug, description || null, parent_id || null]);
  res.status(201).json({ success: true, message: 'Category created!' });
});

router.put('/:id', authenticate, adminOnly, async (req, res) => {
  const { name, description, is_active } = req.body;
  await db.execute('UPDATE categories SET name = ?, description = ?, is_active = ? WHERE id = ?',
    [name, description, is_active, req.params.id]);
  res.json({ success: true, message: 'Category updated!' });
});

module.exports = router;
