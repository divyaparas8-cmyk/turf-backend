const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../../config/prisma');
const { sendForgotPasswordEmail } = require('../../services/email.service');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'sportmatrix_jwt_secret_key_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

const genId = (prefix) => `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

const publicUser = (u) => ({
    id: u.id,
    _id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    mobile: u.mobile || '',
    alternateMobile: u.alternateMobile || '',
    avatar: u.avatar || ''
});

/**
 * Register a new customer account. Public self-registration is always CUSTOMER --
 * OWNER/STAFF/UMPIRE/SUPER_ADMIN accounts are created via their own admin-driven flows
 * (owners.controller.js, staff.controller.js) so a caller can never grant themselves
 * elevated privileges through this endpoint.
 */
const register = async (req, res) => {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ success: false, message: 'Name, email, and password are required fields.' });
    }
    if (password.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    try {
        const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (existing) {
            return res.status(409).json({ success: false, message: 'A user with this email address already exists.' });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                id: genId('usr'),
                name: name.trim(),
                email: normalizedEmail,
                passwordHash,
                role: 'CUSTOMER',
                mobile: phone || null,
                wallet: { create: { id: genId('wal'), balance: 0 } }
            }
        });

        return res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: { userId: user.id, name: user.name, email: user.email, role: user.role }
        });
    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error during registration.' });
    }
};

/**
 * Login. Single source of truth is the `users` table -- Owner/Staff/Umpire profiles
 * are linked extensions of a User row, not separate credential stores.
 */
const login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    try {
        const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        const userStatus = (user.status || '').toUpperCase();
        if (userStatus === 'INACTIVE' || userStatus === 'SUSPENDED' || userStatus === 'DISABLED') {
            return res.status(403).json({
                success: false,
                message: 'Your account has been deactivated / suspended by management. Access denied.'
            });
        }

        if (user.role === 'STAFF' || user.role === 'UMPIRE') {
            const staffMember = await prisma.staffMember.findFirst({ where: { userId: user.id } });
            if (staffMember && (staffMember.status === 'Inactive' || staffMember.status === 'INACTIVE')) {
                return res.status(403).json({
                    success: false,
                    message: 'Your staff/umpire account has been deactivated by the turf owner. Access denied.'
                });
            }
            const umpireProf = await prisma.umpireProfile.findUnique({ where: { userId: user.id } });
            if (umpireProf && (umpireProf.status === 'SUSPENDED' || umpireProf.status === 'INACTIVE')) {
                return res.status(403).json({
                    success: false,
                    message: 'Your umpire account has been deactivated by the turf owner. Access denied.'
                });
            }
        }

        if (user.role === 'OWNER' || user.role === 'ADMIN') {
            const ownerProfile = await prisma.owner.findUnique({ where: { userId: user.id } });
            const branches = await prisma.branch.findMany({
                where: {
                    OR: [
                        { ownerUserId: user.id },
                        { ownerId: ownerProfile ? ownerProfile.id : 'NO_MATCH' }
                    ]
                }
            });
            if (branches.length > 0) {
                const hasActiveBranch = branches.some(b => b.status === 'ACTIVE');
                if (!hasActiveBranch) {
                    return res.status(403).json({
                        success: false,
                        message: 'Your Turf Owner account / branch has been deactivated by Super Admin. Access denied.'
                    });
                }
            }
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        const token = jwt.sign(
            { id: user.id, name: user.name, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        return res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            user: publicUser(user)
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error during login.' });
    }
};

const logout = async (req, res) => {
    return res.status(200).json({ success: true, message: 'Logout successful' });
};

/**
 * Get current user profile. Strictly scoped to the authenticated user's own id --
 * never falls back to another account.
 */
const getProfile = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User profile not found.' });
        }

        return res.status(200).json({
            success: true,
            data: {
                id: user.id,
                _id: user.id,
                fullName: user.name,
                name: user.name,
                email: user.email,
                role: user.role,
                mobile: user.mobile || '',
                alternateMobile: user.alternateMobile || '',
                profileImage: user.avatar || ''
            }
        });
    } catch (error) {
        console.error('Fetch profile error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error fetching profile.' });
    }
};

/**
 * Update current user profile. Scoped strictly to req.user.id. If the user is also
 * an Owner, keep the linked Owner profile's contact fields in sync.
 */
const updateProfile = async (req, res) => {
    const { fullName, name, email, mobile, alternateMobile, profileImage } = req.body;
    const displayName = (fullName || name || '').trim();

    if (!displayName) {
        return res.status(400).json({ success: false, message: 'Name is required.' });
    }

    try {
        const updated = await prisma.user.update({
            where: { id: req.user.id },
            data: {
                name: displayName,
                mobile: mobile ? mobile.trim() : null,
                alternateMobile: alternateMobile ? alternateMobile.trim() : null,
                avatar: profileImage || null
            }
        });

        try {
            await prisma.owner.updateMany({
                where: { userId: req.user.id },
                data: {
                    fullName: displayName,
                    mobile: mobile ? mobile.trim() : undefined,
                    alternateMobile: alternateMobile ? alternateMobile.trim() : undefined,
                    profileImage: profileImage || undefined
                }
            });
        } catch (e) {
            console.warn('Sync owner profile update note:', e.message);
        }

        return res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                id: updated.id,
                _id: updated.id,
                name: updated.name,
                fullName: updated.name,
                email: updated.email,
                role: updated.role,
                mobile: updated.mobile,
                alternateMobile: updated.alternateMobile || '',
                profileImage: updated.avatar
            }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        return res.status(500).json({ success: false, message: 'Error updating profile: ' + error.message });
    }
};

/**
 * Change current user's password. Requires current password verification.
 */
const changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' });
    }
    if (!currentPassword) {
        return res.status(400).json({ success: false, message: 'Current password is required.' });
    }

    try {
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
        }

        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({ where: { id: user.id }, data: { passwordHash: newPasswordHash } });

        return res.status(200).json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        return res.status(500).json({ success: false, message: 'Error changing password: ' + error.message });
    }
};

/**
 * Get all users across the platform (Super Admin User Management).
 */
const getAllUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            include: { ownerProfile: true },
            orderBy: { createdAt: 'desc' }
        });

        const roleLabel = (role) => {
            if (role === 'SUPER_ADMIN') return 'Super Admin';
            if (role === 'OWNER' || role === 'ADMIN') return 'Admin';
            if (role === 'STAFF') return 'Staff';
            if (role === 'UMPIRE') return 'Umpire';
            return 'Customer';
        };

        const mapped = users.map((u) => ({
            id: u.id,
            name: u.ownerProfile?.businessName || u.name,
            email: u.email,
            role: roleLabel(u.role),
            rawRole: u.role,
            mobile: u.mobile || 'N/A',
            status: u.status === 'ACTIVE' ? 'Active' : 'Suspended',
            joined: u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : ''
        }));

        return res.status(200).json({ success: true, count: mapped.length, data: mapped });
    } catch (error) {
        console.error('Fetch all users error:', error);
        return res.status(500).json({ success: false, message: 'Error fetching users: ' + error.message });
    }
};

/**
 * Toggle or update user status (ACTIVE / SUSPENDED / INACTIVE).
 */
const updateUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const normalizedStatus = ['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes((status || '').toUpperCase())
            ? status.toUpperCase()
            : null;

        if (!normalizedStatus) {
            return res.status(400).json({ success: false, message: 'Valid status is required (ACTIVE, INACTIVE, SUSPENDED).' });
        }

        const user = await prisma.user.findUnique({ where: { id } });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // 1. Update User status
        await prisma.user.update({ where: { id }, data: { status: normalizedStatus } });

        // 2. Find and update linked Owner profile if exists
        const owner = await prisma.owner.findFirst({
            where: { OR: [{ userId: id }, { email: user.email }] }
        });

        if (owner) {
            await prisma.owner.update({
                where: { id: owner.id },
                data: { status: normalizedStatus, updatedBy: req.user?.id || 'SYSTEM' }
            });

            // 3. Update all linked Branches for this owner
            await prisma.branch.updateMany({
                where: { OR: [{ ownerId: owner.id }, { ownerUserId: id }] },
                data: { status: normalizedStatus }
            });
        } else {
            await prisma.branch.updateMany({
                where: { ownerUserId: id },
                data: { status: normalizedStatus }
            });
        }

        // 4. Broadcast real-time Socket.IO event
        try {
            const { getIo } = require('../../realtime/socket');
            const io = getIo();
            if (io) {
                io.emit('status_updated', { userId: id, ownerId: owner?.id, status: normalizedStatus });
                io.emit('global_data_changed', { type: 'STATUS_CHANGE', userId: id });
            }
        } catch (e) {
            console.error('Socket emit error in updateUserStatus:', e);
        }

        return res.status(200).json({
            success: true,
            message: `User, Owner, and linked Turf status updated to ${normalizedStatus}`,
            data: { id, status: normalizedStatus === 'ACTIVE' ? 'Active' : (normalizedStatus === 'SUSPENDED' ? 'Suspended' : 'Inactive') }
        });
    } catch (error) {
        console.error('Update user status error:', error);
        return res.status(500).json({ success: false, message: 'Error updating user status: ' + error.message });
    }
};

/**
 * Admin reset password for any user (Super Admin tool).
 */
const adminResetUserPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;

        if (!newPassword || newPassword.trim().length < 4) {
            return res.status(400).json({ success: false, message: 'Password must be at least 4 characters long.' });
        }

        const newPasswordHash = await bcrypt.hash(newPassword.trim(), 10);
        const updated = await prisma.user.update({
            where: { id },
            data: { passwordHash: newPasswordHash }
        }).catch(() => null);

        if (!updated) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        return res.status(200).json({ success: true, message: `Password for ${updated.name || updated.email} updated successfully.` });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error resetting user password: ' + error.message });
    }
};

/**
 * Admin hard delete user (Super Admin tool).
 * Cleanly deletes user and disassociates linked owned branches if any.
 */
const deleteUserByAdmin = async (req, res) => {
    try {
        const { id } = req.params;

        if (req.user?.id === id) {
            return res.status(400).json({ success: false, message: 'Super Admin cannot delete their own active account.' });
        }

        const user = await prisma.user.findUnique({ where: { id } });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        // Unlink associated branches if owner
        await prisma.branch.updateMany({
            where: { ownerUserId: id },
            data: { ownerUserId: null }
        }).catch(() => {});

        // Delete user record
        await prisma.user.delete({ where: { id } });

        return res.status(200).json({
            success: true,
            message: `User ${user.name || user.email} deleted successfully.`
        });
    } catch (error) {
        console.error('Delete user error:', error);
        return res.status(500).json({ success: false, message: 'Error deleting user: ' + error.message });
    }
};

/**
 * Public Forgot Password request handler -- generates temporary password and dispatches email via Brevo
 */
const forgotPassword = async (req, res) => {
    const { email } = req.body;
    if (!email || !email.trim()) {
        return res.status(400).json({ success: false, message: 'Email address is required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    try {
        const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (!user) {
            return res.status(200).json({
                success: true,
                message: 'If an account exists with this email address, password reset instructions have been sent.'
            });
        }

        const temporaryPassword = `Pass@${Math.floor(100000 + Math.random() * 900000)}`;
        const passwordHash = await bcrypt.hash(temporaryPassword, 10);

        await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash }
        });

        await sendForgotPasswordEmail({
            recipientEmail: user.email,
            recipientName: user.name,
            temporaryPassword
        });

        return res.status(200).json({
            success: true,
            message: `Password reset instructions and new temporary password sent to ${user.email}.`
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        return res.status(500).json({ success: false, message: 'Failed to process forgot password request.' });
    }
};

module.exports = {
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
};
