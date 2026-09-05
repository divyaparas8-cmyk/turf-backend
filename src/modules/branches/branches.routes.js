const express = require('express');
const {
    getBranches,
    getBranchById,
    createBranch,
    updateBranch,
    changeBranchStatus,
    deleteBranch,
    getDashboardStats,
    getPayoutAccount,
    upsertPayoutAccount
} = require('./branches.controller');
const { verifyToken, optionalToken, authorizeRoles } = require('../../middleware/auth.middleware');

const router = express.Router();

// Branch management API -- public / owner scoped access
router.get('/stats', optionalToken, getDashboardStats);
router.get('/', optionalToken, getBranches);
router.get('/:id', optionalToken, getBranchById);

router.post('/', createBranch);
router.put('/:id', updateBranch);
router.patch('/:id/status', changeBranchStatus);
router.delete('/:id', deleteBranch);

// Owner payout account (UPI/bank/QR) used by the manual payment gateway provider -- always auth-gated
router.get('/:id/payout-account', verifyToken, authorizeRoles(['OWNER', 'SUPER_ADMIN']), getPayoutAccount);
router.put('/:id/payout-account', verifyToken, authorizeRoles(['OWNER', 'SUPER_ADMIN']), upsertPayoutAccount);

module.exports = router;

