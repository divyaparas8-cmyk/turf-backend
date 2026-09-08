const express = require('express');
const { getRefundRequests, createRefundRequest, updateRefundStatus, updateRefundRequest, deleteRefundRequest } = require('./refunds.controller');
const { verifyToken, authorizeRoles } = require('../../middleware/auth.middleware');

const router = express.Router();
router.use(verifyToken, authorizeRoles(['STAFF', 'OWNER', 'SUPER_ADMIN']));

router.get('/', getRefundRequests);
router.post('/', createRefundRequest);
router.put('/:id', updateRefundRequest);
router.delete('/:id', deleteRefundRequest);
router.patch('/:id/status', authorizeRoles(['OWNER', 'SUPER_ADMIN']), updateRefundStatus);

module.exports = router;
