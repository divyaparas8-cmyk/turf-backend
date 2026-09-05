const prisma = require('../../config/prisma');

const genId = (prefix) => `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

const formatBranchSport = (bs) => ({
    id: bs.id,
    _id: bs.id,
    branchId: bs.branchId,
    sportId: {
        id: bs.sport.id,
        _id: bs.sport.id,
        name: bs.sport.name,
        icon: bs.sport.icon,
        category: bs.sport.category
    },
    name: bs.sport.name,
    icon: bs.sport.icon,
    price: bs.regularPrice,
    regularPrice: bs.regularPrice,
    peakPrice: bs.peakPrice,
    courts: bs.totalCourts,
    totalCourts: bs.totalCourts,
    openingTime: bs.openingTime ? bs.openingTime.substring(0, 5) : '06:00',
    closingTime: bs.closingTime ? bs.closingTime.substring(0, 5) : '22:00',
    slotDuration: bs.slotDuration,
    status: bs.status
});

/**
 * Verifies the requesting user owns the branch (or is Super Admin) before letting
 * them mutate a branch's sport configuration.
 */
const assertBranchAccess = async (branchId, user) => {
    if (!user) return { ok: false, code: 401, message: 'Authentication required.' };
    const roleNorm = (user.role || '').toUpperCase().replace(/[-_]/g, '');
    if (roleNorm === 'SUPERADMIN' || roleNorm === 'ADMIN') return { ok: true };

    const branch = await prisma.branch.findUnique({ where: { id: branchId }, include: { owner: true } });
    if (!branch) return { ok: false, code: 404, message: 'Branch not found.' };

    const isOwner = (
        branch.ownerUserId === user.id ||
        branch.ownerId === user.id ||
        branch.owner?.userId === user.id ||
        branch.owner?.id === user.id ||
        (user.email && branch.email === user.email) ||
        (user.email && branch.owner?.email === user.email) ||
        user.staffBranchId === branchId
    );

    if (!isOwner) return { ok: false, code: 403, message: 'Forbidden: you do not manage this branch.' };
    return { ok: true };
};

const getMasterSports = async (req, res) => {
    try {
        const sports = await prisma.sport.findMany({ orderBy: { name: 'asc' } });
        return res.status(200).json({ success: true, data: sports });
    } catch (error) {
        console.error('Fetch master sports error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error fetching master sports.' });
    }
};

const getBranchSports = async (req, res) => {
    const { branchId } = req.params;
    if (!branchId) {
        return res.status(400).json({ success: false, message: 'branchId path parameter is required.' });
    }

    try {
        let rows = await prisma.branchSport.findMany({
            where: { branchId },
            include: { sport: true }
        });

        if (rows.length === 0) {
            const branch = await prisma.branch.findUnique({ where: { id: branchId } });
            if (branch) {
                const basePrice = Number(branch.minPriceHourly) || 800;
                await prisma.branchSport.createMany({
                    data: [
                        {
                            id: genId('bs'),
                            branchId,
                            sportId: 'sp_master_02',
                            regularPrice: basePrice,
                            peakPrice: basePrice * 1.5,
                            totalCourts: 1,
                            openingTime: branch.openingTime || '06:00:00',
                            closingTime: branch.closingTime || '23:00:00',
                            slotDuration: 60,
                            status: 'ACTIVE'
                        }
                    ],
                    skipDuplicates: true
                });

                rows = await prisma.branchSport.findMany({
                    where: { branchId },
                    include: { sport: true }
                });
            }
        }

        const dataWithBookings = await Promise.all(rows.map(async (bs) => {
            const bookingsCount = await prisma.booking.count({
                where: { slot: { branchId: bs.branchId, sportId: bs.sportId } }
            }).catch(() => 0);
            return {
                ...formatBranchSport(bs),
                totalBookings: bookingsCount
            };
        }));

        return res.status(200).json({ success: true, data: dataWithBookings });
    } catch (error) {
        console.error('Fetch branch sports error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error fetching branch sports.' });
    }
};

const activateBranchSport = async (req, res) => {
    const { branchId, sportId, regularPrice, peakPrice, totalCourts, openingTime, closingTime, slotDuration } = req.body;

    if (!branchId || !sportId) {
        return res.status(400).json({ success: false, message: 'branchId and sportId are required.' });
    }

    try {
        const access = await assertBranchAccess(branchId, req.user);
        if (!access.ok) return res.status(access.code).json({ success: false, message: access.message });

        const sport = await prisma.sport.findUnique({ where: { id: sportId } });
        if (!sport) {
            return res.status(404).json({ success: false, message: 'Master sport not found.' });
        }

        const existing = await prisma.branchSport.findUnique({ where: { branchId_sportId: { branchId, sportId } } });
        if (existing) {
            return res.status(409).json({ success: false, message: 'This sport is already active for this branch.' });
        }

        const created = await prisma.branchSport.create({
            data: {
                id: genId('bs'),
                branchId,
                sportId,
                regularPrice: regularPrice || 1000,
                peakPrice: peakPrice || 1500,
                totalCourts: totalCourts || 1,
                openingTime: openingTime || '06:00:00',
                closingTime: closingTime || '22:00:00',
                slotDuration: slotDuration || 60,
                status: 'ACTIVE'
            },
            include: { sport: true }
        });

        // Sync parent branch record so customer cards and catalog APIs match
        if (regularPrice) {
            await prisma.branch.update({
                where: { id: branchId },
                data: {
                    minPriceHourly: Number(regularPrice),
                    openingTime: openingTime || undefined,
                    closingTime: closingTime || undefined
                }
            }).catch(e => console.error('Error syncing branch minPriceHourly:', e));
        }

        return res.status(201).json({ success: true, data: formatBranchSport(created), message: 'Sport activated successfully' });
    } catch (error) {
        console.error('Activate branch sport error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error activating branch sport.' });
    }
};

const updateBranchSport = async (req, res) => {
    const { id } = req.params;
    const { regularPrice, peakPrice, totalCourts, openingTime, closingTime, slotDuration } = req.body;

    try {
        const existing = await prisma.branchSport.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Branch sport configuration not found.' });
        }

        const access = await assertBranchAccess(existing.branchId, req.user);
        if (!access.ok) return res.status(access.code).json({ success: false, message: access.message });

        const updated = await prisma.branchSport.update({
            where: { id },
            data: {
                regularPrice: regularPrice ?? undefined,
                peakPrice: peakPrice ?? undefined,
                totalCourts: totalCourts ?? undefined,
                openingTime: openingTime ?? undefined,
                closingTime: closingTime ?? undefined,
                slotDuration: slotDuration ?? undefined
            },
            include: { sport: true }
        });

        // Sync parent branch record so customer cards and catalog APIs match
        if (regularPrice !== undefined) {
            await prisma.branch.update({
                where: { id: existing.branchId },
                data: {
                    minPriceHourly: Number(regularPrice),
                    openingTime: openingTime ? String(openingTime) : undefined,
                    closingTime: closingTime ? String(closingTime) : undefined
                }
            }).catch(e => console.error('Error syncing branch minPriceHourly:', e));
        }

        return res.status(200).json({ success: true, data: formatBranchSport(updated), message: 'Sport updated successfully' });
    } catch (error) {
        console.error('Update branch sport error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error updating branch sport.' });
    }
};

const changeSportStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['ACTIVE', 'INACTIVE'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Status field must be either ACTIVE or INACTIVE.' });
    }

    try {
        const existing = await prisma.branchSport.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Branch sport configuration not found.' });
        }
        const access = await assertBranchAccess(existing.branchId, req.user);
        if (!access.ok) return res.status(access.code).json({ success: false, message: access.message });

        await prisma.branchSport.update({ where: { id }, data: { status } });
        return res.status(200).json({ success: true, message: `Status updated to ${status}` });
    } catch (error) {
        console.error('Toggle status error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error updating status.' });
    }
};

const deleteBranchSport = async (req, res) => {
    const { id } = req.params;

    try {
        const existing = await prisma.branchSport.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Branch sport configuration not found.' });
        }
        const access = await assertBranchAccess(existing.branchId, req.user);
        if (!access.ok) return res.status(access.code).json({ success: false, message: access.message });

        await prisma.branchSport.delete({ where: { id } });
        return res.status(200).json({ success: true, message: 'Sport removed successfully' });
    } catch (error) {
        console.error('Delete branch sport error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error deleting branch sport.' });
    }
};

const uploadSportImage = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Please upload an image file.' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    return res.status(200).json({ success: true, message: 'Image uploaded successfully.', url: fileUrl, filename: req.file.filename });
};

module.exports = {
    getMasterSports,
    getBranchSports,
    activateBranchSport,
    updateBranchSport,
    changeSportStatus,
    deleteBranchSport,
    uploadSportImage
};
