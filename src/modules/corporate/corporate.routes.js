const express = require('express');
const router = express.Router();
const corporateController = require('./corporate.controller');
const { verifyToken, authorizeRoles } = require('../../middleware/auth.middleware');

const requireAdmin = [verifyToken, authorizeRoles(['OWNER', 'SUPER_ADMIN'])];

// Public route: Submit corporate booking proposal
router.post('/', corporateController.createCorporateProposal);
router.post('/proposals', corporateController.createCorporateProposal);

// Admin/Owner routes: View, update and manage corporate proposals
router.get('/', ...requireAdmin, corporateController.getAllCorporateProposals);
router.get('/proposals', ...requireAdmin, corporateController.getAllCorporateProposals);
router.get('/proposals/:id', ...requireAdmin, corporateController.getCorporateProposalById);
router.patch('/proposals/:id/status', ...requireAdmin, corporateController.updateProposalStatus);
router.patch('/proposals/:id/quote', ...requireAdmin, corporateController.updateCorporateQuote);
router.delete('/proposals/:id', ...requireAdmin, corporateController.deleteCorporateProposal);

module.exports = router;
