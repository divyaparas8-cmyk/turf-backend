const express = require('express');
const { getTickets, createTicket, updateTicketStatus, deleteTicket } = require('./maintenance.controller');
const { verifyToken, authorizeRoles } = require('../../middleware/auth.middleware');

const router = express.Router();
router.use(verifyToken, authorizeRoles(['OWNER', 'STAFF', 'SUPER_ADMIN']));

router.get('/', getTickets);
router.get('/tickets', getTickets);
router.post('/tickets', createTicket);
router.put('/tickets/:id', updateTicketStatus);
router.delete('/tickets/:id', deleteTicket);

module.exports = router;
