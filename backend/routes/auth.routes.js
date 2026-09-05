// ══════════════════════════════════════════
// auth.routes.js
// ══════════════════════════════════════════
const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const authCtrl = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

router.post('/register', [
  body('name').trim().isLength({ min: 2, max: 100 }),
  body('email').optional({ checkFalsy: true }).isEmail().normalizeEmail(),
  body('phone').optional({ checkFalsy: true }).trim().isLength({ min: 7, max: 20 }),
  body('password').isLength({ min: 6 }),
], authCtrl.register);

router.post('/login', [
  body('email').optional({ checkFalsy: true }).isEmail().normalizeEmail(),
  body('phone').optional({ checkFalsy: true }).trim().isLength({ min: 7, max: 20 }),
  body('password').notEmpty(),
], authCtrl.login);

router.get('/me', authenticate, authCtrl.getMe);
router.put('/profile', authenticate, upload.single('avatar'), authCtrl.updateProfile);
router.put('/change-password', authenticate, authCtrl.changePassword);

module.exports = router;
