const express = require('express');
const {
    getAllPlans,
    getPlanById,
    createPlan,
    updatePlan,
    deletePlan,
    toggleStatus,
    togglePopular,
    purchaseSubscription,
    getSubscriptionPurchases
} = require('./subscriptions.controller');

const {
    validateCreatePlan,
    validateUpdatePlan
} = require('./subscriptions.validation');

const { verifyToken, authorizeRoles } = require('../../middleware/auth.middleware');

const router = express.Router();
const requireAdmin = [verifyToken, authorizeRoles(['SUPER_ADMIN'])];

// List all plans -- public (pricing page)
router.get('/', getAllPlans);

// Purchase a subscription plan -- requires an authenticated owner
router.post('/buy', verifyToken, purchaseSubscription);
router.post('/purchase', verifyToken, purchaseSubscription);

// Get all subscription purchases -- Super Admin only
router.get('/purchases', ...requireAdmin, getSubscriptionPurchases);

// Get single plan by ID -- public
router.get('/:id', getPlanById);

// Plan catalog management -- Super Admin only
router.post('/', ...requireAdmin, validateCreatePlan, createPlan);
router.put('/:id', ...requireAdmin, validateUpdatePlan, updatePlan);
router.delete('/:id', ...requireAdmin, deletePlan);
router.patch('/:id/status', ...requireAdmin, toggleStatus);
router.patch('/:id/popular', ...requireAdmin, togglePopular);

module.exports = router;
