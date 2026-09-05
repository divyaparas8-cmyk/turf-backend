const express = require('express');
const {
    getSlots,
    getSlotById,
    createSlot,
    updateSlot,
    updateSlotStatus,
    deleteSlot
} = require('./slots.controller');

const { verifyToken, authorizeRoles } = require('../../middleware/auth.middleware');

const router = express.Router();

// Public routes (Customers need to query slots to see availability)
router.get('/', getSlots);
router.get('/:id', getSlotById);

// Owner / Staff / Super Admin scheduling config routes
router.post('/', verifyToken, authorizeRoles(['OWNER', 'STAFF', 'SUPER_ADMIN']), createSlot);
router.put('/:id', verifyToken, authorizeRoles(['OWNER', 'STAFF', 'SUPER_ADMIN']), updateSlot);
router.patch('/:id/status', verifyToken, authorizeRoles(['OWNER', 'STAFF', 'SUPER_ADMIN']), updateSlotStatus);
router.delete('/:id', verifyToken, authorizeRoles(['OWNER', 'SUPER_ADMIN']), deleteSlot);

module.exports = router;
