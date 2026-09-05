const express = require('express');
const { getStaff, createStaff, updateStaff, deleteStaff } = require('./staff.controller');
const { verifyToken, authorizeRoles } = require('../../middleware/auth.middleware');

const router = express.Router();
router.use(verifyToken, authorizeRoles(['OWNER', 'STAFF', 'SUPER_ADMIN']));

router.get('/', getStaff);
router.post('/', authorizeRoles(['OWNER', 'SUPER_ADMIN']), createStaff);
router.put('/:id', authorizeRoles(['OWNER', 'SUPER_ADMIN']), updateStaff);
router.delete('/:id', authorizeRoles(['OWNER', 'SUPER_ADMIN']), deleteStaff);

module.exports = router;
