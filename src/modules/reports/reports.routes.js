const express = require('express');
const {
    getOverviewReport,
    getRevenueReport,
    getBookingReport,
    getUserAnalyticsReport,
    getSubscriptionAnalyticsReport,
    getTopOwnersReport,
    getTopBranchesReport,
    getSportsReport,
    getOccupancyHeatmap,
    getDailyReport,
    getMonthlyReport,
    exportReport
} = require('./reports.controller');

const { verifyToken, authorizeRoles } = require('../../middleware/auth.middleware');

const router = express.Router();

router.use(verifyToken);

// Owner-visible (scoped to their own branches inside the controller) as well as Super Admin
router.get('/sports', authorizeRoles(['SUPER_ADMIN', 'OWNER']), getSportsReport);
router.get('/occupancy-heatmap', authorizeRoles(['SUPER_ADMIN', 'OWNER']), getOccupancyHeatmap);
router.get('/daily', authorizeRoles(['SUPER_ADMIN', 'OWNER']), getDailyReport);
router.get('/monthly', authorizeRoles(['SUPER_ADMIN', 'OWNER']), getMonthlyReport);

// Platform-wide, Super Admin only
router.get('/overview', authorizeRoles(['SUPER_ADMIN']), getOverviewReport);
router.get('/revenue', authorizeRoles(['SUPER_ADMIN']), getRevenueReport);
router.get('/bookings', authorizeRoles(['SUPER_ADMIN']), getBookingReport);
router.get('/users', authorizeRoles(['SUPER_ADMIN']), getUserAnalyticsReport);
router.get('/subscriptions', authorizeRoles(['SUPER_ADMIN']), getSubscriptionAnalyticsReport);
router.get('/top-owners', authorizeRoles(['SUPER_ADMIN']), getTopOwnersReport);
router.get('/top-branches', authorizeRoles(['SUPER_ADMIN']), getTopBranchesReport);
router.get('/export', authorizeRoles(['SUPER_ADMIN']), exportReport);

module.exports = router;
