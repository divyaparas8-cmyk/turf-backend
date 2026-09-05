const express = require('express');
const {
    createBooking,
    cancelBooking,
    getUpcomingBookings,
    getBookingHistory,
    getBookingLedgerSummary,
    updateBookingStatus,
    updateCheckInStatus,
    createGuestBooking,
    lookupGuestBookingsByPhone
} = require('./bookings.controller');

const { verifyToken, optionalToken, authorizeRoles } = require('../../middleware/auth.middleware');

const router = express.Router();

// Guest booking routes (Public)
router.post('/guest', createGuestBooking);
router.get('/guest-lookup', lookupGuestBookingsByPhone);

router.get('/summary', verifyToken, authorizeRoles(['OWNER', 'STAFF', 'SUPER_ADMIN']), getBookingLedgerSummary);
router.put('/:id/status', verifyToken, authorizeRoles(['OWNER', 'STAFF', 'SUPER_ADMIN']), updateBookingStatus);
router.put('/:id/check-in', verifyToken, authorizeRoles(['OWNER', 'STAFF', 'SUPER_ADMIN']), updateCheckInStatus);

router.post('/', optionalToken, createBooking);
router.post('/:id/cancel', verifyToken, cancelBooking);
router.get('/upcoming', verifyToken, getUpcomingBookings);
router.get('/history', verifyToken, getBookingHistory);
router.get('/', verifyToken, getBookingHistory);

module.exports = router;

