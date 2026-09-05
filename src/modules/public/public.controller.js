// Public marketplace controller — no authentication required.
// Returns only ACTIVE branches with public-safe fields.
// req.user is never read here; a token has zero effect on results.

const prisma = require('../../config/prisma');

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
        const hStr = h < 10 ? ('0' + h) : ('' + h);
        return hStr + ':' + m + ' ' + ampm;
    }
    return clean;
};

/**
 * Format a branch record into a public-safe payload.
 * Omits: revenue, commission, planPrice, owner email/phone, gstNumber, alternateMobile.
 */
const formatPublicBranch = (b) => {
    const activeSports = (b.branchSports || []).filter(bs => bs.status === 'ACTIVE');
    let minSportPrice = null;
    if (activeSports.length > 0) {
        const validPrices = activeSports.map(bs => Number(bs.regularPrice || 0)).filter(p => p > 0);
        if (validPrices.length > 0) minSportPrice = Math.min(...validPrices);
    }
    const effectiveMinPrice = minSportPrice !== null ? minSportPrice : Number(b.minPriceHourly || 1000);

    const sports = activeSports.map(bs => ({
        id: bs.id,
        sportId: bs.sportId,
        name: bs.sport ? bs.sport.name : (bs.name || 'Cricket'),
        icon: bs.sport ? (bs.sport.icon || 'xx') : (bs.icon || 'xx'),
        regularPrice: Number(bs.regularPrice),
        peakPrice: Number(bs.peakPrice),
        slotDuration: bs.slotDuration,
        totalCourts: bs.totalCourts,
    }));

    const activeOffers = (b.discountOffers || [])
        .filter(d => d.status === 'ACTIVE')
        .sort((a, x) => new Date(x.updatedAt || 0) - new Date(a.updatedAt || 0));

    return {
        id: b.id,
        _id: b.id,
        branchName: b.branchName,
        description: b.description || '',
        city: b.city || '',
        state: b.state || '',
        country: b.country || 'India',
        fullAddress: b.fullAddress || '',
        latitude: b.latitude,
        longitude: b.longitude,
        pricePerHour: effectiveMinPrice,
        price: effectiveMinPrice,
        minPriceHourly: effectiveMinPrice,
        peakPricePerHour: activeSports[0] && activeSports[0].peakPrice ? Number(activeSports[0].peakPrice) : Math.round(effectiveMinPrice * 1.5),
        peakPrice: activeSports[0] && activeSports[0].peakPrice ? Number(activeSports[0].peakPrice) : Math.round(effectiveMinPrice * 1.5),
        openingTime: formatTime12h(b.openingTime),
        closingTime: formatTime12h(b.closingTime),
        turfSize: (b.dimensionsSqFt || 5000).toLocaleString('en-IN') + ' Sq.Ft',
        dimensions: (b.dimensionsSqFt || 5000).toLocaleString('en-IN') + ' Sq.Ft',
        dimensionsSqFt: b.dimensionsSqFt || 5000,
        surfaceType: b.surfaceType || '',
        rating: Number(b.rating || 0),
        reviewCount: b.reviewCount || 0,
        amenities: b.amenities || [],
        logo: b.logo || '',
        images: b.images || [],
        sports,
        discountOffer: activeOffers[0] ? (activeOffers[0].title || '') : '',
        couponCode: activeOffers[0] ? (activeOffers[0].promoCode || '') : '',
        discount_offer: activeOffers[0] ? (activeOffers[0].title || '') : '',
        coupon_code: activeOffers[0] ? (activeOffers[0].promoCode || '') : '',
        status: 'ACTIVE',
    };
};

/**
 * GET /api/v1/public/branches
 * List all ACTIVE branches for the public marketplace.
 * Supports ?search=, ?city=, ?limit=, ?page= query params.
 * A token in the Authorization header has zero effect on results.
 */
const getPublicBranches = async (req, res) => {
    try {
        const search = req.query.search;
        const city = req.query.city;
        const page = req.query.page || 1;
        const limit = req.query.limit || 100;

        const and = [{ status: 'ACTIVE' }];

        if (search) {
            and.push({ OR: [{ branchName: { contains: search } }, { city: { contains: search } }] });
        }
        if (city) {
            and.push({ city: { contains: city } });
        }

        const pageNum = Math.max(1, Number(page) || 1);
        const limitNum = Math.min(200, Math.max(1, Number(limit) || 100));

        const count = await prisma.branch.count({ where: { AND: and } });
        const rows = await prisma.branch.findMany({
            where: { AND: and },
            include: { branchSports: { include: { sport: true } }, discountOffers: true },
            orderBy: { createdAt: 'desc' },
            skip: (pageNum - 1) * limitNum,
            take: limitNum,
        });

        const branches = rows.map(formatPublicBranch);

        return res.status(200).json({
            success: true,
            data: {
                branches,
                pagination: { total: count, page: pageNum, limit: limitNum, pages: Math.ceil(count / limitNum) || 1 }
            }
        });
    } catch (error) {
        console.error('Public branches fetch error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error.' });
    }
};

/**
 * GET /api/v1/public/branches/:id
 * Fetch a single ACTIVE branch by ID for the public turf detail page.
 * Returns 404 if branch does not exist or is not ACTIVE.
 * A token in the Authorization header has zero effect on results.
 */
const getPublicBranchById = async (req, res) => {
    try {
        const branch = await prisma.branch.findFirst({
            where: { id: req.params.id, status: 'ACTIVE' },
            include: { branchSports: { include: { sport: true } }, discountOffers: true }
        });

        if (!branch) {
            return res.status(404).json({ success: false, message: 'Branch not found or not available.' });
        }

        return res.status(200).json({ success: true, data: formatPublicBranch(branch) });
    } catch (error) {
        console.error('Public branch detail fetch error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error.' });
    }
};

module.exports = { getPublicBranches, getPublicBranchById };
