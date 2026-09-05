const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

router.get('/profile', async (req, res) => {
  const [rows] = await db.execute('SELECT id, name, email, phone, avatar, role, created_at FROM users WHERE id = ?', [req.user.id]);
  res.json({ success: true, data: rows[0] });
});

module.exports = router;
