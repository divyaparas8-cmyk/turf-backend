const prisma = require('../../config/prisma');

/**
 * Public turf/venue catalog -- backed entirely by real Branch (+ BranchSport)
 * data. Never fabricates a fallback venue: an unmatched id is a real 404, and
 * an empty catalog is a real empty array.
 */
const CITY_DEFAULT_COORDS = {
    latitude: 22.7196,
    longitude: 75.8577
};

const getBranchCoords = (b) => {
    const lat = (b.latitude !== null && b.latitude !== undefined && !isNaN(Number(b.latitude)))
        ? Number(b.latitude)
        : CITY_DEFAULT_COORDS.latitude;
    const lng = (b.longitude !== null && b.longitude !== undefined && !isNaN(Number(b.longitude)))
        ? Number(b.longitude)
        : CITY_DEFAULT_COORDS.longitude;
    return { lat, lng };
};

const formatPublicTurf = (b) => {
    const activeBranchSports = (b.branchSports || []).filter(bs => bs.status === 'ACTIVE');

    // Compute true minimum regular price from active sports
    let minSportPrice = null;
    if (activeBranchSports.length > 0) {
        const validPrices = activeBranchSports
            .map(bs => Number(bs.regularPrice || bs.pricePerHour || 0))
            .filter(p => p > 0);
        if (validPrices.length > 0) {
            minSportPrice = Math.min(...validPrices);
        }
    }

    const effectiveMinPrice = minSportPrice !== null ? minSportPrice : Number(b.minPriceHourly || 1000);

    const mappedSports = activeBranchSports.length > 0
        ? activeBranchSports.map(bs => ({
            id: bs.sport?.id || bs.sportId,
            name: bs.sport?.name || 'Cricket',
            price: Number(bs.regularPrice || bs.pricePerHour || effectiveMinPrice),
            regularPrice: Number(bs.regularPrice || bs.pricePerHour || effectiveMinPrice),
            peakPrice: Number(bs.peakPrice || bs.peakHourPrice || Math.round(Number(bs.regularPrice || effectiveMinPrice) * 1.5))
        }))
        : [{ name: 'Cricket', price: effectiveMinPrice, regularPrice: effectiveMinPrice, peakPrice: Math.round(effectiveMinPrice * 1.5) }];

    const coords = getBranchCoords(b);

    return {
        id: b.id,
        _id: b.id,
        name: b.branchName,
        city: b.city || '',
        location: b.fullAddress || b.city || '',
        address: b.fullAddress || '',
        price: effectiveMinPrice,
        pricePerHour: effectiveMinPrice,
        minPriceHourly: effectiveMinPrice,
        openingTime: b.openingTime,
        closingTime: b.closingTime,
        dimensions: b.dimensionsSqFt ? `${b.dimensionsSqFt} Sq.Ft` : '',
        turfSize: b.dimensionsSqFt ? `${b.dimensionsSqFt} Sq.Ft` : '',
        surfaceType: b.surfaceType,
        sports: mappedSports,
        amenities: b.amenities || [],
        logo: b.logo || '',
        image: (Array.isArray(b.images) && b.images[0]) || b.logo || '',
        images: b.images || [],
        rating: Number(b.rating),
        reviewsCount: b.reviewCount,
        latitude: coords.lat,
        longitude: coords.lng,
        status: b.status
    };
};

const PUBLIC_INCLUDE = { branchSports: { include: { sport: true } } };

const getTurfs = async (req, res) => {
    try {
        const branches = await prisma.branch.findMany({
            where: { status: 'ACTIVE' },
            include: PUBLIC_INCLUDE,
            orderBy: { createdAt: 'desc' }
        });
        return res.json({ success: true, data: branches.map(formatPublicTurf) });
    } catch (error) {
        console.error('Error fetching turfs:', error);
        return res.status(500).json({ success: false, message: 'Server Error' });
    }
};

const haversineKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.asin(Math.sqrt(a));
};

const getTurfsNearby = async (req, res) => {
    try {
        const { lat, lng, radius = 50 } = req.query;
        if (!lat || !lng) {
            return res.status(400).json({ success: false, message: 'Latitude and Longitude are required' });
        }
        const latN = Number(lat), lngN = Number(lng), radiusN = Number(radius);

        const branches = await prisma.branch.findMany({
            where: { status: 'ACTIVE' },
            include: PUBLIC_INCLUDE
        });

        const withDistance = branches
            .map(b => {
                const coords = getBranchCoords(b);
                return { b, distance: haversineKm(latN, lngN, coords.lat, coords.lng) };
            })
            .filter(x => isNaN(radiusN) || radiusN >= 500 || x.distance <= radiusN)
            .sort((a, c) => a.distance - c.distance);

        return res.json({
            success: true,
            data: withDistance.map(x => ({ ...formatPublicTurf(x.b), distance: Number(x.distance.toFixed(2)) }))
        });
    } catch (error) {
        console.error('Error fetching nearby turfs:', error);
        return res.status(500).json({ success: false, message: 'Server Error' });
    }
};

const searchTurfs = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) return res.status(400).json({ success: false, message: 'Query is required' });

        const branches = await prisma.branch.findMany({
            where: {
                status: 'ACTIVE',
                OR: [{ branchName: { contains: query } }, { city: { contains: query } }]
            },
            include: PUBLIC_INCLUDE
        });
        return res.json({ success: true, data: branches.map(formatPublicTurf) });
    } catch (error) {
        console.error('Error searching turfs:', error);
        return res.status(500).json({ success: false, message: 'Server Error' });
    }
};

const filterTurfs = async (req, res) => {
    try {
        const { lat, lng, radius, sport, minPrice, maxPrice, rating, limit = 50 } = req.query;

        const where = { status: 'ACTIVE' };
        if (minPrice) where.minPriceHourly = { ...(where.minPriceHourly || {}), gte: Number(minPrice) };
        if (maxPrice) where.minPriceHourly = { ...(where.minPriceHourly || {}), lte: Number(maxPrice) };
        if (rating) where.rating = { gte: Number(rating) };
        if (sport) where.branchSports = { some: { status: 'ACTIVE', sport: { name: sport } } };

        let branches = await prisma.branch.findMany({ where, include: PUBLIC_INCLUDE });

        let results;
        if (lat && lng) {
            const latN = Number(lat), lngN = Number(lng);
            results = branches
                .map(b => {
                    const coords = getBranchCoords(b);
                    return { b, distance: haversineKm(latN, lngN, coords.lat, coords.lng) };
                });
            if (radius && radius !== 'All' && !isNaN(Number(radius)) && Number(radius) < 500) {
                results = results.filter(x => x.distance <= Number(radius));
            }
            results.sort((a, c) => a.distance - c.distance);
            results = results.map(x => ({ ...formatPublicTurf(x.b), distance: Number(x.distance.toFixed(2)) }));
        } else {
            results = branches
                .sort((a, b) => Number(b.rating) - Number(a.rating))
                .map(formatPublicTurf);
        }

        return res.json({ success: true, data: results.slice(0, Number(limit)) });
    } catch (error) {
        console.error('Error filtering turfs:', error);
        return res.status(500).json({ success: false, message: 'Server Error' });
    }
};

const getTurfById = async (req, res) => {
    try {
        const branch = await prisma.branch.findUnique({
            where: { id: req.params.id },
            include: { branchSports: { include: { sport: true } }, branchMedia: true }
        });

        if (!branch) {
            return res.status(404).json({ success: false, message: 'Turf not found.' });
        }

        const assignedUmpire = await prisma.user.findFirst({
            where: {
                staffBranchId: branch.id,
                role: 'UMPIRE',
                status: 'ACTIVE'
            },
            include: { umpireProfile: true }
        });

        return res.json({
            success: true,
            data: {
                ...formatPublicTurf(branch),
                hasActiveUmpire: !!assignedUmpire,
                activeUmpire: assignedUmpire ? {
                    id: assignedUmpire.id,
                    name: assignedUmpire.umpireProfile?.fullName || assignedUmpire.name,
                    fee: Number(assignedUmpire.umpireProfile?.dutyFeePerMatch || 300),
                    upiId: assignedUmpire.umpireProfile?.upiId || '',
                    qrImageUrl: assignedUmpire.umpireProfile?.qrImageUrl || null
                } : null,
                media: (branch.branchMedia || []).map(m => ({
                    id: m.id,
                    title: m.title,
                    type: m.mediaType,
                    url: m.mediaUrl,
                    isMainCover: m.isMainCover
                }))
            }
        });
    } catch (error) {
        console.error('Error fetching turf by id:', error);
        return res.status(500).json({ success: false, message: 'Server Error' });
    }
};

/**
 * Update a branch's photo/video gallery. Restricted to the branch's own owner
 * (or Super Admin).
 */
const updateTurfMedia = async (req, res) => {
    try {
        const { id } = req.params;
        const { media } = req.body;
        if (!media || !Array.isArray(media)) {
            return res.status(400).json({ success: false, message: 'Media array is required' });
        }
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Authentication required.' });
        }

        const branch = await prisma.branch.findUnique({ where: { id } });
        if (!branch) {
            return res.status(404).json({ success: false, message: 'Turf not found.' });
        }
        if (req.user.role !== 'SUPER_ADMIN' && branch.ownerUserId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Forbidden: you do not manage this branch.' });
        }

        await prisma.branch.update({ where: { id }, data: { images: media } });
        return res.json({ success: true, message: 'Turf media updated successfully', media });
    } catch (error) {
        console.error('Error updating turf media:', error);
        return res.status(500).json({ success: false, message: 'Server Error' });
    }
};

/**
 * Fetch all turfs/branches belonging to the authenticated logged-in Owner/Staff
 */
const getMyTurfs = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        let where = {};
        if (req.user.role === 'OWNER') {
            where = { ownerUserId: req.user.id };
        } else if (req.user.role === 'STAFF') {
            const user = await prisma.user.findUnique({ where: { id: req.user.id } });
            if (user?.staffBranchId) {
                where = { id: user.staffBranchId };
            } else {
                where = { ownerUserId: req.user.id };
            }
        } else if (req.user.role === 'SUPER_ADMIN') {
            where = { status: 'ACTIVE' };
        }

        const branches = await prisma.branch.findMany({
            where,
            include: {
                branchSports: {
                    include: { sport: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });


        return res.json({
            success: true,
            data: branches.map(b => ({
                id: b.id,
                branchName: b.branchName,
                name: b.branchName,
                city: b.city,
                fullAddress: b.fullAddress,
                minPriceHourly: b.minPriceHourly,
                openingTime: b.openingTime,
                closingTime: b.closingTime,
                sports: (b.branchSports || []).map(bs => ({
                    id: bs.id,
                    sportId: bs.sportId,
                    name: bs.sport?.name || 'Sport',
                    icon: bs.sport?.icon || '🏏',
                    regularPrice: bs.regularPrice,
                    peakPrice: bs.peakPrice,
                    totalCourts: bs.totalCourts
                }))
            }))
        });
    } catch (error) {
        console.error('Error in getMyTurfs:', error);
        return res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
    }
};

module.exports = {
    getTurfs,
    getMyTurfs,
    getTurfById,
    getTurfsNearby,
    searchTurfs,
    filterTurfs,
    updateTurfMedia
};

