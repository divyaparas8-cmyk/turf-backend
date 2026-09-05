const prisma = require('../../config/prisma');

const genId = () => `disc_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

const formatOffer = (d) => ({
    id: d.id, _id: d.id,
    ownerId: d.ownerId, turfId: d.branchId, branchId: d.branchId,
    turfName: d.branch?.branchName || null,
    ownerName: d.owner?.fullName || null,
    title: d.title, description: d.description || '',
    discountType: d.discountType, discountValue: Number(d.discountValue),
    minimumBookingAmount: Number(d.minimumBookingAmount), maximumDiscountAmount: Number(d.maximumDiscountAmount),
    promoCode: d.promoCode || '', banner: d.banner || '', thumbnail: d.thumbnail || '',
    applicableSports: d.applicableSports || [], applicableDays: d.applicableDays || [], slotTypes: d.applicableSlotTypes || [],
    startDate: d.startDate?.toISOString().split('T')[0] || '', endDate: d.endDate?.toISOString().split('T')[0] || '',
    startTime: d.startTime, endTime: d.endTime,
    usageLimit: d.usageLimit, usedCount: d.usedCount, perUserLimit: d.perUserLimit,
    firstBookingOnly: d.firstBookingOnly, stackable: d.stackable, autoApply: d.autoApply,
    targetRadius: Number(d.targetRadiusKm), location: d.locationArea || '',
    gender: d.genderSegment, ageGroup: d.ageGroup, customerType: d.customerType,
    estimatedAudience: d.estimatedAudience, status: d.status, createdBy: d.createdBy || '',
    createdAt: d.createdAt, updatedAt: d.updatedAt
});

const arrify = (v) => Array.isArray(v) ? v : (v ? [v] : []);

const getDiscountOffers = async (req, res) => {
    try {
        const { search, turfId, status, discountType, page = 1, limit = 10 } = req.query;
        const and = [{ deletedAt: null }];

        if (turfId && turfId !== 'ALL') and.push({ branchId: turfId });
        if (status && status !== 'ALL') and.push({ status: status.toUpperCase() });
        if (discountType && discountType !== 'ALL') and.push({ discountType: discountType.toUpperCase() });

        if (req.user?.role === 'OWNER') {
            const branches = await prisma.branch.findMany({ where: { ownerUserId: req.user.id }, select: { id: true } });
            and.push({ branchId: { in: branches.map(b => b.id) } });
        }

        if (search) {
            and.push({ OR: [{ title: { contains: search } }, { promoCode: { contains: search } }] });
        }

        const where = { AND: and };
        const pageNum = parseInt(page, 10) || 1;
        const limitNum = parseInt(limit, 10) || 10;

        const [total, rows] = await Promise.all([
            prisma.discountOffer.count({ where }),
            prisma.discountOffer.findMany({
                where, include: { branch: true, owner: true },
                orderBy: { createdAt: 'desc' },
                skip: (pageNum - 1) * limitNum, take: limitNum
            })
        ]);

        return res.status(200).json({
            success: true,
            data: { offers: rows.map(formatOffer), pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) || 1 } }
        });
    } catch (error) {
        console.error('Error fetching discount offers:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch discount offers', error: error.message });
    }
};

const getDiscountOfferById = async (req, res) => {
    try {
        const offer = await prisma.discountOffer.findFirst({ where: { id: req.params.id, deletedAt: null }, include: { branch: true, owner: true } });
        if (!offer) {
            return res.status(404).json({ success: false, message: 'Discount offer not found' });
        }
        return res.status(200).json({ success: true, data: formatOffer(offer) });
    } catch (error) {
        console.error('Error fetching discount offer by id:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch discount offer details', error: error.message });
    }
};

const assertBranchAccess = async (branchId, user) => {
    if (user.role === 'SUPER_ADMIN') return true;
    const branch = await prisma.branch.findUnique({ where: { id: branchId } });
    return !!branch && branch.ownerUserId === user.id;
};

const createDiscountOffer = async (req, res) => {
    try {
        const {
            turfId, branchId, title, description, discountType, discountValue,
            minimumBookingAmount, maximumDiscountAmount, promoCode,
            applicableSports, applicableDays, slotTypes, startDate, endDate,
            startTime = '00:00:00', endTime = '23:59:59', usageLimit = 200,
            perUserLimit = 1, firstBookingOnly = false, stackable = false, autoApply = false,
            targetRadius = 5.0, location, gender = 'All Genders', ageGroup = 'All Ages',
            customerType = 'All Users', estimatedAudience = 12500, status = 'ACTIVE'
        } = req.body;

        const resolvedBranchId = branchId || turfId;
        if (!resolvedBranchId || !title || !discountType || discountValue === undefined || !startDate || !endDate) {
            return res.status(400).json({ success: false, message: 'branchId, title, discountType, discountValue, startDate, and endDate are required.' });
        }
        if (!(await assertBranchAccess(resolvedBranchId, req.user))) {
            return res.status(403).json({ success: false, message: 'Forbidden: you do not manage this branch.' });
        }

        const code = promoCode ? promoCode.trim().toUpperCase() : null;
        if (code) {
            const existing = await prisma.discountOffer.findFirst({ where: { promoCode: code, deletedAt: null } });
            if (existing) {
                return res.status(409).json({ success: false, message: `Promo Code "${code}" is already in use. Please enter a unique code.` });
            }
        }

        let banner = req.body.banner || '';
        let thumbnail = req.body.thumbnail || '';
        if (req.files?.banner?.[0]) banner = `/uploads/${req.files.banner[0].filename}`;
        if (req.files?.thumbnail?.[0]) thumbnail = `/uploads/${req.files.thumbnail[0].filename}`;

        const branch = await prisma.branch.findUnique({ where: { id: resolvedBranchId } });

        const offer = await prisma.discountOffer.create({
            data: {
                id: genId(),
                branchId: resolvedBranchId,
                ownerId: branch.ownerId,
                title: title.trim(), description: description || null,
                discountType: discountType.toUpperCase().replace(/\s+/g, '_'), discountValue,
                minimumBookingAmount: minimumBookingAmount || 0, maximumDiscountAmount: maximumDiscountAmount || 0,
                promoCode: code, banner, thumbnail,
                applicableSports: arrify(applicableSports), applicableDays: arrify(applicableDays), applicableSlotTypes: arrify(slotTypes),
                startDate: new Date(startDate), endDate: new Date(endDate), startTime, endTime,
                usageLimit, perUserLimit, firstBookingOnly: !!firstBookingOnly, stackable: !!stackable, autoApply: !!autoApply,
                targetRadiusKm: targetRadius, locationArea: location || null,
                genderSegment: gender, ageGroup, customerType, estimatedAudience,
                status: status.toUpperCase(), createdBy: req.user?.id || 'SYSTEM'
            },
            include: { branch: true, owner: true }
        });

        return res.status(201).json({ success: true, message: 'Discount offer created successfully', data: formatOffer(offer) });
    } catch (error) {
        console.error('Error creating discount offer:', error);
        return res.status(500).json({ success: false, message: 'Failed to create discount offer', error: error.message });
    }
};

const updateDiscountOffer = async (req, res) => {
    try {
        const existing = await prisma.discountOffer.findFirst({ where: { id: req.params.id, deletedAt: null } });
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Discount offer not found' });
        }
        if (!(await assertBranchAccess(existing.branchId, req.user))) {
            return res.status(403).json({ success: false, message: 'Forbidden: you do not manage this branch.' });
        }

        const u = req.body;
        const updated = await prisma.discountOffer.update({
            where: { id: req.params.id },
            data: {
                title: u.title?.trim() ?? undefined,
                description: u.description ?? undefined,
                discountType: u.discountType ? u.discountType.toUpperCase().replace(/\s+/g, '_') : undefined,
                discountValue: u.discountValue ?? undefined,
                minimumBookingAmount: u.minimumBookingAmount ?? undefined,
                maximumDiscountAmount: u.maximumDiscountAmount ?? undefined,
                promoCode: u.promoCode ? u.promoCode.trim().toUpperCase() : undefined,
                startDate: u.startDate ? new Date(u.startDate) : undefined,
                endDate: u.endDate ? new Date(u.endDate) : undefined,
                usageLimit: u.usageLimit ?? undefined,
                status: u.status ? u.status.toUpperCase() : undefined
            },
            include: { branch: true, owner: true }
        });

        return res.status(200).json({ success: true, message: 'Discount offer updated successfully', data: formatOffer(updated) });
    } catch (error) {
        console.error('Error updating discount offer:', error);
        return res.status(500).json({ success: false, message: 'Failed to update discount offer', error: error.message });
    }
};

const deleteDiscountOffer = async (req, res) => {
    try {
        const existing = await prisma.discountOffer.findUnique({ where: { id: req.params.id } });
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Discount offer not found' });
        }
        if (!(await assertBranchAccess(existing.branchId, req.user))) {
            return res.status(403).json({ success: false, message: 'Forbidden: you do not manage this branch.' });
        }
        await prisma.discountOffer.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
        return res.status(200).json({ success: true, message: 'Discount offer deleted successfully' });
    } catch (error) {
        console.error('Error deleting discount offer:', error);
        return res.status(500).json({ success: false, message: 'Failed to delete discount offer', error: error.message });
    }
};

const changeDiscountStatus = async (req, res) => {
    try {
        const { status } = req.body;
        if (!status) {
            return res.status(400).json({ success: false, message: 'Status is required' });
        }
        const existing = await prisma.discountOffer.findUnique({ where: { id: req.params.id } });
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Discount offer not found' });
        }
        if (!(await assertBranchAccess(existing.branchId, req.user))) {
            return res.status(403).json({ success: false, message: 'Forbidden: you do not manage this branch.' });
        }
        await prisma.discountOffer.update({ where: { id: req.params.id }, data: { status: status.toUpperCase() } });
        return res.status(200).json({ success: true, message: `Discount offer status changed to ${status}` });
    } catch (error) {
        console.error('Error changing discount offer status:', error);
        return res.status(500).json({ success: false, message: 'Failed to update status', error: error.message });
    }
};

const duplicateDiscountOffer = async (req, res) => {
    try {
        const original = await prisma.discountOffer.findFirst({ where: { id: req.params.id, deletedAt: null } });
        if (!original) {
            return res.status(404).json({ success: false, message: 'Original discount offer not found' });
        }
        if (!(await assertBranchAccess(original.branchId, req.user))) {
            return res.status(403).json({ success: false, message: 'Forbidden: you do not manage this branch.' });
        }

        const { id, createdAt, updatedAt, deletedAt, ...rest } = original;
        const duplicated = await prisma.discountOffer.create({
            data: {
                ...rest,
                id: genId(),
                title: `${original.title} (Copy)`,
                promoCode: original.promoCode ? `${original.promoCode}_COPY_${Math.floor(Math.random() * 100)}` : null,
                usedCount: 0,
                status: 'DRAFT',
                createdBy: req.user?.id || 'SYSTEM'
            },
            include: { branch: true, owner: true }
        });

        return res.status(201).json({ success: true, message: 'Discount offer duplicated successfully', data: formatOffer(duplicated) });
    } catch (error) {
        console.error('Error duplicating discount offer:', error);
        return res.status(500).json({ success: false, message: 'Failed to duplicate discount offer', error: error.message });
    }
};

const validatePromoCode = async (req, res) => {
    try {
        const { promoCode, branchId, amount = 0 } = req.body;
        if (!promoCode || !branchId) {
            return res.status(400).json({ success: false, message: 'promoCode and branchId are required' });
        }

        const code = String(promoCode).trim().toUpperCase();
        const grossAmount = Number(amount) || 0;

        // Real Database Check: Has this user/phone booked any previous matches on the platform?
        const userPhone = req.body.phone || req.body.mobileNumber || req.body.guestPhone || req.user?.mobile || req.user?.phone;
        const userId = req.user?.id && !req.user.id.startsWith('usr_guest_') ? req.user.id : null;

        let previousCount = 0;
        const bookingOr = [];
        const matchOr = [];
        const matchPayOr = [];

        if (userId) {
            bookingOr.push({ userId });
            matchOr.push({ captainAId: userId });
            matchPayOr.push({ userId });
        }
        if (userPhone) {
            bookingOr.push({ mobileNumber: userPhone });
            matchPayOr.push({ playerPhone: userPhone });
        }

        if (bookingOr.length > 0 || matchOr.length > 0 || matchPayOr.length > 0) {
            const [bCount, mCount, mpCount] = await Promise.all([
                bookingOr.length > 0 ? prisma.booking.count({ where: { OR: bookingOr, status: { in: ['COMPLETED', 'HELD', 'PENDING'] } } }) : 0,
                matchOr.length > 0 ? prisma.match.count({ where: { OR: matchOr, matchStatus: { in: ['CONFIRMED', 'COMPLETED', 'SLOT_HELD'] } } }) : 0,
                matchPayOr.length > 0 ? prisma.matchPayment.count({ where: { OR: matchPayOr, paymentStatus: { in: ['COMPLETED', 'HELD', 'PENDING'] } } }) : 0
            ]);
            previousCount = bCount + mCount + mpCount;
        }

        const isFirstMatch = previousCount === 0;

        // 1. Check in MySQL discount_offer table
        const offer = await prisma.discountOffer.findFirst({
            where: {
                promoCode: code,
                branchId,
                status: 'ACTIVE',
                deletedAt: null
            }
        });

        if (offer) {
            if (offer.firstBookingOnly && !isFirstMatch) {
                return res.status(400).json({
                    success: false,
                    message: `Promo code "${code}" is valid for FIRST MATCH only. You have already completed ${previousCount} match booking(s).`
                });
            }

            const val = Number(offer.discountValue);
            let discountAmount = 0;
            if (offer.discountType === 'PERCENTAGE') {
                discountAmount = Math.round((grossAmount * val) / 100);
                if (offer.maximumDiscountAmount && Number(offer.maximumDiscountAmount) > 0) {
                    discountAmount = Math.min(discountAmount, Number(offer.maximumDiscountAmount));
                }
            } else {
                discountAmount = Math.min(val, grossAmount);
            }
            const netAmount = Math.max(0, grossAmount - discountAmount);

            return res.status(200).json({
                success: true,
                message: `Promo code "${code}" applied successfully!`,
                data: {
                    promoCode: code,
                    title: offer.title,
                    discountType: offer.discountType,
                    discountValue: val,
                    discountAmount,
                    netAmount,
                    isFirstMatch
                }
            });
        }

        // 2. Check branch default couponCode (e.g. CRICKET20 / 20% OFF FIRST MATCH)
        const branch = await prisma.branch.findUnique({ where: { id: branchId } });
        const branchCoupon = (branch?.couponCode || 'CRICKET20').trim().toUpperCase();

        if (code === branchCoupon || code === 'CRICKET20') {
            if (!isFirstMatch) {
                return res.status(400).json({
                    success: false,
                    message: `Promo code "${code}" (20% OFF FIRST MATCH) is valid for FIRST MATCH only. You have already completed ${previousCount} match booking(s).`
                });
            }

            const discountPercent = 20;
            const discountAmount = Math.round((grossAmount * discountPercent) / 100);
            const netAmount = Math.max(0, grossAmount - discountAmount);

            return res.status(200).json({
                success: true,
                message: `Promo code "${code}" applied successfully! (20% OFF FIRST MATCH)`,
                data: {
                    promoCode: code,
                    title: branch?.discountOffer || '20% OFF FIRST MATCH',
                    discountType: 'PERCENTAGE',
                    discountValue: 20,
                    discountAmount,
                    netAmount,
                    isFirstMatch: true
                }
            });
        }

        return res.status(400).json({
            success: false,
            message: `Invalid or expired promo code "${code}" for this turf.`
        });
    } catch (error) {
        console.error('Error validating promo code:', error);
        return res.status(500).json({ success: false, message: 'Failed to validate promo code', error: error.message });
    }
};

module.exports = {
    getDiscountOffers,
    getDiscountOfferById,
    createDiscountOffer,
    updateDiscountOffer,
    deleteDiscountOffer,
    changeDiscountStatus,
    duplicateDiscountOffer,
    validatePromoCode
};
