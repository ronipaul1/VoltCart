const express = require('express');
const router = express.Router();
const productCtrl = require('../controllers/product.controller');
const { authenticate, adminOnly } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

// Admin import endpoints
router.get('/import/preview', authenticate, adminOnly, productCtrl.previewDummyJsonImport);
router.post('/import', authenticate, adminOnly, productCtrl.executeDummyJsonImport);

router.get('/', productCtrl.getProducts);
router.get('/:slug', productCtrl.getProductBySlug);

// Admin only
router.post('/', authenticate, adminOnly, upload.array('images', 5), productCtrl.createProduct);
router.put('/:id', authenticate, adminOnly, upload.array('images', 5), productCtrl.updateProduct);
router.delete('/:id/images/:imageId', authenticate, adminOnly, productCtrl.deleteProductImage);
router.delete('/:id', authenticate, adminOnly, productCtrl.deleteProduct);

module.exports = router;
