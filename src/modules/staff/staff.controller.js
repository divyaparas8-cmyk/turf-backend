const bcrypt = require('bcryptjs');
const prisma = require('../../config/prisma');

const genId = (prefix = 'stf') => `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

const formatStaff = (s) => ({
    id: s.id, _id: s.id, branchId: s.branchId,
    name: s.fullName, fullName: s.fullName, email: s.email, phone: s.phone,
    role: (s.user && s.user.role === 'UMPIRE') ? 'UMPIRE' : s.role,
    shift: s.shiftSlot, shiftSlot: s.shiftSlot, status: s.status,
    userId: s.userId, hasLogin: !!s.userId, createdAt: s.createdAt,
    dutyFee: s.user?.umpireProfile?.dutyFeePerMatch ? Number(s.user.umpireProfile.dutyFeePerMatch) : 300
});

const resolveOwnerBranchIds = async (user) => {
    if (!user || user.role === 'SUPERADMIN' || user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
        const allB = await prisma.branch.findMany({ select: { id: true } });
        return allB.map(b => b.id);
    }
    const ownerProfile = await prisma.owner.findUnique({ where: { userId: user.id } }).catch(() => null);
    const branches = await prisma.branch.findMany({
        where: {
            OR: [
                { ownerUserId: user.id },
                { ownerId: ownerProfile ? ownerProfile.id : 'NO_MATCH' }
            ]
        },
        select: { id: true }
    });
    if (branches.length > 0) return branches.map(b => b.id);
    const fallbackBranches = await prisma.branch.findMany({ select: { id: true } });
    return fallbackBranches.map(b => b.id);
};

const getStaff = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    try {
        const { branchId } = req.query;
        const ownerBranchIds = await resolveOwnerBranchIds(req.user);
        const targetBranchIds = branchId ? [branchId] : ownerBranchIds;
        const where = {};
        if (branchId) where.branchId = branchId;
        else if (req.user.role !== 'SUPER_ADMIN') where.branchId = { in: ownerBranchIds };

        // Ensure all active real user accounts linked to these branches have roster entries
        const branchUsers = await prisma.user.findMany({
            where: {
                staffBranchId: { in: targetBranchIds },
                role: { in: ['STAFF', 'UMPIRE'] },
                status: { notIn: ['SUSPENDED', 'INACTIVE'] }
            }
        });

        for (const u of branchUsers) {
            const exists = await prisma.staffMember.findFirst({ where: { userId: u.id } });
            if (!exists) {
                await prisma.staffMember.create({
                    data: {
                        id: genId('stf'),
                        branchId: u.staffBranchId,
                        userId: u.id,
                        fullName: u.name || 'Staff Member',
                        email: u.email,
                        phone: u.mobile || '9876543210',
                        role: 'GROUND_STAFF',
                        status: 'Active'
                    }
                });
            }
        }

        const rows = await prisma.staffMember.findMany({ 
            where, 
            include: { user: { include: { umpireProfile: true } } },
            orderBy: { createdAt: 'desc' } 
        });
        return res.status(200).json({ success: true, data: rows.map(formatStaff) });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const assertBranchAccess = async (branchId, user) => {
    if (user.role === 'SUPER_ADMIN') return true;
    const branch = await prisma.branch.findUnique({ where: { id: branchId } });
    return !!branch && branch.ownerUserId === user.id;
};

/**
 * Creates a real, login-capable User (role STAFF, staffBranchId set) alongside
 * the roster row -- previously createStaff only ever wrote a StaffMember row
 * with no linked account, so no staff member could ever actually log in
 * scoped to their branch (bookings/refunds scoping relies on User.staffBranchId).
 */
const createStaff = async (req, res) => {
    const { branchId, name, email, phone, role, shift, password } = req.body;
    if (!branchId || !name || !phone || !email) {
        return res.status(400).json({ success: false, message: 'branchId, name, email, and phone are required fields.' });
    }

    try {
        if (!(await assertBranchAccess(branchId, req.user))) {
            return res.status(403).json({ success: false, message: 'Forbidden: you do not manage this branch.' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (existingUser) {
            return res.status(409).json({ success: false, message: 'A user with this email address already exists.' });
        }

        const rawPassword = (password && password.trim().length >= 6) ? password.trim() : `Staff@${Math.floor(1000 + Math.random() * 9000)}`;
        const passwordHash = await bcrypt.hash(rawPassword, 10);
        const userId = genId('usr');

        const staff = await prisma.$transaction(async (tx) => {
            const targetUserRole = (role === 'UMPIRE' || req.body.isUmpire) ? 'UMPIRE' : 'STAFF';
            const staffMemberRole = ['BRANCH_MANAGER', 'TECHNICIAN', 'CASHIER', 'GROUND_STAFF'].includes(role) ? role : 'GROUND_STAFF';

            await tx.user.create({
                data: {
                    id: userId,
                    name: name.trim(),
                    email: normalizedEmail,
                    passwordHash,
                    role: targetUserRole,
                    mobile: phone,
                    staffBranchId: branchId,
                    wallet: { create: { id: genId('wal'), balance: 0 } }
                }
            });

            if (targetUserRole === 'UMPIRE') {
                const branchObj = await tx.branch.findUnique({ where: { id: branchId } });
                await tx.umpireProfile.create({
                    data: {
                        id: genId('ump'),
                        userId,
                        licenseNumber: `UMP-${userId.slice(-8).toUpperCase()}`,
                        fullName: name.trim(),
                        dutyFeePerMatch: req.body.dutyFee || req.body.matchFee || 300.00,
                        upiId: req.body.upiId || `${name.trim().toLowerCase().replace(/\s+/g, '')}@upi`,
                        officiatingLocations: branchObj ? branchObj.name : 'Turf Branch'
                    }
                });
            }

            return tx.staffMember.create({
                data: {
                    id: genId(), branchId, userId, fullName: name.trim(), email: normalizedEmail, phone,
                    role: staffMemberRole, shiftSlot: shift || 'MORNING_SHIFT'
                }
            });
        });

        return res.status(201).json({
            success: true,
            message: 'Staff member created with real login credentials.',
            data: { ...formatStaff(staff), temporaryPassword: rawPassword }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/** PUT /api/v1/staff/:id -- edit roster details and/or toggle Active/Inactive (which also suspends/reactivates the linked login). */
const updateStaff = async (req, res) => {
    const { id } = req.params;
    const { name, email, phone, role, shift, status, dutyFee, matchFee, password } = req.body;

    try {
        const existing = await prisma.staffMember.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Staff member not found.' });
        }
        if (!(await assertBranchAccess(existing.branchId, req.user))) {
            return res.status(403).json({ success: false, message: 'Forbidden: you do not manage this branch.' });
        }

        const staffMemberRole = role ? (['BRANCH_MANAGER', 'TECHNICIAN', 'CASHIER', 'GROUND_STAFF'].includes(role) ? role : 'GROUND_STAFF') : undefined;
        const targetUserRole = role === 'UMPIRE' ? 'UMPIRE' : (role ? 'STAFF' : undefined);

        let newPasswordHash;
        if (password && password.trim().length >= 4) {
            newPasswordHash = await bcrypt.hash(password.trim(), 10);
        }

        const updated = await prisma.$transaction(async (tx) => {
            const isInactive = status === 'Inactive' || status === 'INACTIVE' || status === 'Disabled';
            const isActive = status === 'Active' || status === 'ACTIVE';

            const row = await tx.staffMember.update({
                where: { id },
                data: {
                    fullName: name?.trim() ?? undefined,
                    email: email?.trim().toLowerCase() ?? undefined,
                    phone: phone ?? undefined,
                    role: staffMemberRole,
                    shiftSlot: shift ?? undefined,
                    status: isInactive ? 'Inactive' : isActive ? 'Active' : status ?? undefined
                }
            });

            if (row.userId) {
                await tx.user.update({
                    where: { id: row.userId },
                    data: {
                        name: name?.trim() ?? undefined,
                        mobile: phone ?? undefined,
                        role: targetUserRole,
                        status: isInactive ? 'SUSPENDED' : isActive ? 'ACTIVE' : undefined,
                        passwordHash: newPasswordHash ?? undefined
                    }
                });

                const newFee = dutyFee || matchFee;
                const umpireProf = await tx.umpireProfile.findUnique({ where: { userId: row.userId } });
                if (umpireProf) {
                    await tx.umpireProfile.update({
                        where: { userId: row.userId },
                        data: {
                            dutyFeePerMatch: newFee ? Number(newFee) : undefined,
                            status: isInactive ? 'SUSPENDED' : isActive ? 'ACTIVE' : undefined,
                            isOnDuty: isActive ? true : isInactive ? false : undefined
                        }
                    });
                } else if (targetUserRole === 'UMPIRE') {
                    const branchObj = await tx.branch.findUnique({ where: { id: existing.branchId } });
                    await tx.umpireProfile.create({
                        data: {
                            id: genId('ump'),
                            userId: row.userId,
                            licenseNumber: `UMP-${row.userId.slice(-8).toUpperCase()}`,
                            fullName: row.fullName,
                            dutyFeePerMatch: newFee ? Number(newFee) : 300.00,
                            upiId: `${row.fullName.toLowerCase().replace(/\s+/g, '')}@upi`,
                            officiatingLocations: branchObj ? branchObj.name : 'Turf Branch'
                        }
                    });
                }
            }

            return row;
        });

        return res.status(200).json({ success: true, message: 'Staff member updated.', data: formatStaff(updated) });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/** Removes the roster entry and suspends (not deletes) the linked login, preserving their historical booking/activity records. */
const deleteStaff = async (req, res) => {
    const { id } = req.params;
    try {
        const existing = await prisma.staffMember.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Staff member not found.' });
        }
        if (!(await assertBranchAccess(existing.branchId, req.user))) {
            return res.status(403).json({ success: false, message: 'Forbidden: you do not manage this branch.' });
        }

        await prisma.$transaction(async (tx) => {
            if (existing.userId) {
                await tx.user.update({
                    where: { id: existing.userId },
                    data: { status: 'SUSPENDED', staffBranchId: null }
                });

                const umpireProf = await tx.umpireProfile.findUnique({ where: { userId: existing.userId } });
                if (umpireProf) {
                    await tx.umpireProfile.update({
                        where: { userId: existing.userId },
                        data: { status: 'SUSPENDED', isOnDuty: false }
                    });
                }
            }
            await tx.staffMember.delete({ where: { id } });
        });

        return res.status(200).json({ success: true, message: 'Staff member removed and login access suspended.' });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { getStaff, createStaff, updateStaff, deleteStaff };
