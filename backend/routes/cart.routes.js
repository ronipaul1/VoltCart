const express = require('express');
const router = express.Router();
const cartCtrl = require('../controllers/cart.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);
router.get('/', cartCtrl.getCart);
router.post('/', cartCtrl.addToCart);
router.put('/:id', cartCtrl.updateCartItem);
router.delete('/clear', cartCtrl.clearCart);
router.delete('/:id', cartCtrl.removeCartItem);

module.exports = router;
