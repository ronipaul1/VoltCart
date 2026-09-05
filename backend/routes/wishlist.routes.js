const express = require('express');
const router = express.Router();
const cartCtrl = require('../controllers/cart.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);
router.get('/', cartCtrl.getWishlist);
router.post('/toggle', cartCtrl.toggleWishlist);
router.delete('/:id', cartCtrl.removeWishlistItem);

module.exports = router;
