const express = require('express');
const {
    getAdvertisements,
    createAdvertisement,
    updateAdvertisement,
    updateAdStatus,
    deleteAdvertisement,
    getCommissions,
    markCommissionPaid,
    getPayments,
    getAdAnalytics,
    getPublicAds,
    recordAdImpression,
    recordAdClick
} = require('./ads.controller');
const { verifyToken, optionalToken, authorizeRoles } = require('../../middleware/auth.middleware');

const router = express.Router();

router.get('/public', getPublicAds);
router.post('/:id/impression', recordAdImpression);
router.post('/:id/click', recordAdClick);

router.get('/commissions', optionalToken, getCommissions);
router.patch('/commissions/:bookingId/pay', verifyToken, markCommissionPaid);
router.get('/analytics', optionalToken, getAdAnalytics);
router.get('/payments', optionalToken, getPayments);

router.get('/', optionalToken, getAdvertisements);
router.post('/', verifyToken, createAdvertisement);
router.put('/:id', verifyToken, updateAdvertisement);
router.patch('/:id/status', verifyToken, updateAdStatus);
router.delete('/:id', verifyToken, deleteAdvertisement);

module.exports = router;
