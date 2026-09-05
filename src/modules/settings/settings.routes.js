const express = require('express');
const {
    getCommissionSettings,
    updateCommissionSettings,
    getPaymentGatewaySettings,
    updatePaymentGatewaySettings,
    getContactSettings,
    updateContactSettings
} = require('./settings.controller');
const { verifyToken, authorizeRoles } = require('../../middleware/auth.middleware');

const router = express.Router();

// Public route for Website Contact Page & Footer
router.get('/contact-info', getContactSettings);

// Super Admin protected routes
router.use(verifyToken, authorizeRoles(['SUPER_ADMIN']));

router.put('/contact-info', updateContactSettings);
router.get('/commission', getCommissionSettings);
router.put('/commission', updateCommissionSettings);

router.get('/payment-gateway', getPaymentGatewaySettings);
router.put('/payment-gateway', updatePaymentGatewaySettings);

module.exports = router;
