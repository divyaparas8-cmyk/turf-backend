const express = require('express');
const router = express.Router();
const controller = require('./umpire.controller');
const { verifyToken } = require('../../middleware/auth.middleware');

router.use(verifyToken);

router.get('/profile', controller.getUmpireProfile);
router.put('/profile', controller.updateUmpireProfile);

router.get('/matches', controller.getUmpireMatches);
router.post('/score', controller.updateMatchScore);
router.post('/toss', controller.recordToss);
router.post('/complete', controller.completeMatch);
router.post('/payment-status', controller.updatePaymentStatus);
router.post('/register-ground-match', controller.registerGroundMatch);

module.exports = router;
