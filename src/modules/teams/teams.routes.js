const express = require('express');
const {
    getTeams,
    getMyTeams,
    createTeam,
    joinTeam,
    getJoinRequests,
    approveJoinRequest,
    rejectJoinRequest
} = require('./teams.controller');
const { verifyToken, optionalToken } = require('../../middleware/auth.middleware');

const router = express.Router();

// Public / Discovery listing (Optional Token to attach userStatus if logged in)
router.get('/', optionalToken, getTeams);

// Authenticated Customer Team Routes
router.get('/my-teams', verifyToken, getMyTeams);
router.post('/', verifyToken, createTeam);
router.post('/:id/join', verifyToken, joinTeam);

// Captain Join Request Management Routes
router.get('/:id/join-requests', verifyToken, getJoinRequests);
router.post('/:teamId/join-requests/:requestId/approve', verifyToken, approveJoinRequest);
router.post('/:teamId/join-requests/:requestId/reject', verifyToken, rejectJoinRequest);

module.exports = router;
