// Public marketplace routes — no auth middleware.
// All endpoints under /api/v1/public/* are intentionally unauthenticated.

const express = require('express');
const router = express.Router();
const { getPublicBranches, getPublicBranchById } = require('./public.controller');

// GET /api/v1/public/branches — all ACTIVE branches, no token required
router.get('/branches', getPublicBranches);

// GET /api/v1/public/branches/:id — single ACTIVE branch, no token required
router.get('/branches/:id', getPublicBranchById);

module.exports = router;
