const express = require('express');
const router = express.Router();
const db = require('../config/database');
const adminCtrl = require('../controllers/admin.controller');
const { authenticate, adminOnly } = require('../middleware/auth.middleware');

router.use(authenticate, adminOnly);

router.get('/dashboard', adminCtrl.getDashboard);
router.get('/orders', adminCtrl.getAllOrders);
router.get('/orders/:id/invoice', adminCtrl.downloadOrderInvoice);
router.get('/orders/:id/label', adminCtrl.downloadShippingLabel);
router.get('/customers', adminCtrl.getAllCustomers);
router.get('/finance', adminCtrl.getFinanceReport);
router.get('/inventory', adminCtrl.getInventory);

router.post('/expenses', async (req, res) => {
  const { category, description, amount, gst_amount, expense_date } = req.body;
  await db.execute(
    'INSERT INTO expenses (category, description, amount, gst_amount, expense_date, created_by) VALUES (?, ?, ?, ?, ?, ?)',
    [category, description || null, amount, gst_amount || 0, expense_date, req.user.id]
  );
  res.status(201).json({ success: true, message: 'Expense recorded!' });
});

router.get('/expenses', async (req, res) => {
  const [rows] = await db.execute('SELECT e.*, u.name AS created_by_name FROM expenses e JOIN users u ON e.created_by = u.id ORDER BY expense_date DESC');
  res.json({ success: true, data: rows });
});

router.put('/users/:id/toggle', async (req, res) => {
  await db.execute('UPDATE users SET is_active = NOT is_active WHERE id = ?', [req.params.id]);
  res.json({ success: true, message: 'User status toggled.' });
});

module.exports = router;
