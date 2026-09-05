const express = require('express');
const {
    getWalletBalance,
    getWalletTransactions,
    topUpWallet,
    refundBooking,
    requestWithdrawal
} = require('./wallet.controller');

const { verifyToken, authorizeRoles } = require('../../middleware/auth.middleware');

const router = express.Router();

router.get('/me', verifyToken, getWalletBalance);
router.get('/balance', verifyToken, getWalletBalance);
router.get('/transactions', verifyToken, getWalletTransactions);
router.post('/topup', verifyToken, topUpWallet);
router.post('/withdraw', verifyToken, requestWithdrawal);

// Booking refunds are limited to Owners & Super-admins
router.post('/refund', verifyToken, authorizeRoles(['OWNER', 'SUPER_ADMIN']), refundBooking);

module.exports = router;
