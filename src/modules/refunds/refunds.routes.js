const express = require('express');
const { getRefundRequests, createRefundRequest, updateRefundStatus } = require('./refunds.controller');
const { verifyToken, authorizeRoles } = require('../../middleware/auth.middleware');

const router = express.Router();
router.use(verifyToken, authorizeRoles(['STAFF', 'OWNER', 'SUPER_ADMIN']));

router.get('/', getRefundRequests);
router.post('/', createRefundRequest);
router.patch('/:id/status', authorizeRoles(['OWNER', 'SUPER_ADMIN']), updateRefundStatus);

module.exports = router;
