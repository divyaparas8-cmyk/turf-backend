const express = require('express');
const {
    getDashboardSummary,
    getRevenueGrowth,
    getCommissionGrowth,
    getTopBranches,
    getRecentActivities,
    getDashboardHistory
} = require('./dashboard.controller');
const { verifyToken, authorizeRoles } = require('../../middleware/auth.middleware');

const router = express.Router();
router.use(verifyToken, authorizeRoles(['OWNER', 'STAFF', 'SUPER_ADMIN']));

router.get('/summary', getDashboardSummary);
router.get('/history', getDashboardHistory);
router.get('/revenue-growth', getRevenueGrowth);
router.get('/commission-growth', getCommissionGrowth);
router.get('/top-branches', getTopBranches);
router.get('/recent-activities', getRecentActivities);

module.exports = router;
