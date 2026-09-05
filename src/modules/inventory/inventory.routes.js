const express = require('express');
const {
    getInventory,
    createInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    restockItem
} = require('./inventory.controller');

const { verifyToken, authorizeRoles } = require('../../middleware/auth.middleware');

const router = express.Router();
const requireOwnerOrAdmin = [verifyToken, authorizeRoles(['OWNER', 'STAFF', 'SUPER_ADMIN'])];

router.get('/', ...requireOwnerOrAdmin, getInventory);
router.post('/', ...requireOwnerOrAdmin, createInventoryItem);
router.put('/:id', ...requireOwnerOrAdmin, updateInventoryItem);
router.delete('/:id', ...requireOwnerOrAdmin, deleteInventoryItem);
router.post('/:id/restock', ...requireOwnerOrAdmin, restockItem);

module.exports = router;
