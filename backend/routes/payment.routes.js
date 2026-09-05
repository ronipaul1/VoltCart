const express = require('express');
const router = express.Router();
const paymentCtrl = require('../controllers/payment.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);
router.post('/razorpay/create', paymentCtrl.createRazorpayOrder);
router.post('/razorpay/verify', paymentCtrl.verifyRazorpayPayment);
router.post('/cashfree/create', paymentCtrl.createCashfreeOrder);
router.post('/cashfree/verify', paymentCtrl.verifyCashfreePayment);
router.post('/cod', paymentCtrl.processCOD);

module.exports = router;
