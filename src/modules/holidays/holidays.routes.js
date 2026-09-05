const express = require('express');
const {
    getHolidays,
    createHoliday,
    deleteHoliday
} = require('./holidays.controller');

const { verifyToken, authorizeRoles } = require('../../middleware/auth.middleware');

const router = express.Router();

router.get('/', getHolidays);

// Modifying operations restricted to Owner, Staff, and Super Admin
router.post('/', verifyToken, authorizeRoles(['OWNER', 'STAFF', 'SUPER_ADMIN']), createHoliday);
router.delete('/:id', verifyToken, authorizeRoles(['OWNER', 'SUPER_ADMIN']), deleteHoliday);

module.exports = router;
