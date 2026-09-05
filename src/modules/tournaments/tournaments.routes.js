const express = require('express');
const {
    getTournaments,
    getTournamentById,
    createTournament,
    updateTournament,
    approveTournament,
    rejectTournament,
    suspendTournament,
    deleteTournament,
    getCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    registerTeam,
    createRazorpayOrder,
    verifyRazorpayPayment,
    getTeams,
    updateTeamStatus,
    generateFixtures,
    getFixtures,
    updateMatchScore,
    getLeaderboard,
    getGlobalLeaderboard,
    getSponsors,
    createSponsor,
    updateSponsor,
    deleteSponsor,
    getTournamentPayments,
    getTournamentReports,
    getSettings,
    updateSettings,
    getAllTournamentMatches,
    saveLiveMatchScore,
    getLiveMatches
} = require('./tournaments.controller');

const { verifyToken, optionalToken, authorizeRoles } = require('../../middleware/auth.middleware');

const router = express.Router();

// Publicly readable & Owner-scoped endpoints
router.get('/matches/live', getLiveMatches);         // 🔴 Public live scorecard feed
router.get('/matches/all', optionalToken, getAllTournamentMatches);
router.post('/matches/save-score', optionalToken, saveLiveMatchScore);
router.get('/leaderboard/global', optionalToken, getGlobalLeaderboard);
router.get('/', optionalToken, getTournaments);
router.get('/categories', optionalToken, getCategories);
router.get('/sponsors', optionalToken, getSponsors);
router.get('/payments', optionalToken, getTournamentPayments);
router.get('/reports', optionalToken, getTournamentReports);
router.get('/settings', optionalToken, getSettings);
router.get('/teams', optionalToken, getTeams);
router.get('/:id', optionalToken, getTournamentById);
router.get('/:id/fixtures', optionalToken, getFixtures);
router.get('/:id/leaderboard', optionalToken, getLeaderboard);
router.post('/:id/register', optionalToken, registerTeam);
router.post('/:id/create-razorpay-order', optionalToken, createRazorpayOrder);
router.post('/:id/verify-razorpay-payment', optionalToken, verifyRazorpayPayment);

// Staff & Owner Creation / Editing Endpoints
router.post('/', verifyToken, createTournament);
router.put('/:id', verifyToken, authorizeRoles(['OWNER', 'STAFF', 'SUPER_ADMIN']), updateTournament);

// Owner-Only Approval & Control Flow Endpoints
router.post('/:id/approve', verifyToken, authorizeRoles(['OWNER', 'SUPER_ADMIN']), approveTournament);
router.post('/:id/reject', verifyToken, authorizeRoles(['OWNER', 'SUPER_ADMIN']), rejectTournament);
router.post('/:id/suspend', verifyToken, authorizeRoles(['OWNER', 'SUPER_ADMIN']), suspendTournament);
router.delete('/:id', verifyToken, authorizeRoles(['OWNER', 'SUPER_ADMIN']), deleteTournament);

// Category Management (Owner)
router.post('/categories', verifyToken, authorizeRoles(['OWNER', 'SUPER_ADMIN']), createCategory);
router.put('/categories/:id', verifyToken, authorizeRoles(['OWNER', 'SUPER_ADMIN']), updateCategory);
router.delete('/categories/:id', verifyToken, authorizeRoles(['OWNER', 'SUPER_ADMIN']), deleteCategory);

// Sponsor Management (Owner)
router.post('/sponsors', verifyToken, authorizeRoles(['OWNER', 'SUPER_ADMIN']), createSponsor);
router.put('/sponsors/:id', verifyToken, authorizeRoles(['OWNER', 'SUPER_ADMIN']), updateSponsor);
router.delete('/sponsors/:id', verifyToken, authorizeRoles(['OWNER', 'SUPER_ADMIN']), deleteSponsor);

// Team Registration Management (Staff & Owner)
router.put('/teams/:teamId/status', verifyToken, authorizeRoles(['OWNER', 'SUPER_ADMIN', 'STAFF']), updateTeamStatus);

// Fixture Generation & Match Score Updates (Staff & Owner)
router.post('/:id/generate-fixtures', verifyToken, authorizeRoles(['OWNER', 'SUPER_ADMIN', 'STAFF']), generateFixtures);
router.put('/matches/:matchId/score', verifyToken, authorizeRoles(['OWNER', 'SUPER_ADMIN', 'STAFF']), updateMatchScore);

// Settings Update (Owner)
router.put('/settings', verifyToken, authorizeRoles(['OWNER', 'SUPER_ADMIN']), updateSettings);

module.exports = router;
