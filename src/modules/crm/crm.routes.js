const express = require('express');
const { getLeads, createLead, deleteLead, broadcastOffer, submitPublicInquiry, convertCorporateProposal, lookupCustomer } = require('./crm.controller');
const { verifyToken, authorizeRoles } = require('../../middleware/auth.middleware');

const router = express.Router();

// Public Route for Website Contact Us Form
router.post('/inquiry', submitPublicInquiry);

// Protected Routes below
router.use(verifyToken, authorizeRoles(['OWNER', 'STAFF', 'SUPER_ADMIN']));

router.get('/leads', getLeads);
router.get('/customer-lookup', lookupCustomer);
router.post('/leads', createLead);
router.delete('/leads/:id', deleteLead);
router.post('/broadcast', broadcastOffer);
router.post('/convert-corporate-booking', convertCorporateProposal);

module.exports = router;

