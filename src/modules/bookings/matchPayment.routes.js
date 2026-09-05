/**
 * MatchPaymentRoutes
 * Express router mapping all Team Match Payment Engine endpoints.
 */

const express = require('express');
const router = express.Router();
const MatchPaymentController = require('./matchPayment.controller');
const { verifyToken, optionalToken, authorizeRoles } = require('../../middleware/auth.middleware');

// Dare Challenges Database API (Strictly backed by DB tables)
router.get('/open-dares', MatchPaymentController.getOpenDares);
router.post('/open-dares', MatchPaymentController.createDareChallenge);
router.delete('/open-dares/:id', MatchPaymentController.deleteDareChallenge);

// Match Booking & Slot Holds -- optionalToken allows guests and logged-in users to book
router.post('/create', optionalToken, MatchPaymentController.createMatchBooking);
router.post('/verify', optionalToken, MatchPaymentController.verifyPayment);


// Invites & Share Payments -- invite lookup is token-gated (public), paying requires auth
router.get('/invite/:token', MatchPaymentController.getInviteDetails);
router.post('/invite/:token/pay', verifyToken, MatchPaymentController.payInviteShare);
router.post('/invite/:token/decline', MatchPaymentController.declineInvite);

// Scores & Balances
router.post('/:id/submit-score', verifyToken, MatchPaymentController.submitMatchScore);
router.post('/:id/pay-balance', verifyToken, MatchPaymentController.payBalance);
router.post('/:id/dispute', verifyToken, MatchPaymentController.raiseMatchDispute);

// Customer-scoped match history
router.get('/my-matches', verifyToken, MatchPaymentController.getMyMatches);

// Cancellation Policy Quotes
router.get('/:id/cancellation-quote', MatchPaymentController.getCancellationQuote);

// Commission-split settlement (Phase 1 payment gateway abstraction) -- :id here is a MatchPayment id
router.get('/pending-settlements', verifyToken, authorizeRoles(['OWNER', 'SUPER_ADMIN']), MatchPaymentController.getPendingSettlements);
router.post('/payments/:id/confirm-owner-receipt', verifyToken, authorizeRoles(['OWNER', 'SUPER_ADMIN']), MatchPaymentController.confirmOwnerReceipt);
router.post('/payments/:id/confirm-commission', verifyToken, authorizeRoles(['SUPER_ADMIN']), MatchPaymentController.confirmCommission);

// Admin Match Payment Controls & Dispute Resolution -- Super Admin only
router.get('/admin/overview', verifyToken, authorizeRoles(['SUPER_ADMIN']), MatchPaymentController.getAdminMatchPayments);
router.get('/admin/disputes', verifyToken, authorizeRoles(['SUPER_ADMIN']), MatchPaymentController.getDisputedMatches);
router.post('/admin/resolve-dispute', verifyToken, authorizeRoles(['SUPER_ADMIN']), MatchPaymentController.resolveDispute);

module.exports = router;
