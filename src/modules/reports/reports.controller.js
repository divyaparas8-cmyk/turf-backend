const prisma = require('../../config/prisma');

const resolveOwnerBranchIds = async (user) => {
    if (!user || user.role === 'SUPERADMIN' || user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') return null;
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

const getOverviewReport = async (req, res) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const startOfToday = new Date(now.toDateString());

        const branchIds = await resolveOwnerBranchIds(req.user);
        const isSuperAdmin = branchIds === null;

        // Build scoped payment/booking where clauses
        const payScope = isSuperAdmin ? {} : branchIds.length > 0
            ? { booking: { slot: { branchId: { in: branchIds } } } } : { id: -1 };
        const bkScope = isSuperAdmin ? {} : branchIds.length > 0
            ? { slot: { branchId: { in: branchIds } } } : { id: -1 };

        const [
            totalRevAgg, monthlyRevAgg, prevMonthlyRevAgg, yearlyRevAgg,
            activeBranches, subPlans,
            totalBookings, todayBookings, monthlyBookings, cancelledBookings,
            totalOwners, totalStaff, totalCustomers, newRegistrations,
            totalBranches, inactiveBranches, suspendedBranches
        ] = await Promise.all([
            prisma.payment.aggregate({ where: { ...payScope, status: 'COMPLETED' }, _sum: { amount: true } }),
            prisma.payment.aggregate({ where: { ...payScope, status: 'COMPLETED', createdAt: { gte: startOfMonth } }, _sum: { amount: true } }),
            prisma.payment.aggregate({ where: { ...payScope, status: 'COMPLETED', createdAt: { gte: startOfPrevMonth, lt: startOfMonth } }, _sum: { amount: true } }),
            prisma.payment.aggregate({ where: { ...payScope, status: 'COMPLETED', createdAt: { gte: startOfYear } }, _sum: { amount: true } }),
            isSuperAdmin ? prisma.branch.findMany({ where: { status: 'ACTIVE' }, include: { subscriptionPlan: true } })
                : prisma.branch.findMany({ where: { status: 'ACTIVE', id: { in: branchIds } }, include: { subscriptionPlan: true } }),
            prisma.subscriptionPlan.findMany(),
            prisma.booking.count({ where: bkScope }),
            prisma.booking.count({ where: { ...bkScope, createdAt: { gte: startOfToday } } }),
            prisma.booking.count({ where: { ...bkScope, createdAt: { gte: startOfMonth } } }),
            prisma.booking.count({ where: { ...bkScope, status: 'REFUNDED' } }),
            isSuperAdmin ? prisma.owner.count() : prisma.owner.count({ where: { branches: { some: { id: { in: branchIds } } } } }),
            isSuperAdmin ? prisma.user.count({ where: { role: 'STAFF' } }) : prisma.user.count({ where: { role: 'STAFF', staffBranchId: { in: branchIds } } }),
            prisma.user.count({ where: { role: 'CUSTOMER' } }),
            prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
            isSuperAdmin ? prisma.branch.count() : branchIds.length,
            isSuperAdmin ? prisma.branch.count({ where: { status: 'INACTIVE' } }) : prisma.branch.count({ where: { status: 'INACTIVE', id: { in: branchIds } } }),
            isSuperAdmin ? prisma.branch.count({ where: { status: 'SUSPENDED' } }) : prisma.branch.count({ where: { status: 'SUSPENDED', id: { in: branchIds } } })
        ]);

        const subPlanRev = activeBranches.reduce((sum, b) => sum + Number(b.subscriptionPriceSnapshot ?? b.planPrice ?? b.subscriptionPlan?.monthlyPrice ?? 0), 0);
        const monthlyRevenue = Number(monthlyRevAgg._sum.amount || 0) + (isSuperAdmin ? subPlanRev : 0);
        const prevMonthlyRevenue = Number(prevMonthlyRevAgg._sum.amount || 0);
        const revenueGrowthPercentage = prevMonthlyRevenue > 0
            ? Math.round(((monthlyRevenue - prevMonthlyRevenue) / prevMonthlyRevenue) * 1000) / 10
            : (monthlyRevenue > 0 ? 100 : 0);

        return res.status(200).json({
            success: true,
            data: {
                totalRevenue: Number(totalRevAgg._sum.amount || 0) + (isSuperAdmin ? subPlanRev : 0),
                monthlyRevenue,
                yearlyRevenue: Number(yearlyRevAgg._sum.amount || 0) + (isSuperAdmin ? subPlanRev : 0),
                revenueGrowthPercentage,
                totalBookings, todayBookings, monthlyBookings, cancelledBookings,
                totalOwners, totalStaff, totalCustomers, newRegistrations,
                totalBranches, activeBranches: activeBranches.length, inactiveBranches, suspendedBranches
            }
        });
    } catch (error) {
        console.error('Fetch overview report error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error compiling overview report: ' + error.message });
    }
};

const groupByMonth = (rows, valueFn) => {
    const byMonth = {};
    const order = [];
    for (const r of rows) {
        const m = r.createdAt.toLocaleString('en-US', { month: 'short' });
        if (!(m in byMonth)) { byMonth[m] = 0; order.push(m); }
        byMonth[m] += valueFn(r);
    }
    return order.map(m => ({ month: m, value: byMonth[m] }));
};

const getRevenueReport = async (req, res) => {
    try {
        const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const branchIds = await resolveOwnerBranchIds(req.user);
        const payScope = branchIds === null ? {} : branchIds.length > 0
            ? { booking: { slot: { branchId: { in: branchIds } } } } : { id: -1 };
        const payments = await prisma.payment.findMany({
            where: { ...payScope, status: 'COMPLETED', createdAt: { gte: sixMonthsAgo } },
            select: { amount: true, createdAt: true }, orderBy: { createdAt: 'asc' }
        });
        const grouped = groupByMonth(payments, r => Number(r.amount));

        return res.status(200).json({
            success: true,
            data: grouped.map(g => ({ Month: g.month, Revenue: g.value, month: g.month, revenue: g.value, label: g.month, v: g.value, m: g.month }))
        });
    } catch (error) {
        console.error('Fetch revenue report error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error compiling revenue report: ' + error.message });
    }
};

const getBookingReport = async (req, res) => {
    try {
        const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const branchIds = await resolveOwnerBranchIds(req.user);
        const bkScope = branchIds === null ? {} : branchIds.length > 0
            ? { slot: { branchId: { in: branchIds } } } : { id: -1 };
        const bookings = await prisma.booking.findMany({
            where: { ...bkScope, createdAt: { gte: sixMonthsAgo } },
            select: { status: true, createdAt: true }, orderBy: { createdAt: 'asc' }
        });

        const byMonth = {};
        const order = [];
        for (const b of bookings) {
            const m = b.createdAt.toLocaleString('en-US', { month: 'short' });
            if (!(m in byMonth)) { byMonth[m] = { completed: 0, cancelled: 0 }; order.push(m); }
            if (b.status === 'COMPLETED') byMonth[m].completed++;
            if (b.status === 'REFUNDED') byMonth[m].cancelled++;
        }

        return res.status(200).json({ success: true, data: order.map(m => ({ month: m, ...byMonth[m] })) });
    } catch (error) {
        console.error('Fetch bookings report error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error compiling bookings report: ' + error.message });
    }
};

const getUserAnalyticsReport = async (req, res) => {
    try {
        const users = await prisma.user.findMany({ select: { role: true, createdAt: true }, orderBy: { createdAt: 'asc' } });
        const byMonth = {};
        const order = [];
        for (const u of users) {
            const m = u.createdAt.toLocaleString('en-US', { month: 'short' });
            if (!(m in byMonth)) { byMonth[m] = { OWNER: 0, STAFF: 0, CUSTOMER: 0, total: 0 }; order.push(m); }
            if (byMonth[m][u.role] !== undefined) byMonth[m][u.role]++;
            byMonth[m].total++;
        }
        return res.status(200).json({ success: true, data: order.map(m => ({ label: m, ...byMonth[m] })) });
    } catch (error) {
        console.error('User analytics error:', error);
        return res.status(500).json({ success: false, message: 'Error compiling user analytics: ' + error.message });
    }
};

const getSubscriptionAnalyticsReport = async (req, res) => {
    try {
        const branches = await prisma.branch.findMany({ where: { status: 'ACTIVE' }, include: { subscriptionPlan: true } });
        const byPlan = {};
        for (const b of branches) {
            if (!b.subscriptionPlan) continue;
            const key = b.subscriptionPlan.id;
            const branchPrice = Number(b.subscriptionPriceSnapshot ?? b.planPrice ?? b.subscriptionPlan.monthlyPrice ?? 0);
            if (!byPlan[key]) byPlan[key] = { planName: b.subscriptionPlan.planName, price: branchPrice, count: 0, revenue: 0 };
            byPlan[key].count++;
            byPlan[key].revenue += branchPrice;
        }
        const data = Object.values(byPlan).sort((a, b) => b.count - a.count)
            .map(p => ({ ...p, totalUsers: p.count, name: p.planName, value: p.count }));
        return res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Subscription analytics error:', error);
        return res.status(500).json({ success: false, message: 'Error compiling subscription analytics: ' + error.message });
    }
};

const getTopOwnersReport = async (req, res) => {
    try {
        const owners = await prisma.owner.findMany({ include: { branches: { include: { slots: { include: { bookings: true } } } } } });
        const data = owners.map(o => {
            const revenue = o.branches.reduce((sum, br) => sum + br.slots.reduce((s2, sl) => s2 + sl.bookings.filter(bk => bk.status === 'COMPLETED').reduce((s3, bk) => s3 + Number(bk.amount), 0), 0), 0);
            return { _id: o.id, id: o.id, fullName: o.fullName, ownerName: o.fullName, branchesCount: o.branches.length, branches: o.branches.length, revenue };
        }).sort((a, b) => b.revenue - a.revenue);
        return res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Top owners error:', error);
        return res.status(500).json({ success: false, message: 'Error compiling top owners: ' + error.message });
    }
};

const getTopBranchesReport = async (req, res) => {
    try {
        const branches = await prisma.branch.findMany({
            include: { owner: true, slots: { include: { bookings: true } } }
        });
        const data = branches.map(br => {
            const bookings = br.slots.flatMap(s => s.bookings).filter(bk => bk.status === 'COMPLETED');
            return {
                _id: br.id, id: br.id, branchName: br.branchName, city: br.city,
                ownerName: br.owner?.fullName || null,
                bookingsCount: bookings.length, bookings: bookings.length,
                revenue: bookings.reduce((sum, bk) => sum + Number(bk.amount), 0)
            };
        }).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
        return res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Top branches error:', error);
        return res.status(500).json({ success: false, message: 'Error compiling top branches: ' + error.message });
    }
};

/** Owners see only their own branches' sport popularity; Super Admin sees the whole platform. */
const getSportsReport = async (req, res) => {
    try {
        const isOwnerScoped = req.user?.role === 'OWNER';
        const bookingWhere = isOwnerScoped
            ? { status: 'COMPLETED', slot: { branch: { ownerUserId: req.user.id } } }
            : { status: 'COMPLETED' };

        const [sports, bookings] = await Promise.all([
            prisma.sport.findMany(),
            prisma.booking.findMany({ where: bookingWhere, select: { sportName: true, amount: true } })
        ]);

        const data = sports.map(sp => {
            const matched = bookings.filter(b => b.sportName === sp.name);
            return { sport: sp.name, name: sp.name, bookingsCount: matched.length, bookings: matched.length, revenue: matched.reduce((sum, b) => sum + Number(b.amount), 0) };
        }).filter(s => s.bookingsCount > 0);

        return res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Fetch sports report error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error compiling sports report: ' + error.message });
    }
};

/**
 * GET /api/v1/reports/occupancy-heatmap
 * Real weekday x hour-bucket occupancy percentage, computed from Slot rows
 * (BOOKED / total slots resolved for that weekday+hour). Owners see only their
 * own branches; Super Admin sees the whole platform. Returns an empty grid
 * (all zeros) rather than a fabricated pattern when there is no slot data yet.
 */
const HEATMAP_HOURS = [6, 7, 8, 9, 10, 16, 17, 18, 19, 20];
const HEATMAP_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const getOccupancyHeatmap = async (req, res) => {
    try {
        const isOwnerScoped = req.user?.role === 'OWNER';
        const slotWhere = isOwnerScoped ? { branch: { ownerUserId: req.user.id } } : {};

        const slots = await prisma.slot.findMany({ where: slotWhere, select: { slotDate: true, startTime: true, status: true } });

        // dayIndex 0=Mon..6=Sun to match HEATMAP_DAYS; JS getDay() is 0=Sun..6=Sat.
        const counts = HEATMAP_DAYS.map(() => HEATMAP_HOURS.map(() => ({ total: 0, booked: 0 })));

        for (const s of slots) {
            const jsDay = new Date(s.slotDate).getDay();
            const dayIdx = jsDay === 0 ? 6 : jsDay - 1;
            const hour = Number((s.startTime || '0:00').split(':')[0]);
            const hourIdx = HEATMAP_HOURS.indexOf(hour);
            if (hourIdx === -1) continue;
            counts[dayIdx][hourIdx].total++;
            if (s.status === 'BOOKED' || s.status === 'COMPLETED') counts[dayIdx][hourIdx].booked++;
        }

        const data = counts.map(row => row.map(c => c.total > 0 ? Math.round((c.booked / c.total) * 100) : 0));

        return res.status(200).json({ success: true, data, xLabels: HEATMAP_HOURS.map(h => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? 'AM' : 'PM'}`), yLabels: HEATMAP_DAYS });
    } catch (error) {
        console.error('Fetch occupancy heatmap error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error compiling occupancy heatmap: ' + error.message });
    }
};

const getDailyReport = async (req, res) => {
    try {
        const isOwnerScoped = req.user?.role === 'OWNER';
        const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const where = { status: 'COMPLETED', createdAt: { gte: thirtyDaysAgo } };
        if (isOwnerScoped) where.booking = { slot: { branch: { ownerUserId: req.user.id } } };

        const payments = await prisma.payment.findMany({ where, select: { amount: true, createdAt: true }, orderBy: { createdAt: 'asc' } });
        const byDay = {};
        const order = [];
        for (const p of payments) {
            const d = p.createdAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
            if (!(d in byDay)) { byDay[d] = 0; order.push(d); }
            byDay[d] += Number(p.amount);
        }
        return res.status(200).json({ success: true, data: order.map(d => ({ day: d, label: d, value: byDay[d], v: byDay[d] })) });
    } catch (error) {
        console.error('Fetch daily report error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error compiling daily report: ' + error.message });
    }
};

const getMonthlyReport = async (req, res) => {
    try {
        const isOwnerScoped = req.user?.role === 'OWNER';
        const twelveMonthsAgo = new Date(); twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
        const where = { status: 'COMPLETED', createdAt: { gte: twelveMonthsAgo } };
        if (isOwnerScoped) where.booking = { slot: { branch: { ownerUserId: req.user.id } } };

        const payments = await prisma.payment.findMany({ where, select: { amount: true, createdAt: true }, orderBy: { createdAt: 'asc' } });
        const grouped = groupByMonth(payments, r => Number(r.amount));
        return res.status(200).json({ success: true, data: grouped.map(g => ({ month: g.month, label: g.month, value: g.value, v: g.value })) });
    } catch (error) {
        console.error('Fetch monthly report error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error compiling monthly report: ' + error.message });
    }
};

const exportReport = async (req, res) => {
    const { format = 'csv', type = 'general', range = 'LAST_30_DAYS' } = req.query;
    try {
        const branchIds = await resolveOwnerBranchIds(req.user);
        const isSuperAdmin = branchIds === null;
        const bkScope = isSuperAdmin ? {} : branchIds.length > 0 ? { slot: { branchId: { in: branchIds } } } : { id: -1 };
        const payScope = isSuperAdmin ? {} : branchIds.length > 0 ? { booking: { slot: { branchId: { in: branchIds } } } } : { id: -1 };

        const [totalBranches, revAgg, totalBookings, totalOwners] = await Promise.all([
            isSuperAdmin ? prisma.branch.count({ where: { status: 'ACTIVE' } }) : branchIds.length,
            prisma.payment.aggregate({ where: { ...payScope, status: 'COMPLETED' }, _sum: { amount: true } }),
            prisma.booking.count({ where: bkScope }),
            isSuperAdmin ? prisma.owner.count() : prisma.owner.count({ where: { branches: { some: { id: { in: branchIds } } } } })
        ]);
        const totalRevenue = Number(revAgg._sum.amount || 0);

        if (format === 'csv') {
            const csv = [
                `SportMatrix Platform Report`, `Generated: ${new Date().toLocaleString('en-IN')}`,
                `Range: ${range}`, `Report Type: ${type.toUpperCase()}`, ``,
                `Metric,Value`, `Active Branches,${totalBranches}`,
                `Total Revenue,₹${totalRevenue.toLocaleString('en-IN')}`,
                `Total Bookings,${totalBookings}`, `Registered Owners,${totalOwners}`
            ].join('\n');
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="sportmatrix_report_${Date.now()}.csv"`);
            return res.send(csv);
        }

        const content = [
            `SportMatrix Platform Report`, `Generated: ${new Date().toLocaleString('en-IN')}`, `Range: ${range}`, ``,
            `Active Branches: ${totalBranches}`, `Total Revenue: ₹${totalRevenue.toLocaleString('en-IN')}`,
            `Total Bookings: ${totalBookings}`, `Registered Owners: ${totalOwners}`
        ].join('\n');
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="sportmatrix_report_${Date.now()}.txt"`);
        return res.send(content);
    } catch (error) {
        console.error('Export report error:', error);
        return res.status(500).json({ success: false, message: 'Error generating export: ' + error.message });
    }
};

module.exports = {
    getOverviewReport, getRevenueReport, getBookingReport, getUserAnalyticsReport,
    getSubscriptionAnalyticsReport, getTopOwnersReport, getTopBranchesReport, getSportsReport,
    getOccupancyHeatmap, getDailyReport, getMonthlyReport, exportReport
};
