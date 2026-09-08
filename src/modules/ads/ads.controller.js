const prisma = require('../../config/prisma');

const genId = (prefix) => `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

const formatDateStr = (val) => {
    if (!val) return '';
    if (val instanceof Date) return val.toISOString().split('T')[0];
    if (typeof val === 'string') return val.split('T')[0];
    return String(val);
};

const formatAd = (a) => ({
    id: a.id, _id: a.id,
    branchId: a.branchId || a.branch?.id || null,
    branch: a.branch ? { id: a.branch.id, _id: a.branch.id, branchName: a.branch.branchName, city: a.branch.city } : null,
    name: a.name,
    turfName: a.branch?.branchName || null,
    ownerName: a.owner?.fullName || null,
    ownerEmail: a.owner?.email || null,
    ownerMobile: a.owner?.mobile || null,
    type: a.type, status: a.status, icon: a.icon,
    views: a.views, clicks: a.clicks, bookings: a.bookings,
    revenue: `₹${Number(a.revenue).toLocaleString()}`,
    commissionPaid: `₹${Number(a.commissionPaid).toLocaleString()}`,
    ctr: a.ctr, roi: a.roi, cpa: a.cpa,
    budgetSpent: Number(a.budgetSpent), budgetTotal: Number(a.budgetTotal), dailyBudget: Number(a.dailyBudget),
    commissionRate: Number(a.commissionRate), bookingGoal: a.bookingGoal,
    avgSlotPrice: Number(a.avgSlotPrice), targetRadiusKm: a.targetRadiusKm, estimatedReach: a.estimatedReach,
    startDate: formatDateStr(a.startDate), endDate: formatDateStr(a.endDate),
    description: a.description || '',
    adTitle: a.adTitle || '', shortHeadline: a.shortHeadline || '', ctaText: a.ctaText || '',
    redirectUrl: a.redirectUrl || '', bannerImageUrl: a.bannerImageUrl || '',
    mobileBannerImageUrl: a.mobileBannerImageUrl || '', thumbnailImageUrl: a.thumbnailImageUrl || '',
    videoUrl: a.videoUrl || '', pricingModel: a.pricingModel || '',
    cpmRate: a.cpmRate !== null && a.cpmRate !== undefined ? Number(a.cpmRate) : null,
    placements: a.placements ? a.placements.split(',').filter(Boolean) : []
});

const resolveOwnerBranchIds = async (user) => {
    if (!user || user.role === 'SUPER_ADMIN' || user.role === 'SUPERADMIN') return null;

    const ownerProfile = await prisma.owner.findFirst({
        where: {
            OR: [
                { userId: user.id },
                { id: user.id },
                ...(user.email ? [{ email: user.email }] : [])
            ]
        }
    }).catch(() => null);

    const branches = await prisma.branch.findMany({
        where: {
            OR: [
                { ownerUserId: user.id },
                { ownerId: user.id },
                ...(ownerProfile ? [{ ownerId: ownerProfile.id }, { ownerUserId: ownerProfile.userId }] : []),
                ...(user.staffBranchId ? [{ id: user.staffBranchId }] : [])
            ]
        },
        select: { id: true }
    });

    return branches.map(b => b.id);
};

const resolveDynamicAdStats = async (ads) => {
    if (!ads || ads.length === 0) return [];

    const adIds = ads.map(a => a.id);

    const adCommissions = await prisma.adCommission.findMany({
        where: { adId: { in: adIds } }
    }).catch(() => []);

    const commByAdId = {};
    for (const c of adCommissions) {
        if (!commByAdId[c.adId]) commByAdId[c.adId] = { count: 0, revenue: 0, commission: 0 };
        commByAdId[c.adId].count += 1;
        commByAdId[c.adId].revenue += Number(c.bookingAmount || 0);
        commByAdId[c.adId].commission += Number(c.commissionAmount || 0);
    }

    return ads.map(a => {
        const directComm = commByAdId[a.id] || { count: 0, revenue: 0, commission: 0 };

        const totalBookings = directComm.count || a.bookings || 0;
        const totalRevenue = directComm.revenue || Number(a.revenue || 0);

        const commRate = Number(a.commissionRate || 10);
        const commissionPaid = directComm.commission || Math.round((totalRevenue * commRate) / 100);
        const budgetTotal = Number(a.budgetTotal || 5000);
        const budgetSpent = Math.min(budgetTotal, Math.max(Number(a.budgetSpent || 0), commissionPaid));

        const roiNum = budgetSpent > 0 ? Math.round(((totalRevenue - budgetSpent) / budgetSpent) * 100) : (totalRevenue > 0 ? 100 : 0);
        const roi = `${roiNum}%`;
        const cpaNum = totalBookings > 0 ? Math.round(budgetSpent / totalBookings) : 0;
        const cpa = `₹${cpaNum}`;
        const ctr = a.views > 0 ? `${(((a.clicks || 0) / (a.views || 1)) * 100).toFixed(2)}%` : ((a.clicks || 0) > 0 ? '100.00%' : '0%');

        return {
            ...formatAd(a),
            bookings: totalBookings,
            revenue: `₹${totalRevenue.toLocaleString('en-IN')}`,
            rawRevenue: totalRevenue,
            commissionPaid: `₹${commissionPaid.toLocaleString('en-IN')}`,
            rawCommissionPaid: commissionPaid,
            budgetSpent,
            roi,
            cpa,
            ctr
        };
    });
};

const getAdvertisements = async (req, res) => {
    try {
        const { status, type } = req.query;
        const ownerBranchIds = await resolveOwnerBranchIds(req.user);
        if (ownerBranchIds !== null && ownerBranchIds.length === 0) {
            return res.status(200).json({ success: true, data: [] });
        }

        const where = {};
        if (status && status !== 'ALL') where.status = status;
        if (type && type !== 'ALL') where.type = type;
        if (ownerBranchIds !== null) where.branchId = { in: ownerBranchIds };

        const rows = await prisma.advertisement.findMany({ where, include: { branch: true, owner: true }, orderBy: { createdAt: 'desc' } });
        const data = await resolveDynamicAdStats(rows);

        // Sync Prisma DB records in background for persistence
        for (const item of data) {
            prisma.advertisement.update({
                where: { id: item.id },
                data: {
                    bookings: item.bookings,
                    revenue: item.rawRevenue,
                    commissionPaid: item.rawCommissionPaid,
                    budgetSpent: item.budgetSpent,
                    roi: item.roi,
                    cpa: item.cpa,
                    ctr: item.ctr
                }
            }).catch(() => {});
        }

        return res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Fetch advertisements error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error fetching advertisements: ' + error.message });
    }
};

const assertBranchAccess = async (branchId, user) => {
    if (user.role === 'SUPER_ADMIN' || user.role === 'SUPERADMIN') return true;
    const branch = await prisma.branch.findUnique({ where: { id: branchId } });
    return !!branch && branch.ownerUserId === user.id;
};

const createAdvertisement = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    const {
        branchId, campaignName, name, type = 'GUARANTEED_BOOKING', icon = '📢',
        status, budgetTotal = 5000, dailyBudget = 500, startDate, endDate, description,
        commissionRate, bookingGoal, avgSlotPrice, targetRadiusKm, estimatedReach, durationMonths,
        adTitle, shortHeadline, ctaText, redirectUrl, bannerImageUrl, mobileBannerImageUrl,
        thumbnailImageUrl, videoUrl, pricingModel, cpmRate, placements
    } = req.body;
    const adName = campaignName || name;

    if (!branchId || !adName || !startDate || !endDate) {
        return res.status(400).json({ success: false, message: 'branchId, campaign name, startDate, and endDate are required.' });
    }

    try {
        if (!(await assertBranchAccess(branchId, req.user))) {
            return res.status(403).json({ success: false, message: 'Forbidden: you do not manage this branch.' });
        }
        const branch = await prisma.branch.findUnique({ where: { id: branchId } });

        const ad = await prisma.advertisement.create({
            data: {
                id: `AD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
                branchId, ownerId: branch.ownerId,
                name: adName, type: type.toUpperCase(), icon,
                status: status ? status.toUpperCase() : undefined,
                budgetTotal, dailyBudget,
                startDate: new Date(startDate), endDate: new Date(endDate),
                description: description || null,
                commissionRate: commissionRate !== undefined ? Number(commissionRate) : undefined,
                bookingGoal: bookingGoal !== undefined ? Number(bookingGoal) : undefined,
                avgSlotPrice: avgSlotPrice !== undefined ? Number(avgSlotPrice) : undefined,
                targetRadiusKm: targetRadiusKm !== undefined ? Number(targetRadiusKm) : undefined,
                estimatedReach: estimatedReach !== undefined ? Number(estimatedReach) : undefined,
                durationMonths: durationMonths !== undefined ? Number(durationMonths) : undefined,
                adTitle: adTitle || null, shortHeadline: shortHeadline || null, ctaText: ctaText || null,
                redirectUrl: redirectUrl || null, bannerImageUrl: bannerImageUrl || null,
                mobileBannerImageUrl: mobileBannerImageUrl || null, thumbnailImageUrl: thumbnailImageUrl || null,
                videoUrl: videoUrl || null, pricingModel: pricingModel || null,
                cpmRate: cpmRate !== undefined && cpmRate !== null ? Number(cpmRate) : undefined,
                placements: Array.isArray(placements) ? placements.join(',') : (placements || null)
            },
            include: { branch: true, owner: true }
        });

        return res.status(201).json({ success: true, message: 'Advertisement campaign created successfully.', data: formatAd(ad) });
    } catch (error) {
        console.error('Create advertisement error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error creating campaign: ' + error.message });
    }
};

const updateAdStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
        const existing = await prisma.advertisement.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Advertisement campaign not found.' });
        }
        if (!(await assertBranchAccess(existing.branchId, req.user))) {
            return res.status(403).json({ success: false, message: 'Forbidden: you do not manage this branch.' });
        }

        await prisma.advertisement.update({ where: { id }, data: { status: status.toUpperCase() } });
        return res.status(200).json({ success: true, message: `Campaign status updated to ${status}` });
    } catch (error) {
        console.error('Update ad status error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error updating status.' });
    }
};

const deleteAdvertisement = async (req, res) => {
    const { id } = req.params;
    try {
        const existing = await prisma.advertisement.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Advertisement campaign not found.' });
        }
        if (!(await assertBranchAccess(existing.branchId, req.user))) {
            return res.status(403).json({ success: false, message: 'Forbidden: you do not manage this branch.' });
        }
        await prisma.advertisement.delete({ where: { id } });
        return res.status(200).json({ success: true, message: 'Advertisement campaign deleted successfully.' });
    } catch (error) {
        console.error('Delete advertisement error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error deleting campaign.' });
    }
};

const getCommissions = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    try {
        const { status } = req.query;
        const ownerBranchIds = await resolveOwnerBranchIds(req.user);

        if (ownerBranchIds !== null && ownerBranchIds.length === 0) {
            return res.status(200).json({
                success: true,
                summary: { totalPool: 0, pendingPayouts: 0, settledCommissions: 0 },
                data: []
            });
        }

        const where = {};
        if (status && status !== 'ALL') where.status = status.toUpperCase();
        if (ownerBranchIds !== null) where.branchId = { in: ownerBranchIds };

        const [rows, poolAgg, pendingAgg, settledAgg] = await Promise.all([
            prisma.adCommission.findMany({ where, include: { advertisement: true, branch: true }, orderBy: { createdAt: 'desc' } }),
            prisma.adCommission.aggregate({ where, _sum: { commissionAmount: true } }),
            prisma.adCommission.aggregate({ where: { ...where, status: 'PENDING' }, _sum: { commissionAmount: true } }),
            prisma.adCommission.aggregate({ where: { ...where, status: 'PAID' }, _sum: { commissionAmount: true } })
        ]);

        let commData = rows.map(r => ({
            bookingId: r.bookingId, adId: r.adId, adName: r.advertisement?.name || 'Ad Campaign Booking',
            turfName: r.branch?.branchName || 'SportMatrix Venue',
            bookingAmount: `₹${Number(r.bookingAmount).toLocaleString('en-IN')}`,
            commission: `₹${Number(r.commissionAmount).toLocaleString('en-IN')} (${r.commissionRate}%)`,
            ownerAmount: `₹${Number(r.ownerAmount).toLocaleString('en-IN')}`,
            invoiceNo: r.invoiceNumber, paymentStatus: r.status,
            date: r.createdAt.toISOString().split('T')[0],
            time: r.createdAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        }));

        let totalPool = Number(poolAgg._sum.commissionAmount || 0);
        let pendingPayouts = Number(pendingAgg._sum.commissionAmount || 0);
        let settledCommissions = Number(settledAgg._sum.commissionAmount || 0);

        return res.status(200).json({
            success: true,
            summary: {
                totalPool,
                pendingPayouts,
                settledCommissions
            },
            data: commData
        });
    } catch (error) {
        console.error('Fetch commissions error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error fetching commissions.' });
    }
};

const markCommissionPaid = async (req, res) => {
    try {
        const targetId = req.params.bookingId;
        let updatedCount = 0;

        // 1. Try updating adCommission table
        const adCommResult = await prisma.adCommission.updateMany({
            where: {
                OR: [
                    { bookingId: targetId },
                    { invoiceNumber: targetId }
                ]
            },
            data: { status: 'PAID' }
        });
        updatedCount += adCommResult.count;

        // 2. Try updating Booking table
        const numericId = parseInt(targetId.replace(/\D/g, ''), 10);
        const bookingWhere = {
            OR: [
                { bookingCode: targetId },
                ...(isNaN(numericId) ? [] : [{ id: numericId }])
            ]
        };

        const matchingBookings = await prisma.booking.findMany({ where: bookingWhere });
        if (matchingBookings.length > 0) {
            const bookingUpdate = await prisma.booking.updateMany({
                where: bookingWhere,
                data: { status: 'COMPLETED' }
            });
            updatedCount += bookingUpdate.count;
        }

        // 3. Try updating MatchPayment table
        const cleanMatchId = targetId.replace(/^MATCH-/, '');
        const matchPayWhere = {
            OR: [
                { id: targetId },
                { id: cleanMatchId }
            ]
        };
        const matchingMatchPays = await prisma.matchPayment.findMany({ where: matchPayWhere });
        if (matchingMatchPays.length > 0) {
            const mpUpdate = await prisma.matchPayment.updateMany({
                where: matchPayWhere,
                data: { paymentStatus: 'COMPLETED', commissionStatus: 'CONFIRMED', ownerPayoutStatus: 'CONFIRMED' }
            });
            updatedCount += mpUpdate.count;
        }

        // 4. Try updating Payment table
        const cleanInv = targetId.replace(/^INV-/, '');
        const paymentWhere = {
            OR: [
                { invoiceNumber: targetId },
                { invoiceNumber: `INV-${targetId}` },
                { invoiceNumber: cleanInv },
                ...(isNaN(numericId) ? [] : [{ bookingId: numericId }])
            ]
        };
        const matchingPayments = await prisma.payment.findMany({ where: paymentWhere });
        if (matchingPayments.length > 0) {
            const pUpdate = await prisma.payment.updateMany({
                where: paymentWhere,
                data: { status: 'COMPLETED', commissionStatus: 'CONFIRMED', ownerPayoutStatus: 'CONFIRMED' }
            });
            updatedCount += pUpdate.count;
        }

        if (updatedCount === 0) {
            return res.status(404).json({ success: false, message: `Commission record "${targetId}" not found.` });
        }

        return res.status(200).json({ success: true, message: `Commission for booking ${targetId} marked as Paid!` });
    } catch (error) {
        console.error('Mark commission paid error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error updating commission status: ' + error.message });
    }
};

const getPayments = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    try {
        const ownerBranchIds = await resolveOwnerBranchIds(req.user);
        if (ownerBranchIds !== null && ownerBranchIds.length === 0) {
            return res.status(200).json({ success: true, data: [] });
        }

        const where = {};
        if (ownerBranchIds !== null) where.branchId = { in: ownerBranchIds };

        const rows = await prisma.adPayment.findMany({ where, include: { advertisement: true, branch: true, owner: true }, orderBy: { createdAt: 'desc' } });
        
        let data = rows.map(r => ({
            invoiceId: r.invoiceNumber, adName: r.campaignName || r.advertisement?.name || 'Ad Campaign',
            adId: r.adId, turfName: r.branch?.branchName || 'Turf Arena', ownerName: r.owner?.fullName || 'Turf Owner',
            amount: `₹${Number(r.totalAmount).toLocaleString('en-IN')}`,
            paymentMethod: r.paymentMode, status: r.status === 'COMPLETED' ? 'Paid' : 'Pending',
            date: r.billingDate ? r.billingDate.toISOString().split('T')[0] : r.createdAt.toISOString().split('T')[0]
        }));

        return res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Fetch ad payments error:', error);
        return res.status(500).json({ success: false, message: 'Error fetching ad payments: ' + error.message });
    }
};

const getAdAnalytics = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    try {
        const ownerBranchIds = await resolveOwnerBranchIds(req.user);
        if (ownerBranchIds !== null && ownerBranchIds.length === 0) {
            return res.status(200).json({
                success: true,
                data: { totalAds: 0, activeAds: 0, totalRevenue: 0, adBookings: 0, totalCommission: 0, totalClicks: 0, conversionRate: 0, campaigns: [], campaignsRaw: [] }
            });
        }

        const where = {};
        if (ownerBranchIds !== null) where.branchId = { in: ownerBranchIds };

        const ads = await prisma.advertisement.findMany({ where, include: { branch: true, owner: true }, orderBy: { createdAt: 'desc' } });
        const dynamicAds = await resolveDynamicAdStats(ads);

        let totalAds = dynamicAds.length;
        let activeAds = dynamicAds.filter(a => a.status === 'ACTIVE').length;
        let totalRevenue = dynamicAds.reduce((sum, a) => sum + (a.rawRevenue || 0), 0);
        let adBookings = dynamicAds.reduce((sum, a) => sum + (a.bookings || 0), 0);
        let totalCommission = dynamicAds.reduce((sum, a) => sum + (a.rawCommissionPaid || 0), 0);
        let totalClicks = dynamicAds.reduce((sum, a) => sum + (a.clicks || 0), 0);

        const conversionRate = totalClicks > 0 ? Number(((adBookings / totalClicks) * 100).toFixed(1)) : 0;

        return res.status(200).json({
            success: true,
            data: {
                totalAds,
                activeAds,
                totalRevenue,
                adBookings,
                totalCommission,
                totalClicks,
                conversionRate,
                campaigns: dynamicAds,
                campaignsRaw: dynamicAds.map(a => ({
                    id: a.id, name: a.name, type: a.type,
                    views: a.views, clicks: a.clicks, bookings: a.bookings,
                    revenue: a.rawRevenue, commissionPaid: a.rawCommissionPaid,
                    budgetSpent: a.budgetSpent, budgetTotal: a.budgetTotal
                }))
            }
        });
    } catch (error) {
        console.error('Fetch ad analytics error:', error);
        return res.status(500).json({ success: false, message: 'Error fetching ad analytics: ' + error.message });
    }
};

const updateAdvertisement = async (req, res) => {
    const { id } = req.params;
    const {
        name, campaignName, budgetTotal, dailyBudget, startDate, endDate, description, type, icon, status,
        commissionRate, bookingGoal, avgSlotPrice, targetRadiusKm, estimatedReach, durationMonths,
        adTitle, shortHeadline, ctaText, redirectUrl, bannerImageUrl, mobileBannerImageUrl,
        thumbnailImageUrl, videoUrl, pricingModel, cpmRate, placements
    } = req.body;

    try {
        const existing = await prisma.advertisement.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Advertisement not found.' });
        }
        if (!(await assertBranchAccess(existing.branchId, req.user))) {
            return res.status(403).json({ success: false, message: 'Forbidden: you do not manage this branch.' });
        }

        const adName = campaignName || name;
        await prisma.advertisement.update({
            where: { id },
            data: {
                name: adName ?? undefined,
                type: type ? type.toUpperCase() : undefined,
                icon: icon ?? undefined,
                status: status ? status.toUpperCase() : undefined,
                budgetTotal: budgetTotal !== undefined ? Number(budgetTotal) : undefined,
                dailyBudget: dailyBudget !== undefined ? Number(dailyBudget) : undefined,
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined,
                description: description ?? undefined,
                commissionRate: commissionRate !== undefined ? Number(commissionRate) : undefined,
                bookingGoal: bookingGoal !== undefined ? Number(bookingGoal) : undefined,
                avgSlotPrice: avgSlotPrice !== undefined ? Number(avgSlotPrice) : undefined,
                targetRadiusKm: targetRadiusKm !== undefined ? Number(targetRadiusKm) : undefined,
                estimatedReach: estimatedReach !== undefined ? Number(estimatedReach) : undefined,
                durationMonths: durationMonths !== undefined ? Number(durationMonths) : undefined,
                adTitle: adTitle ?? undefined, shortHeadline: shortHeadline ?? undefined, ctaText: ctaText ?? undefined,
                redirectUrl: redirectUrl ?? undefined, bannerImageUrl: bannerImageUrl ?? undefined,
                mobileBannerImageUrl: mobileBannerImageUrl ?? undefined, thumbnailImageUrl: thumbnailImageUrl ?? undefined,
                videoUrl: videoUrl ?? undefined, pricingModel: pricingModel ?? undefined,
                cpmRate: cpmRate !== undefined && cpmRate !== null ? Number(cpmRate) : undefined,
                placements: Array.isArray(placements) ? placements.join(',') : (placements ?? undefined)
            }
        });

        return res.status(200).json({ success: true, message: 'Advertisement updated successfully.', data: { id } });
    } catch (error) {
        console.error('Update advertisement error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error updating campaign: ' + error.message });
    }
};

const recordAdImpression = async (req, res) => {
    try {
        const { id } = req.params;
        const ad = await prisma.advertisement.findUnique({ where: { id } });
        if (!ad) return res.status(404).json({ success: false, message: 'Ad not found' });

        const newViews = (ad.views || 0) + 1;
        const newClicks = ad.clicks || 0;
        const newCtrNum = newViews > 0 ? ((newClicks / newViews) * 100).toFixed(2) : '0.00';
        const newCtrStr = `${newCtrNum}%`;

        await prisma.advertisement.update({
            where: { id },
            data: { views: newViews, ctr: newCtrStr }
        });

        return res.status(200).json({ success: true, views: newViews, ctr: newCtrStr });
    } catch (error) {
        console.error('Record ad impression error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

const recordAdClick = async (req, res) => {
    try {
        const { id } = req.params;
        const ad = await prisma.advertisement.findUnique({ where: { id } });
        if (!ad) return res.status(404).json({ success: false, message: 'Ad not found' });

        const newViews = ad.views || 1;
        const newClicks = (ad.clicks || 0) + 1;
        const newCtrNum = ((newClicks / newViews) * 100).toFixed(2);
        const newCtrStr = `${newCtrNum}%`;

        await prisma.advertisement.update({
            where: { id },
            data: { clicks: newClicks, ctr: newCtrStr }
        });

        return res.status(200).json({ success: true, clicks: newClicks, ctr: newCtrStr });
    } catch (error) {
        console.error('Record ad click error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

const getPublicAds = async (req, res) => {
    try {
        const rows = await prisma.advertisement.findMany({
            where: { status: 'ACTIVE' },
            include: { branch: true, owner: true },
            orderBy: { createdAt: 'desc' }
        });
        return res.status(200).json({ success: true, data: rows.map(formatAd) });
    } catch (error) {
        console.error('Fetch public ads error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getAdvertisements, createAdvertisement, updateAdvertisement, updateAdStatus,
    deleteAdvertisement, getCommissions, markCommissionPaid, getPayments, getAdAnalytics,
    recordAdImpression, recordAdClick, getPublicAds
};
