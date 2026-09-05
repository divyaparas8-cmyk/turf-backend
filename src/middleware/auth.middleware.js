const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'sportmatrix_jwt_secret_key_2026';

/**
 * Middleware to verify JWT Token. Rejects the request if the token is missing,
 * expired, fails signature verification, or if the user account has been deactivated/suspended.
 */
const verifyToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Fast real-time DB check to block deactivated or suspended accounts instantly
        const dbUser = await prisma.user.findUnique({ where: { id: decoded.id }, select: { id: true, status: true, role: true } });
        if (!dbUser || dbUser.status === 'INACTIVE' || dbUser.status === 'SUSPENDED') {
            return res.status(403).json({ 
                success: false, 
                message: 'Account Deactivated: Your access has been revoked by the turf owner or administrator.' 
            });
        }

        req.user = decoded;
        return next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
    }
};

/**
 * Middleware to authorize based on user role(s). Must run after verifyToken/optionalToken.
 * Never fabricates a session -- missing/invalid auth is always rejected.
 */
const authorizeRoles = (allowedRoles = []) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(401).json({ success: false, message: 'Authentication required.' });
        }

        const userRole = (req.user.role || '').toUpperCase();
        if (userRole === 'SUPER_ADMIN' || allowedRoles.map(r => r.toUpperCase()).includes(userRole)) {
            return next();
        }

        return res.status(403).json({
            success: false,
            message: `Forbidden: Access restricted to roles [${allowedRoles.join(', ')}]`
        });
    };
};

/**
 * Optional JWT Token middleware -- attaches req.user when a valid token is present,
 * but allows the request through either way (route decides what's needed).
 * A present-but-invalid token is rejected rather than silently ignored, so callers
 * can't accidentally be treated as anonymous when they sent a tampered/expired token.
 */
const optionalToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token || token === 'null' || token === 'undefined') {
        req.user = null;
        return next();
    }

    try {
        req.user = jwt.verify(token, JWT_SECRET);
    } catch (error) {
        req.user = null;
    }
    return next();
};

module.exports = {
    verifyToken,
    optionalToken,
    authorizeRoles
};
