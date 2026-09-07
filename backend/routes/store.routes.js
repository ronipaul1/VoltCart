const express = require('express');
const router = express.Router();
const storeCtrl = require('../controllers/store.controller');

// Public storefront synchronization endpoints
router.get('/state', storeCtrl.getStoreState);
router.post('/sync', storeCtrl.syncStoreState);

module.exports = router;

