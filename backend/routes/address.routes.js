const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

router.get('/', async (req, res) => {
  const [rows] = await db.execute('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC', [req.user.id]);
  res.json({ success: true, data: rows });
});

router.post('/', async (req, res) => {
  const { full_name, phone, address_line1, address_line2, city, state, pincode, country, address_type, is_default } = req.body;
  if (is_default) await db.execute('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [req.user.id]);
  const [result] = await db.execute(
    'INSERT INTO addresses (user_id, full_name, phone, address_line1, address_line2, city, state, pincode, country, address_type, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [req.user.id, full_name, phone, address_line1, address_line2 || null, city, state, pincode, country || 'India', address_type || 'home', is_default ? 1 : 0]
  );
  res.status(201).json({ success: true, data: { id: result.insertId } });
});

router.put('/:id', async (req, res) => {
  const { full_name, phone, address_line1, address_line2, city, state, pincode, address_type, is_default } = req.body;
  if (is_default) await db.execute('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [req.user.id]);
  await db.execute(
    'UPDATE addresses SET full_name=?, phone=?, address_line1=?, address_line2=?, city=?, state=?, pincode=?, address_type=?, is_default=? WHERE id=? AND user_id=?',
    [full_name, phone, address_line1, address_line2 || null, city, state, pincode, address_type, is_default ? 1 : 0, req.params.id, req.user.id]
  );
  res.json({ success: true, message: 'Address updated!' });
});

router.delete('/:id', async (req, res) => {
  await db.execute('DELETE FROM addresses WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  res.json({ success: true, message: 'Address deleted.' });
});

module.exports = router;
