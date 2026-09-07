const express = require('express');
const router = express.Router();
const orderCtrl = require('../controllers/order.controller');
const { authenticate, adminOnly } = require('../middleware/auth.middleware');

// Public webhook / storefront notification endpoint for order email dispatch
router.post('/notify-placement', orderCtrl.notifyOrderPlacement);

// Public live order tracking endpoint (by Order Number, AWB, or ID)
router.get('/track/:identifier', orderCtrl.getPublicTracking);

router.use(authenticate);
router.post('/shipping/rates', orderCtrl.getShippingRates);
router.post('/', orderCtrl.placeOrder);
router.get('/', orderCtrl.getUserOrders);
router.get('/:id', orderCtrl.getOrderDetails);
router.get('/:id/invoice', orderCtrl.downloadInvoice);
router.put('/:id/cancel', orderCtrl.cancelOrder);
router.post('/:id/shippo/sync-tracking', orderCtrl.syncShippoTracking);

// Admin
router.put('/:id/status', adminOnly, orderCtrl.updateOrderStatus);
router.post('/:id/shippo/label', adminOnly, orderCtrl.createShippoLabel);
router.get('/:id/packing-slip', adminOnly, orderCtrl.downloadPackingSlip);
router.get('/:id/shipping-label', adminOnly, orderCtrl.downloadShippingLabel);

module.exports = router;
