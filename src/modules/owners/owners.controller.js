const prisma = require('../../config/prisma');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const { sendTurfAdminCredentialsEmail } = require('../../services/email.service');

const genId = (prefix) => `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

/**
 * Save base64 image string to disk in public/uploads directory
 */
const saveBase64Image = (base64String, prefix = 'owner_profile') => {
    if (!base64String || typeof base64String !== 'string') return '';
    if (!base64String.startsWith('data:image/')) return base64String;

    try {
        const matches = base64String.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) return base64String;

        const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
        const dataBuffer = Buffer.from(matches[2], 'base64');

        const uploadsDir = path.join(__dirname, '../../../public/uploads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const filename = `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}.${ext}`;
        const filePath = path.join(uploadsDir, filename);

        fs.writeFileSync(filePath, dataBuffer);
        return `/uploads/${filename}`;
    } catch (err) {
        console.error('Error saving base64 image:', err);
        return base64String;
    }
};

const formatOwner = (o) => {
    if (!o) return null;
    const branchesList = Array.isArray(o.branches) ? o.branches : [];
    const branchesCount = Array.isArray(o.branches) ? o.branches.length : (o._count?.branches ?? 0);
    return {
        id: o.id,
        _id: o.id,
        userId: o.userId,
        fullName: o.fullName,
        email: o.email,
        mobile: o.mobile,
        alternateMobile: o.alternateMobile || '',
        status: o.status,
        businessName: o.businessName || '',
        businessType: o.businessType || '',
        gstNumber: o.gstNumber || '',
        panNumber: o.panNumber || '',
        country: o.country || 'India',
        state: o.state || '',
        city: o.city || '',
        zipCode: o.zipCode || '',
        fullAddress: o.fullAddress || '',
        profileImage: o.profileImage || '',
        activePlanId: o.activePlanId || '',
        totalCommissionEarned: o.totalCommissionEarned,
        totalRevenueGenerated: o.totalRevenueGenerated,
        branches: branchesCount,
        branchesList: branchesList.map(b => ({
            id: b.id,
            branchName: b.branchName,
            branchCode: b.branchCode,
            city: b.city,
            area: b.area,
            status: b.status,
            fullAddress: b.fullAddress
        })),
        createdBy: o.createdBy || '',
        updatedBy: o.updatedBy || '',
        createdAt: o.createdAt,
        updatedAt: o.updatedAt
    };
};

/**
 * POST /api/v1/owners
 * Register a new Owner (creates a linked User row for authentication + an Owner
 * business profile + a first Branch for the new owner in a single transaction).
 */
const createOwner = async (req, res) => {
    try {
        const {
            fullName,
            email,
            mobile,
            alternateMobile,
            password,
            status = 'ACTIVE',
            businessName,
            businessType,
            gstNumber,
            panNumber,
            country = 'India',
            state,
            city,
            zipCode,
            planId
        } = req.body;
        const fullAddress = req.body.fullAddress || req.body.address;

        const normalizedEmail = email.toLowerCase().trim();
        const normalizedMobile = mobile.trim();

        const existing = await prisma.owner.findFirst({
            where: { OR: [{ email: normalizedEmail }, { mobile: normalizedMobile }] }
        });
        if (existing) {
            return res.status(200).json({
                success: true,
                message: 'Owner already registered. Using existing owner account.',
                data: formatOwner(existing),
                id: existing.id
            });
        }

        let profileImage = '';
        if (req.file) {
            profileImage = `/uploads/${req.file.filename}`;
        } else if (req.body.profileImage) {
            profileImage = saveBase64Image(req.body.profileImage, 'owner');
        }

        const rawPassword = (password && password.trim()) ? password.trim() : 'Owner@12345';
        const passwordHash = await bcrypt.hash(rawPassword, 10);

        const ownerId = genId('own');
        const branchId = genId('br');
        const branchCode = `BR-${Math.floor(1000 + Math.random() * 9000)}`;
        const turfBranchName = (businessName && businessName.trim()) ? businessName.trim() : `${fullName.trim()}'s Turf Arena`;

        const selectedPlanId = planId || 'plan_starter';
        const activePlan = await prisma.subscriptionPlan.findUnique({ where: { id: selectedPlanId } });
        const planPriceAmount = Number(activePlan?.monthlyPrice || (selectedPlanId === 'plan_starter' ? 800 : 3000));

        const owner = await prisma.$transaction(async (tx) => {
            const createdOwner = await tx.owner.create({
                data: {
                    id: ownerId,
                    fullName: fullName.trim(),
                    email: normalizedEmail,
                    mobile: normalizedMobile,
                    alternateMobile: alternateMobile ? alternateMobile.trim() : null,
                    status,
                    businessName: businessName ? businessName.trim() : turfBranchName,
                    businessType: businessType ? businessType.trim() : undefined,
                    gstNumber: gstNumber ? gstNumber.trim() : null,
                    panNumber: panNumber ? panNumber.trim() : null,
                    country: country ? country.trim() : 'India',
                    state: state ? state.trim() : null,
                    city: city ? city.trim() : null,
                    zipCode: zipCode ? zipCode.trim() : null,
                    fullAddress: fullAddress ? fullAddress.trim() : null,
                    profileImage: profileImage || null,
                    subscriptionPlan: { connect: { id: selectedPlanId } },
                    createdBy: req.user?.id || 'SYSTEM',
                    updatedBy: req.user?.id || 'SYSTEM',
                    user: {
                        create: {
                            id: genId('usr'),
                            name: fullName.trim(),
                            email: normalizedEmail,
                            passwordHash,
                            role: 'OWNER',
                            mobile: normalizedMobile,
                            alternateMobile: alternateMobile ? alternateMobile.trim() : null,
                            avatar: profileImage || null,
                            status
                        }
                    }
                }
            });

            await tx.branch.create({
                data: {
                    id: branchId,
                    branchName: turfBranchName,
                    branchCode,
                    ownerId: createdOwner.id,
                    ownerUserId: createdOwner.userId,
                    subscriptionPlanId: selectedPlanId,
                    subscriptionPriceSnapshot: planPriceAmount,
                    planPrice: planPriceAmount,
                    city: city ? city.trim() : null,
                    zipCode: zipCode ? zipCode.trim() : null,
                    fullAddress: fullAddress ? fullAddress.trim() : null,
                    email: normalizedEmail,
                    mobile: normalizedMobile,
                    status: 'ACTIVE'
                }
            });

            await tx.ownerSubscription.create({
                data: {
                    id: genId('sub'),
                    ownerId: createdOwner.id,
                    planId: selectedPlanId,
                    planName: activePlan?.planName || 'Starter Plan',
                    amount: planPriceAmount,
                    billingCycle: 'MONTHLY',
                    status: 'ACTIVE',
                    paymentStatus: 'COMPLETED',
                    paymentMethod: 'ONLINE'
                }
            });

            return createdOwner;
        });

        sendTurfAdminCredentialsEmail({
            recipientEmail: normalizedEmail,
            recipientName: fullName,
            password: rawPassword,
            businessName: businessName || '',
            planName: req.body.planName || 'Standard Plan'
        }).catch(err => console.error('[EMAIL DISPATCH ERROR]', err));

        return res.status(201).json({
            success: true,
            message: 'Owner registered successfully',
            data: formatOwner(owner)
        });
    } catch (error) {
        console.error('Error creating owner:', error);
        return res.status(500).json({ success: false, message: 'Failed to register owner', error: error.message });
    }
};

/**
 * GET /api/v1/owners
 * Get all owners with search, status filter, and pagination
 */
const getOwners = async (req, res) => {
    try {
        const { status, search, page = 1, limit = 10 } = req.query;

        const where = {};
        if (status && status !== 'ALL') where.status = status;
        if (search) {
            where.OR = [
                { fullName: { contains: search } },
                { email: { contains: search } },
                { mobile: { contains: search } },
                { businessName: { contains: search } },
                { city: { contains: search } }
            ];
        }

        const pageNum = Number(page) || 1;
        const limitNum = Number(limit) || 10;

        const [count, rows] = await Promise.all([
            prisma.owner.count({ where }),
            prisma.owner.findMany({
                where,
                include: {
                    branches: {
                        select: {
                            id: true,
                            branchName: true,
                            branchCode: true,
                            city: true,
                            area: true,
                            status: true,
                            fullAddress: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip: (pageNum - 1) * limitNum,
                take: limitNum
            })
        ]);

        return res.status(200).json({
            success: true,
            data: {
                owners: rows.map(formatOwner),
                pagination: {
                    total: count,
                    page: pageNum,
                    limit: limitNum,
                    totalPages: Math.ceil(count / limitNum) || 1
                }
            }
        });
    } catch (error) {
        console.error('Error fetching owners:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch owners', error: error.message });
    }
};

/**
 * GET /api/v1/owners/:id
 */
const getOwnerById = async (req, res) => {
    try {
        const owner = await prisma.owner.findUnique({
            where: { id: req.params.id },
            include: {
                branches: true
            }
        });
        if (!owner) {
            return res.status(404).json({ success: false, message: 'Owner not found' });
        }
        return res.status(200).json({ success: true, data: formatOwner(owner) });
    } catch (error) {
        console.error('Error fetching owner details:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch owner details', error: error.message });
    }
};

/**
 * PUT /api/v1/owners/:id
 * Password changes for an Owner are applied to the linked User row only --
 * Owner has no password field of its own.
 */
const updateOwner = async (req, res) => {
    try {
        const { id } = req.params;
        const current = await prisma.owner.findUnique({ where: { id } });
        if (!current) {
            return res.status(404).json({ success: false, message: 'Owner not found' });
        }

        const {
            fullName, email, mobile, alternateMobile, password, status,
            businessName, businessType, gstNumber, panNumber,
            country, state, city, zipCode
        } = req.body;
        const fullAddress = req.body.fullAddress || req.body.address;

        if (email && email.toLowerCase().trim() !== current.email.toLowerCase()) {
            const emailTaken = await prisma.owner.findFirst({ where: { email: email.toLowerCase().trim(), NOT: { id } } });
            if (emailTaken) {
                return res.status(409).json({ success: false, message: 'Email address is already in use by another owner.' });
            }
        }
        if (mobile && mobile.trim() !== current.mobile) {
            const mobileTaken = await prisma.owner.findFirst({ where: { mobile: mobile.trim(), NOT: { id } } });
            if (mobileTaken) {
                return res.status(409).json({ success: false, message: 'Mobile number is already in use by another owner.' });
            }
        }

        let profileImage = current.profileImage;
        if (req.file) {
            profileImage = `/uploads/${req.file.filename}`;
        } else if (req.body.profileImage !== undefined) {
            profileImage = saveBase64Image(req.body.profileImage, 'owner');
        }

        const nextName = fullName !== undefined ? fullName.trim() : current.fullName;
        const nextEmail = email !== undefined ? email.toLowerCase().trim() : current.email;
        const nextMobile = mobile !== undefined ? mobile.trim() : current.mobile;
        const nextAltMobile = alternateMobile !== undefined ? (alternateMobile ? alternateMobile.trim() : null) : current.alternateMobile;
        const nextStatus = status !== undefined ? status : current.status;

        const updated = await prisma.$transaction(async (tx) => {
            const ownerUpdated = await tx.owner.update({
                where: { id },
                data: {
                    fullName: nextName,
                    email: nextEmail,
                    mobile: nextMobile,
                    alternateMobile: nextAltMobile,
                    status: nextStatus,
                    businessName: businessName !== undefined ? (businessName ? businessName.trim() : null) : current.businessName,
                    businessType: businessType !== undefined ? (businessType ? businessType.trim() : null) : current.businessType,
                    gstNumber: gstNumber !== undefined ? (gstNumber ? gstNumber.trim() : null) : current.gstNumber,
                    panNumber: panNumber !== undefined ? (panNumber ? panNumber.trim() : null) : current.panNumber,
                    country: country !== undefined ? (country ? country.trim() : 'India') : current.country,
                    state: state !== undefined ? (state ? state.trim() : null) : current.state,
                    city: city !== undefined ? (city ? city.trim() : null) : current.city,
                    zipCode: zipCode !== undefined ? (zipCode ? zipCode.trim() : null) : current.zipCode,
                    fullAddress: fullAddress !== undefined ? (fullAddress ? fullAddress.trim() : null) : current.fullAddress,
                    profileImage,
                    updatedBy: req.user?.id || 'SYSTEM'
                }
            });

            const userData = {
                name: nextName,
                email: nextEmail,
                mobile: nextMobile,
                alternateMobile: nextAltMobile,
                status: nextStatus,
                avatar: profileImage || null
            };
            if (password && password.trim().length >= 6) {
                userData.passwordHash = await bcrypt.hash(password.trim(), 10);
            }
            await tx.user.update({ where: { id: current.userId }, data: userData });

            return ownerUpdated;
        });

        return res.status(200).json({ success: true, message: 'Owner updated successfully', data: formatOwner(updated) });
    } catch (error) {
        console.error('Error updating owner:', error);
        return res.status(500).json({ success: false, message: 'Failed to update owner', error: error.message });
    }
};

/**
 * PATCH /api/v1/owners/:id/status
 */
const changeOwnerStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status || !['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Valid status is required (ACTIVE, INACTIVE, SUSPENDED).' });
        }

        const existing = await prisma.owner.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Owner not found' });
        }

        await prisma.$transaction([
            prisma.owner.update({ where: { id }, data: { status, updatedBy: req.user?.id || 'SYSTEM' } }),
            prisma.user.update({ where: { id: existing.userId }, data: { status } }),
            prisma.branch.updateMany({ where: { OR: [{ ownerId: id }, { ownerUserId: existing.userId }] }, data: { status } })
        ]);

        try {
            const { getIo } = require('../../realtime/socket');
            const io = getIo();
            if (io) {
                io.emit('status_updated', { ownerId: id, userId: existing.userId, status });
                io.emit('global_data_changed', { type: 'OWNER_STATUS_CHANGE', ownerId: id });
            }
        } catch (e) {
            console.error('Socket emit error in changeOwnerStatus:', e);
        }

        return res.status(200).json({ success: true, message: `Owner, User, and all linked Turfs updated to ${status}` });
    } catch (error) {
        console.error('Error updating owner status:', error);
        return res.status(500).json({ success: false, message: 'Failed to update owner status', error: error.message });
    }
};

/**
 * DELETE /api/v1/owners/:id
 * Deletes the Owner profile and its linked User account (which cascades to
 * remove dependent auth session material, per the Prisma schema's onDelete rules).
 */
const deleteOwner = async (req, res) => {
    try {
        const existing = await prisma.owner.findUnique({ where: { id: req.params.id } });
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Owner not found' });
        }

        await prisma.user.delete({ where: { id: existing.userId } });

        return res.status(200).json({ success: true, message: 'Owner deleted successfully' });
    } catch (error) {
        console.error('Error deleting owner:', error);
        return res.status(500).json({ success: false, message: 'Failed to delete owner', error: error.message });
    }
};

module.exports = {
    createOwner,
    getOwners,
    getOwnerById,
    updateOwner,
    changeOwnerStatus,
    deleteOwner
};
