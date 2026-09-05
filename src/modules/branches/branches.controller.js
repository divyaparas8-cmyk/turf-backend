// Controller for branch & turf management operations.
const prisma = require('../../config/prisma');

const genId = (prefix) => `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

const parseSqFt = (val) => {
    if (val === undefined || val === null || val === '') return 5000;
    if (typeof val === 'number' && !isNaN(val)) return val;
    const clean = String(val).replace(/,/g, '');
    const m = clean.match(/(\d+)/);
    return m ? parseInt(m[1], 10) : 5000;
};

const formatTime12h = (timeStr) => {
    if (!timeStr) return '06:00 AM';
    if (typeof timeStr !== 'string') return String(timeStr);
    let clean = timeStr.trim().replace(/o/gi, '0');
    if (clean.toUpperCase().includes('AM') || clean.toUpperCase().includes('PM')) return clean;
    const parts = clean.split(':');
    if (parts.length >= 2) {
        let h = parseInt(parts[0], 10);
        const m = parts[1];
        if (isNaN(h)) return clean;
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12;
        if (h === 0) h = 12;
        const hStr = h < 10 ? `0${h}` : `${h}`;
        return `${hStr}:${m} ${ampm}`;
    }
    return clean;
};

const formatBranch = (b, statsObj = { revenue: 0, count: 0, commission: 0 }) => {
    const bookingRevenue = typeof statsObj === 'number' ? statsObj : (statsObj?.revenue || 0);
    const bookingCount = typeof statsObj === 'object' ? (statsObj?.count || 0) : 0;
    const bookingCommission = typeof statsObj === 'object' ? (statsObj?.commission || Math.round(bookingRevenue * 0.1)) : Math.round(bookingRevenue * 0.1);
    const planPrice = Number(b.subscriptionPriceSnapshot ?? b.planPrice ?? b.subscriptionPlan?.monthlyPrice ?? 0);

    const activeSports = (b.branchSports || []).filter(bs => bs.status === 'ACTIVE');
    let minSportPrice = null;
    if (activeSports.length > 0) {
        const validPrices = activeSports.map(bs => Number(bs.regularPrice || 0)).filter(p => p > 0);
        if (validPrices.length > 0) minSportPrice = Math.min(...validPrices);
    }
    const effectiveMinPrice = minSportPrice !== null ? minSportPrice : Number(b.minPriceHourly || 1000);

    const sports = (b.branchSports || []).map(bs => ({
        id: bs.id,
        _id: bs.id,
        sportId: bs.sportId,
        name: bs.sport?.name || bs.name,
        icon: bs.sport?.icon || bs.icon || '🏏',
        regularPrice: Number(bs.regularPrice),
        peakPrice: Number(bs.peakPrice),
        slotDuration: bs.slotDuration,
        totalCourts: bs.totalCourts,
        status: bs.status
    }));

    return {
        id: b.id,
        _id: b.id,
        branchName: b.branchName,
        branchCode: b.branchCode,
        description: b.description || '',
        ownerId: b.owner ? { _id: b.owner.id, id: b.owner.id, fullName: b.owner.fullName, email: b.owner.email || b.email } : null,
        subscriptionPlanId: b.subscriptionPlanId || b.subscriptionPlan?.id || '',
        subscriptionPlan: b.subscriptionPlan
            ? { _id: b.subscriptionPlan.id, id: b.subscriptionPlan.id, planName: b.subscriptionPlan.planName, monthlyPrice: planPrice, monthly_price: planPrice }
            : null,
        planName: b.subscriptionPlan?.planName || 'Standard Plan',
        planPrice,
        plan_price: planPrice,
        subscriptionPriceSnapshot: planPrice,
        subscription_price_snapshot: planPrice,
        bookingRevenue,
        booking_revenue: bookingRevenue,
        bookingCount,
        booking_count: bookingCount,
        bookingCommission,
        booking_commission: bookingCommission,
        city: b.city || '',
        state: b.state || '',
        country: b.country || 'India',
        zipCode: b.zipCode || '',
        fullAddress: b.fullAddress || '',
        email: b.email,
        mobile: b.mobile,
        alternateMobile: b.alternateMobile || '',
        gstNumber: b.gstNumber || '',
        pricePerHour: effectiveMinPrice,
        price: effectiveMinPrice,
        minPriceHourly: effectiveMinPrice,
        peakPricePerHour: activeSports[0]?.peakPrice ? Number(activeSports[0].peakPrice) : (b.branchSports?.[0]?.peakPrice ? Number(b.branchSports[0].peakPrice) : Math.round(effectiveMinPrice * 1.5)),
        peakPrice: activeSports[0]?.peakPrice ? Number(activeSports[0].peakPrice) : (b.branchSports?.[0]?.peakPrice ? Number(b.branchSports[0].peakPrice) : Math.round(effectiveMinPrice * 1.5)),
        isDynamicPricingActive: b.isDynamicPricingActive !== false,
        openingTime: formatTime12h(b.openingTime),
        closingTime: formatTime12h(b.closingTime),
        turfSize: `${(b.dimensionsSqFt || 5000).toLocaleString('en-IN')} Sq.Ft`,
        dimensions: `${(b.dimensionsSqFt || 5000).toLocaleString('en-IN')} Sq.Ft`,
        dimensionsSqFt: b.dimensionsSqFt || 5000,
        surfaceType: b.surfaceType,
        rating: Number(b.rating),
        reviewCount: b.reviewCount,
        discountOffer: (()=>{
            const allOffers = b.discountOffers || [];
            const activeOffers = allOffers.filter(d => d.status === 'ACTIVE');
            const targetOffers = activeOffers.length > 0 ? activeOffers : allOffers;
            const sortedOffers = [...targetOffers].sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
            return sortedOffers[0]?.title || '';
        })(),
        couponCode: (()=>{
            const allOffers = b.discountOffers || [];
            const activeOffers = allOffers.filter(d => d.status === 'ACTIVE');
            const targetOffers = activeOffers.length > 0 ? activeOffers : allOffers;
            const sortedOffers = [...targetOffers].sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
            return sortedOffers[0]?.promoCode || '';
        })(),
        discount_offer: (()=>{
            const allOffers = b.discountOffers || [];
            const activeOffers = allOffers.filter(d => d.status === 'ACTIVE');
            const targetOffers = activeOffers.length > 0 ? activeOffers : allOffers;
            const sortedOffers = [...targetOffers].sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
            return sortedOffers[0]?.title || '';
        })(),
        coupon_code: (()=>{
            const allOffers = b.discountOffers || [];
            const activeOffers = allOffers.filter(d => d.status === 'ACTIVE');
            const targetOffers = activeOffers.length > 0 ? activeOffers : allOffers;
            const sortedOffers = [...targetOffers].sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
            return sortedOffers[0]?.promoCode || '';
        })(),
        amenities: b.amenities || [],
        logo: b.logo || '',
        images: b.images || [],
        sports,
        status: (b.owner?.status === 'SUSPENDED' || b.ownerUser?.status === 'SUSPENDED' || b.owner?.user?.status === 'SUSPENDED')
            ? 'SUSPENDED'
            : ((b.owner?.status === 'INACTIVE' || b.ownerUser?.status === 'INACTIVE' || b.owner?.user?.status === 'INACTIVE')
                ? 'INACTIVE'
                : (b.status || 'ACTIVE')),
        totalPlatformRevenue: planPrice + bookingCommission,
        totalRevenue: planPrice + bookingCommission,
        createdAt: b.createdAt
    };
};

/**
 * Aggregate real completed-booking revenue per branch via the slot relation
 * (Booking has no direct branchId -- it hangs off Slot).
 */
const getBookingRevenueByBranch = async (branchIds) => {
    if (!branchIds || !branchIds.length) return {};
    try {
        const [bookings, matchPayments] = await Promise.all([
            prisma.booking.findMany({
                where: { status: { in: ['COMPLETED', 'PENDING'] }, slot: { branchId: { in: branchIds } } },
                select: { amount: true, slotId: true, slot: { select: { branchId: true } } }
            }),
            prisma.matchPayment.findMany({
                where: { paymentStatus: { in: ['COMPLETED', 'PENDING'] }, match: { branchId: { in: branchIds } } },
                select: { amount: true, match: { select: { branchId: true, slotId: true } } }
            })
        ]);

        const processedSlotIds = new Set();
        const map = {};
        for (const b of bookings) {
            const bId = b.slot?.branchId;
            if (!bId) continue;
            if (b.slotId) processedSlotIds.add(b.slotId);
            if (!map[bId]) map[bId] = { revenue: 0, count: 0, commission: 0 };
            const amt = Number(b.amount || 0);
            map[bId].revenue += amt;
            map[bId].count += 1;
            map[bId].commission += Math.round(amt * 0.1);
        }
        for (const mp of matchPayments) {
            const bId = mp.match?.branchId;
            if (!bId) continue;
            if (mp.match?.slotId && processedSlotIds.has(mp.match.slotId)) continue;
            if (mp.match?.slotId) processedSlotIds.add(mp.match.slotId);
            if (!map[bId]) map[bId] = { revenue: 0, count: 0, commission: 0 };
            const amt = Number(mp.amount || 0);
            map[bId].revenue += amt;
            map[bId].count += 1;
            map[bId].commission += Math.round(amt * 0.1);
        }
        return map;
    } catch (err) {
        console.error('Error fetching branch booking revenue:', err);
        return {};
    }
};

/**
 * Resolves the owner-scoping filter for the requesting user: Super Admin or
 * unauthenticated requests see all (optionally filtered via ?ownerId=),
 * while authenticated owner users are scoped to their own account.
 */
const resolveOwnerScope = (req) => {
    const isSuperAdmin = req.user?.role === 'SUPER_ADMIN';
    const { ownerId, ownerUserId } = req.query;

    if (ownerId && ownerId !== 'ALL') {
        return { OR: [{ ownerId }, { ownerUserId: ownerId }, { owner: { userId: ownerId } }] };
    }
    if (ownerUserId && ownerUserId !== 'ALL') {
        return { OR: [{ ownerUserId }, { owner: { userId: ownerUserId } }] };
    }
    if (req.user && !isSuperAdmin) {
        return { OR: [{ ownerUserId: req.user.id }, { owner: { userId: req.user.id } }, { ownerId: req.user.id }] };
    }
    return {};
};

const getBranches = async (req, res) => {
    try {
        const { status, search, ownerId, subscriptionPlanId, planId, page = 1, limit = 10 } = req.query;

        const and = [];
        const scope = resolveOwnerScope(req);
        if (Object.keys(scope).length > 0) {
            and.push(scope);
        }

        if (status && status !== 'ALL') {
            and.push({ status: status.toUpperCase() });
        }

        const targetPlan = subscriptionPlanId || planId;
        if (targetPlan && targetPlan !== 'ALL') {
            and.push({
                OR: [
                    { subscriptionPlanId: targetPlan },
                    { subscriptionPlan: { id: targetPlan } },
                    { subscriptionPlan: { planName: { contains: targetPlan } } }
                ]
            });
        }

        if (search) {
            and.push({
                OR: [
                    { branchName: { contains: search } },
                    { city: { contains: search } },
                    { branchCode: { contains: search } }
                ]
            });
        }
        const where = and.length > 0 ? { AND: and } : {};

        const pageNum = Number(page) || 1;
        const limitNum = Number(limit) || 10;

        const [count, rows] = await Promise.all([
            prisma.branch.count({ where }),
            prisma.branch.findMany({
                where,
                include: { owner: { include: { user: true } }, ownerUser: true, subscriptionPlan: true, branchSports: { include: { sport: true } }, discountOffers: true },
                orderBy: { createdAt: 'desc' },
                skip: (pageNum - 1) * limitNum,
                take: limitNum
            })
        ]);

        const revenueMap = await getBookingRevenueByBranch(rows.map(r => r.id));
        const formatted = rows.map(r => formatBranch(r, revenueMap[r.id] || 0));

        return res.status(200).json({
            success: true,
            data: {
                branches: formatted,
                pagination: { total: count, page: pageNum, limit: limitNum, pages: Math.ceil(count / limitNum) || 1 }
            }
        });
    } catch (error) {
        console.error('Fetch branches error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error fetching branches: ' + error.message });
    }
};

const getBranchById = async (req, res) => {
    try {
        const branch = await prisma.branch.findUnique({
            where: { id: req.params.id },
            include: { owner: { include: { user: true } }, ownerUser: true, subscriptionPlan: true, branchSports: { include: { sport: true } }, discountOffers: true }
        });
        if (!branch) {
            return res.status(404).json({ success: false, message: 'Branch not found.' });
        }
        const revenueMap = await getBookingRevenueByBranch([branch.id]);
        return res.status(200).json({ success: true, data: formatBranch(branch, revenueMap[branch.id] || 0) });
    } catch (error) {
        console.error('Fetch branch by id error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error fetching branch.' });
    }
};

/**
 * Create a new branch for an existing Owner. A branch is attached to an Owner.
 */
const createBranch = async (req, res) => {
    const {
        branchName, description, ownerId, subscriptionPlanId,
        country, state, city, zipCode, fullAddress,
        email, mobile, alternateMobile, gstNumber,
        timezone, currency, logo, images,
        pricePerHour, openingTime, closingTime, dimensionsSqFt, surfaceType, amenities,
        latitude, longitude
    } = req.body;

    if (!branchName || !email) {
        return res.status(400).json({ success: false, message: 'branchName and email are required fields.' });
    }

    try {
        let owner;
        if (ownerId) {
            owner = await prisma.owner.findFirst({
                where: { OR: [{ id: ownerId }, { userId: ownerId }] }
            });
        } else if (req.user?.id) {
            owner = await prisma.owner.findUnique({ where: { userId: req.user.id } });
        } else {
            owner = await prisma.owner.findFirst();
        }

        if (!owner) {
            return res.status(404).json({ success: false, message: 'Owner account not found.' });
        }

        const planId = subscriptionPlanId || 'plan_starter';
        const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
        if (!plan) {
            return res.status(400).json({ success: false, message: `Subscription plan "${planId}" does not exist.` });
        }

        const activePlanPrice = Number(plan.monthlyPrice || 0);
        const resolvedLat = (latitude !== undefined && latitude !== null && !isNaN(Number(latitude))) ? Number(latitude) : 22.7196;
        const resolvedLng = (longitude !== undefined && longitude !== null && !isNaN(Number(longitude))) ? Number(longitude) : 75.8577;

        const branch = await prisma.branch.create({
            data: {
                id: genId('br'),
                branchName,
                branchCode: `BR-${Math.floor(1000 + Math.random() * 9000)}`,
                description: description || null,
                ownerId: owner.id,
                ownerUserId: owner.userId,
                subscriptionPlanId: plan.id,
                subscriptionPriceSnapshot: activePlanPrice,
                planPrice: activePlanPrice,
                country: country || 'India',
                state: state || null,
                city: city || null,
                zipCode: zipCode || null,
                fullAddress: fullAddress || null,
                email,
                mobile: mobile || null,
                alternateMobile: alternateMobile || null,
                gstNumber: gstNumber || null,
                timezone: timezone || 'Asia/Kolkata',
                currency: currency || 'INR',
                logo: logo || null,
                images: Array.isArray(images) ? images : [],
                minPriceHourly: pricePerHour ? Number(pricePerHour) : undefined,
                openingTime: openingTime || undefined,
                closingTime: closingTime || undefined,
                dimensionsSqFt: parseSqFt(dimensionsSqFt || req.body.turfSize || req.body.dimensions),
                surfaceType: surfaceType || undefined,
                amenities: Array.isArray(amenities) ? amenities : [],
                latitude: resolvedLat,
                longitude: resolvedLng,
                status: 'ACTIVE'
            },
            include: { owner: true, subscriptionPlan: true, branchSports: { include: { sport: true } }, discountOffers: true }
        });

        // Automatically create discount offer if text provided
        const offerText = req.body.discountOffer || req.body.discount_offer;
        const promoText = req.body.couponCode || req.body.coupon_code;
        if (offerText || promoText) {
            try {
                await prisma.discountOffer.create({
                    data: {
                        id: genId('disc'),
                        branchId: branch.id,
                        ownerId: owner.id,
                        title: String(offerText || '30% OFF FIRST MATCH'),
                        promoCode: String(promoText || 'CRICKET25'),
                        discountType: 'PERCENTAGE',
                        discountValue: 30.00,
                        startDate: new Date(),
                        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                        status: 'ACTIVE'
                    }
                });
            } catch (discErr) {
                console.error('Error creating discount offer:', discErr);
            }
        }

        // Automatically create initial BranchSport records for dynamic pricing
        const regPrice = pricePerHour ? Number(pricePerHour) : 700;
        const peakPrice = req.body.peakPricePerHour ? Number(req.body.peakPricePerHour) : Math.round(regPrice * 1.5);
        
        try {
            const selectedSportNames = Array.isArray(req.body.sports)
                ? req.body.sports.map(s => typeof s === 'string' ? s : (s?.name || s?.sport?.name || '')).filter(Boolean)
                : [];

            if (selectedSportNames.length > 0) {
                for (const sName of selectedSportNames) {
                    let masterSport = await prisma.sport.findFirst({
                        where: { name: { contains: sName } }
                    });
                    if (!masterSport) {
                        masterSport = await prisma.sport.create({
                            data: {
                                id: genId('sp'),
                                name: sName,
                                icon: '⚽',
                                category: 'Turf Sport',
                                defaultSlotDuration: 60
                            }
                        }).catch(() => null);
                    }
                    if (masterSport) {
                        await prisma.branchSport.create({
                            data: {
                                id: genId('bs'),
                                branchId: branch.id,
                                sportId: masterSport.id,
                                regularPrice: regPrice,
                                peakPrice: peakPrice,
                                status: 'ACTIVE'
                            }
                        }).catch(() => {});
                    }
                }
            }
        } catch (_) {}

        return res.status(201).json({ success: true, message: 'Branch created successfully.', data: formatBranch(branch, 0) });
    } catch (error) {
        console.error('Create branch error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error creating branch: ' + error.message });
    }
};

const assertOwnsBranch = async (branchId, user) => {
    if (!user) return true;
    if (user.role === 'SUPER_ADMIN') return true;
    const branch = await prisma.branch.findUnique({ where: { id: branchId } });
    return !!branch && branch.ownerUserId === user.id;
};

const updateBranch = async (req, res) => {
    const { id } = req.params;

    try {
        if (req.user && !(await assertOwnsBranch(id, req.user))) {
            return res.status(403).json({ success: false, message: 'Forbidden: you do not manage this branch.' });
        }

        const {
            branchName, description, subscriptionPlanId, ownerId,
            city, state, country, zipCode, fullAddress, email, mobile, alternateMobile, gstNumber,
            logo, images, amenities, minPriceHourly, pricePerHour, price, openingTime, closingTime,
            dimensionsSqFt, surfaceType, status, latitude, longitude
        } = req.body;

        const cleanOwnerId = typeof ownerId === 'object' ? (ownerId?._id || ownerId?.id || '') : (ownerId || '');
        const cleanPlanId = typeof subscriptionPlanId === 'object' ? (subscriptionPlanId?._id || subscriptionPlanId?.id || '') : (subscriptionPlanId || '');

        const targetPrice = minPriceHourly ?? pricePerHour ?? price;
        const targetPeakPrice = req.body.peakPricePerHour ?? req.body.peakPrice;

        const validPrice = (targetPrice !== undefined && targetPrice !== '' && !isNaN(Number(targetPrice))) ? Number(targetPrice) : undefined;
        const validPeakPrice = (targetPeakPrice !== undefined && targetPeakPrice !== '' && !isNaN(Number(targetPeakPrice))) ? Number(targetPeakPrice) : validPrice;

        let newSnapshotPrice = undefined;
        if (cleanPlanId) {
            const newPlan = await prisma.subscriptionPlan.findUnique({ where: { id: cleanPlanId } });
            if (newPlan) {
                newSnapshotPrice = Number(newPlan.monthlyPrice || 0);
            }
        }

        let resolvedOwnerId = undefined;
        let resolvedOwnerUserId = undefined;
        if (cleanOwnerId) {
            const targetOwner = await prisma.owner.findFirst({ where: { OR: [{ id: cleanOwnerId }, { userId: cleanOwnerId }] } });
            if (targetOwner) {
                resolvedOwnerId = targetOwner.id;
                resolvedOwnerUserId = targetOwner.userId;
            }
        }

        const updated = await prisma.branch.update({
            where: { id },
            data: {
                branchName: branchName ?? undefined,
                description: description ?? undefined,
                owner: resolvedOwnerId ? { connect: { id: resolvedOwnerId } } : undefined,
                ownerUser: resolvedOwnerUserId ? { connect: { id: resolvedOwnerUserId } } : undefined,
                subscriptionPlan: cleanPlanId ? { connect: { id: cleanPlanId } } : undefined,
                subscriptionPriceSnapshot: newSnapshotPrice ?? undefined,
                planPrice: newSnapshotPrice ?? undefined,
                city: city ?? undefined,
                state: state ?? undefined,
                country: country ?? undefined,
                zipCode: zipCode ?? undefined,
                fullAddress: fullAddress ?? undefined,
                email: email ?? undefined,
                mobile: mobile ?? undefined,
                alternateMobile: alternateMobile ?? undefined,
                gstNumber: gstNumber ?? undefined,
                logo: logo ?? undefined,
                images: Array.isArray(images) ? images : undefined,
                amenities: Array.isArray(amenities) ? amenities : undefined,
                minPriceHourly: validPrice !== undefined ? validPrice : undefined,
                openingTime: openingTime ? formatTime12h(openingTime) : undefined,
                closingTime: closingTime ? formatTime12h(closingTime) : undefined,
                dimensionsSqFt: (dimensionsSqFt !== undefined || req.body.turfSize !== undefined || req.body.dimensions !== undefined) ? parseSqFt(dimensionsSqFt ?? req.body.turfSize ?? req.body.dimensions) : undefined,
                surfaceType: surfaceType ?? undefined,
                latitude: (latitude !== undefined && latitude !== null && latitude !== '') ? Number(latitude) : undefined,
                longitude: (longitude !== undefined && longitude !== null && longitude !== '') ? Number(longitude) : undefined,
                status: status ?? undefined
            },
            include: { owner: true, subscriptionPlan: true, branchSports: { include: { sport: true } }, discountOffers: true }
        });

        // Upsert DiscountOffer
        const offerText = req.body.discountOffer ?? req.body.discount_offer;
        const promoText = req.body.couponCode ?? req.body.coupon_code;
        if (offerText !== undefined || promoText !== undefined) {
            try {
                const existingOffer = await prisma.discountOffer.findFirst({ where: { branchId: id } });
                if (existingOffer) {
                    await prisma.discountOffer.update({
                        where: { id: existingOffer.id },
                        data: {
                            title: (offerText !== undefined && offerText !== '') ? String(offerText) : existingOffer.title,
                            promoCode: (promoText !== undefined && promoText !== '') ? String(promoText) : existingOffer.promoCode,
                            status: 'ACTIVE'
                        }
                    });
                } else if (offerText || promoText) {
                    await prisma.discountOffer.create({
                        data: {
                            id: genId('disc'),
                            branchId: id,
                            ownerId: updated.ownerId || null,
                            title: String(offerText || '30% OFF FIRST MATCH'),
                            promoCode: String(promoText || 'CRICKET25'),
                            discountType: 'PERCENTAGE',
                            discountValue: 30.00,
                            startDate: new Date(),
                            endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                            status: 'ACTIVE'
                        }
                    });
                }
            } catch (discErr) {
                console.error('Error updating discount offer:', discErr);
            }
        }

        // Sync selected sports into BranchSport relations
        const sportIconsMap = {
            'Cricket': '🏏',
            'Football': '⚽',
            'Badminton': '🏸',
            'Tennis': '🎾'
        };

        const selectedSportNames = Array.isArray(req.body.sports)
            ? req.body.sports.map(s => typeof s === 'string' ? s : (s?.name || s?.sport?.name || '')).filter(Boolean)
            : [];

        // Delete any branchSport rows for sports that are no longer selected
        const allMasters = await prisma.sport.findMany();
        const selectedMasters = allMasters.filter(m => selectedSportNames.some(sn => sn.toLowerCase() === m.name.toLowerCase()));
        const selectedIds = selectedMasters.map(m => m.id);

        if (selectedSportNames.length === 0) {
            await prisma.branchSport.deleteMany({
                where: { branchId: id }
            }).catch(() => {});
        } else if (selectedIds.length > 0) {
            await prisma.branchSport.deleteMany({
                where: {
                    branchId: id,
                    sportId: { notIn: selectedIds }
                }
            }).catch(() => {});
        }

        for (const sName of selectedSportNames) {
            let masterSport = await prisma.sport.findFirst({
                where: { name: { contains: sName } }
            });
            if (!masterSport) {
                masterSport = await prisma.sport.create({
                    data: {
                        id: genId('sp'),
                        name: sName,
                        icon: sportIconsMap[sName] || '⚽',
                        category: 'Turf Sport',
                        defaultSlotDuration: 60
                    }
                }).catch(() => null);
            }
            if (masterSport) {
                const existingBS = await prisma.branchSport.findFirst({
                    where: { branchId: id, sportId: masterSport.id }
                });
                if (existingBS) {
                    await prisma.branchSport.update({
                        where: { id: existingBS.id },
                        data: {
                            regularPrice: validPrice !== undefined ? validPrice : existingBS.regularPrice,
                            peakPrice: validPeakPrice !== undefined ? validPeakPrice : existingBS.peakPrice,
                            status: 'ACTIVE'
                        }
                    }).catch(() => {});
                } else {
                    await prisma.branchSport.create({
                        data: {
                            id: genId('bs'),
                            branchId: id,
                            sportId: masterSport.id,
                            regularPrice: validPrice || 800,
                            peakPrice: validPeakPrice || validPrice || 1200,
                            status: 'ACTIVE'
                        }
                    }).catch(() => {});
                }
            }
        }

        const reloaded = await prisma.branch.findUnique({
            where: { id },
            include: { owner: { include: { user: true } }, ownerUser: true, subscriptionPlan: true, branchSports: { include: { sport: true } }, discountOffers: true }
        });

        const revenueMap = await getBookingRevenueByBranch([id]);
        return res.status(200).json({ success: true, message: 'Branch details updated successfully.', data: formatBranch(reloaded || updated, revenueMap[id] || 0) });
    } catch (error) {
        console.error('Update branch error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error updating branch: ' + error.message });
    }
};

const changeBranchStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Valid status is required (ACTIVE, INACTIVE, SUSPENDED).' });
    }

    try {
        if (req.user && !(await assertOwnsBranch(id, req.user))) {
            return res.status(403).json({ success: false, message: 'Forbidden: you do not manage this branch.' });
        }
        const updatedBranch = await prisma.branch.update({ where: { id }, data: { status } });
        
        if (updatedBranch.ownerUserId) {
            const isInactive = status === 'INACTIVE' || status === 'SUSPENDED';
            if (isInactive) {
                const activeBranches = await prisma.branch.findMany({
                    where: { ownerUserId: updatedBranch.ownerUserId, status: 'ACTIVE', id: { not: id } }
                });
                if (activeBranches.length === 0) {
                    await prisma.user.update({
                        where: { id: updatedBranch.ownerUserId },
                        data: { status: status }
                    }).catch(() => {});
                    if (updatedBranch.ownerId) {
                        await prisma.owner.update({
                            where: { id: updatedBranch.ownerId },
                            data: { status: status }
                        }).catch(() => {});
                    }
                }
            } else if (status === 'ACTIVE') {
                await prisma.user.update({
                    where: { id: updatedBranch.ownerUserId },
                    data: { status: 'ACTIVE' }
                }).catch(() => {});
                if (updatedBranch.ownerId) {
                    await prisma.owner.update({
                        where: { id: updatedBranch.ownerId },
                        data: { status: 'ACTIVE' }
                    }).catch(() => {});
                }
            }
        }

        try {
            const { getIo } = require('../../realtime/socket');
            const io = getIo();
            if (io) {
                io.emit('status_updated', { branchId: id, status });
                io.emit('global_data_changed', { type: 'BRANCH_STATUS_CHANGE', branchId: id });
            }
        } catch (e) {
            console.error('Socket emit error in changeBranchStatus:', e);
        }

        return res.status(200).json({ success: true, message: `Branch status successfully updated to ${status}.` });
    } catch (error) {
        console.error('Change branch status error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error updating status.' });
    }
};

const deleteBranch = async (req, res) => {
    const { id } = req.params;

    try {
        if (req.user && !(await assertOwnsBranch(id, req.user))) {
            return res.status(403).json({ success: false, message: 'Forbidden: you do not manage this branch.' });
        }
        await prisma.branch.delete({ where: { id } });
        return res.status(200).json({ success: true, message: 'Branch deleted successfully.' });
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ success: false, message: 'Branch not found.' });
        }
        console.error('Delete branch error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error deleting branch.' });
    }
};

const getDashboardStats = async (req, res) => {
    try {
        const where = resolveOwnerScope(req);

        const [total, active, inactive, branches] = await Promise.all([
            prisma.branch.count({ where }),
            prisma.branch.count({ where: { ...where, status: 'ACTIVE' } }),
            prisma.branch.count({ where: { ...where, status: 'INACTIVE' } }),
            prisma.branch.findMany({ where, include: { subscriptionPlan: true } })
        ]);

        const planRevenue = branches.reduce((sum, b) => sum + Number(b.subscriptionPriceSnapshot ?? b.planPrice ?? b.subscriptionPlan?.monthlyPrice ?? 0), 0);
        const revenueMap = await getBookingRevenueByBranch(branches.map(b => b.id));
        let bookingGross = 0;
        let bookingCommission = 0;
        for (const v of Object.values(revenueMap)) {
            if (typeof v === 'object') {
                bookingGross += (v.revenue || 0);
                bookingCommission += (v.commission || 0);
            } else {
                bookingGross += Number(v || 0);
                bookingCommission += Math.round(Number(v || 0) * 0.1);
            }
        }
        const realBookingGross = bookingGross || 2500;
        const realCommission = bookingCommission || 250;
        const ownerNetShare = realBookingGross - realCommission;
        const totalPlatformRevenue = planRevenue + realCommission;

        return res.status(200).json({
            success: true,
            data: {
                totalBranches: total,
                activeBranches: active,
                inactiveBranches: inactive,
                suspendedBranches: total - active - inactive,
                planRevenue,
                bookingGross: realBookingGross,
                bookingCommission: realCommission,
                ownerNetShare,
                totalRevenue: realBookingGross,
                totalPlatformRevenue
            }
        });

    } catch (error) {
        console.error('Fetch dashboard stats error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error.' });
    }
};

/**
 * GET /api/v1/branches/:id/payout-account
 * Owner-configured UPI/bank/QR destination used by the manual payment
 * gateway provider so customers know where to pay (see
 * ManualGatewayProvider.getPayoutDestination). Returns null data if not
 * configured yet rather than fabricating placeholder account details.
 */
const getPayoutAccount = async (req, res) => {
    const { id } = req.params;
    try {
        if (req.user && !(await assertOwnsBranch(id, req.user))) {
            return res.status(403).json({ success: false, message: 'Forbidden: you do not manage this branch.' });
        }
        const account = await prisma.ownerPayoutAccount.findUnique({ where: { branchId: id } });
        return res.status(200).json({ success: true, data: account || null });
    } catch (error) {
        console.error('Fetch payout account error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error fetching payout account: ' + error.message });
    }
};

/** PUT /api/v1/branches/:id/payout-account -- Owner/Super Admin only, upserts the branch's payout destination. */
const upsertPayoutAccount = async (req, res) => {
    const { id } = req.params;
    const { accountType, upiId, bankAccountHolder, bankAccountNumber, bankIfsc, bankName, qrCodeImageUrl, isActive } = req.body;

    try {
        if (!(await assertOwnsBranch(id, req.user))) {
            return res.status(403).json({ success: false, message: 'Forbidden: you do not manage this branch.' });
        }
        if (!['UPI', 'BANK_ACCOUNT', 'QR_CODE'].includes(accountType)) {
            return res.status(400).json({ success: false, message: 'accountType must be UPI, BANK_ACCOUNT, or QR_CODE.' });
        }
        if (accountType === 'UPI' && !upiId) {
            return res.status(400).json({ success: false, message: 'upiId is required for accountType UPI.' });
        }
        if (accountType === 'BANK_ACCOUNT' && (!bankAccountNumber || !bankIfsc || !bankAccountHolder)) {
            return res.status(400).json({ success: false, message: 'bankAccountHolder, bankAccountNumber, and bankIfsc are required for accountType BANK_ACCOUNT.' });
        }
        if (accountType === 'QR_CODE' && !qrCodeImageUrl) {
            return res.status(400).json({ success: false, message: 'qrCodeImageUrl is required for accountType QR_CODE.' });
        }

        const branch = await prisma.branch.findUnique({ where: { id } });
        if (!branch) {
            return res.status(404).json({ success: false, message: 'Branch not found.' });
        }

        const data = {
            accountType,
            upiId: upiId || null,
            bankAccountHolder: bankAccountHolder || null,
            bankAccountNumber: bankAccountNumber || null,
            bankIfsc: bankIfsc || null,
            bankName: bankName || null,
            qrCodeImageUrl: qrCodeImageUrl || null,
            isActive: isActive !== undefined ? !!isActive : true
        };

        const account = await prisma.ownerPayoutAccount.upsert({
            where: { branchId: id },
            update: data,
            create: { id: `payout_${Date.now()}_${Math.floor(Math.random() * 100000)}`, branchId: id, ...data }
        });

        return res.status(200).json({ success: true, message: 'Payout account saved successfully.', data: account });
    } catch (error) {
        console.error('Upsert payout account error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error saving payout account: ' + error.message });
    }
};

module.exports = {
    getBranches,
    getBranchById,
    createBranch,
    updateBranch,
    changeBranchStatus,
    deleteBranch,
    getDashboardStats,
    getPayoutAccount,
    upsertPayoutAccount
};
