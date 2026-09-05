const express = require('express');
const { 
    register, 
    login, 
    logout, 
    getProfile, 
    updateProfile, 
    changePassword,
    forgotPassword,
    getAllUsers,
    updateUserStatus,
    adminResetUserPassword,
    deleteUserByAdmin
} = require('./auth.controller');
const { verifyToken, authorizeRoles } = require('../../middleware/auth.middleware');

const router = express.Router();

// Public Routes
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/forgot-password', forgotPassword);

// Super Admin User Management Routes
router.get('/users', verifyToken, authorizeRoles(['SUPER_ADMIN']), getAllUsers);
router.patch('/users/:id/status', verifyToken, authorizeRoles(['SUPER_ADMIN']), updateUserStatus);
router.post('/users/:id/reset-password', verifyToken, authorizeRoles(['SUPER_ADMIN']), adminResetUserPassword);
router.delete('/users/:id', verifyToken, authorizeRoles(['SUPER_ADMIN']), deleteUserByAdmin);

// Protected Profile Routes
router.get('/me', verifyToken, getProfile);
router.put('/profile', verifyToken, updateProfile);
router.post('/change-password', verifyToken, changePassword);

module.exports = router;

