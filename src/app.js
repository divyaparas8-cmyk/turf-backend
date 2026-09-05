const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Standard middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Request Logger middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Static folder for uploaded files/images
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Auth Routes registration
const authRouter = require('./modules/auth/auth.routes');
app.use('/api/v1/auth', authRouter);

// Public Marketplace Routes (no authentication required)
const publicRouter = require('./modules/public/public.routes');
app.use('/api/v1/public', publicRouter);

// Sports Routes registration
const sportsRouter = require('./modules/sports/sports.routes');
app.use('/api/v1/sports', sportsRouter);

// Slots Routes registration
const slotsRouter = require('./modules/slots/slots.routes');
app.use('/api/v1/slots', slotsRouter);

// Bookings Routes registration
const bookingsRouter = require('./modules/bookings/bookings.routes');
app.use('/api/v1/bookings', bookingsRouter);

// Billing Routes registration
const billingRouter = require('./modules/billing/billing.routes');
app.use('/api/v1/billing', billingRouter);

// Tournaments Routes registration
const tournamentsRouter = require('./modules/tournaments/tournaments.routes');
app.use('/api/v1/tournaments', tournamentsRouter);

// Wallet Routes registration
const walletRouter = require('./modules/wallet/wallet.routes');
app.use('/api/v1/wallet', walletRouter);

// Inventory Routes registration
const inventoryRouter = require('./modules/inventory/inventory.routes');
app.use('/api/v1/inventory', inventoryRouter);

// Reports Routes registration
const reportsRouter = require('./modules/reports/reports.routes');
app.use('/api/v1/reports', reportsRouter);

// Dashboard Routes registration
const dashboardRouter = require('./modules/dashboard/dashboard.routes');
app.use('/api/v1/dashboard', dashboardRouter);

// Settings Routes registration
const settingsRouter = require('./modules/settings/settings.routes');
app.use('/api/v1/settings', settingsRouter);

// Branches Routes registration
const branchesRouter = require('./modules/branches/branches.routes');
app.use('/api/v1/branches', branchesRouter);

// Holidays Routes registration
const holidaysRouter = require('./modules/holidays/holidays.routes');
app.use('/api/v1/holidays', holidaysRouter);

// Turfs Routes registration
const turfsRouter = require('./modules/turfs/turfs.routes');
app.use('/api/v1/turfs', turfsRouter);

// Owners Routes registration
const ownersRouter = require('./modules/owners/owners.routes');
app.use('/api/v1/owners', ownersRouter);

// Discount Offers Routes registration
const discountOffersRouter = require('./modules/discounts/discounts.routes');
app.use('/api/v1/discount-offers', discountOffersRouter);
app.use('/api/v1/discounts', discountOffersRouter);

// Upload Routes registration (Photos & Videos)
const uploadRouter = require('./modules/upload/upload.routes');
app.use('/api/v1/upload', uploadRouter);

// Ads / Campaigns Routes registration
const adsRouter = require('./modules/ads/ads.routes');
app.use('/api/v1/ads', adsRouter);

// Subscriptions Routes registration
const subscriptionsRouter = require('./modules/subscriptions/subscriptions.routes');
app.use('/api/v1/subscriptions', subscriptionsRouter);

// Mobile Realtime Sync Routes registration
const mobileSyncRouter = require('./modules/mobile/mobileSync.routes');
app.use('/api/v1/mobile-sync', mobileSyncRouter);

// Team Match Payments Engine Routes registration
const matchPaymentRouter = require('./modules/bookings/matchPayment.routes');
app.use('/api/v1/match-payments', matchPaymentRouter);

// Corporate & Bulk Booking Proposals Routes registration
const corporateRouter = require('./modules/corporate/corporate.routes');
app.use('/api/v1/corporate', corporateRouter);

// CRM Leads Routes registration
const crmRouter = require('./modules/crm/crm.routes');
app.use('/api/v1/crm', crmRouter);

// Disputes Routes registration
const disputesRouter = require('./modules/disputes/disputes.routes');
app.use('/api/v1/disputes', disputesRouter);

// Maintenance Routes registration
const maintenanceRouter = require('./modules/maintenance/maintenance.routes');
app.use('/api/v1/maintenance', maintenanceRouter);

// Staff Routes registration
const staffRouter = require('./modules/staff/staff.routes');
app.use('/api/v1/staff', staffRouter);

// Teams Routes registration
const teamsRouter = require('./modules/teams/teams.routes');
app.use('/api/v1/teams', teamsRouter);

// Umpire Routes registration
const umpireRouter = require('./modules/umpire/umpire.routes');
app.use('/api/v1/umpire', umpireRouter);

// Refund Requests Routes registration
const refundsRouter = require('./modules/refunds/refunds.routes');
app.use('/api/v1/refunds', refundsRouter);

// Start Background Expiry & Reconciliation Worker
const MatchExpiryService = require('./services/matchExpiry.service');
const MatchReconciliationService = require('./services/matchReconciliation.service');

setInterval(async () => {
    try {
        await MatchExpiryService.runExpiryTasks();
        await MatchReconciliationService.reconcilePendingPayments();
        await MatchReconciliationService.reconcilePendingRefunds();
    } catch (e) {
        console.error('[BackgroundWorker] Error:', e.message);
    }
}, 60000); // Runs every 60 seconds

// Basic Root Health Check Route
app.get('/api/v1/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'SportMatrix API server is healthy and running.'
    });
});

// Global 404 Route handler
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        message: `Endpoint ${req.method} ${req.originalUrl} not found.`
    });
});

// Global 500 Error handler
app.use((err, req, res, next) => {
    console.error('Unhandled Server Error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error'
    });
});

module.exports = app;
