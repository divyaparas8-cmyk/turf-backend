const express = require('express');
const { processPayment, posCheckout, getBillHistory, getPaymentStats, getPaymentLogById, createPaymentLog } = require('./billing.controller');
const { verifyToken, authorizeRoles } = require('../../middleware/auth.middleware');

const router = express.Router();
router.use(verifyToken, authorizeRoles(['OWNER', 'STAFF', 'SUPER_ADMIN']));

router.post('/pay', processPayment);
router.post('/pos-checkout', posCheckout);
router.post('/create-log', authorizeRoles(['SUPER_ADMIN']), createPaymentLog);
router.get('/history', getBillHistory);
router.get('/stats', getPaymentStats);
router.get('/history/:id', getPaymentLogById);

module.exports = router;

