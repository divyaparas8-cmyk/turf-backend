const prisma = require('../../config/prisma');

const genId = () => `DISP-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

const typeLabel = { ESCROW: 'Escrow', REFUND: 'Refund', MATCH_RESULT: 'Match Result', DAMAGE: 'Damage', CANCELLATION: 'Cancellation' };
const statusLabel = { OPEN: 'Open', IN_REVIEW: 'In Review', RESOLVED: 'Resolved', REJECTED: 'Rejected' };

const formatDispute = (d) => ({
    id: d.id,
    user: d.user?.name || d.customerName || 'Platform User',
    email: d.user?.email || '',
    userId: d.userId,
    bookingId: d.bookingId,
    matchId: d.matchId,
    type: typeLabel[d.type] || d.type,
    rawType: d.type,
    amount: Number(d.amount || 0),
    reason: d.reason,
    status: statusLabel[d.status] || d.status,
    rawStatus: d.status,
    notes: d.resolutionNotes || '',
    resolvedBy: d.resolvedByUser?.name || '',
    resolutionDate: d.resolutionDate,
    refundToWallet: d.refundToWallet,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt
});

const getDisputes = async (req, res) => {
    try {
        const { status, type, page = 1, limit = 20, search = '' } = req.query;

        const where = {};
        if (status && status !== 'ALL') where.status = status.toUpperCase();
        if (type && type !== 'ALL') where.type = type.toUpperCase();
        if (search) {
            where.OR = [
                { customerName: { contains: search } },
                { reason: { contains: search } },
                { id: { contains: search } }
            ];
        }

        const pageNum = Number(page) || 1;
        const limitNum = Number(limit) || 20;

        const [total, rows] = await Promise.all([
            prisma.dispute.count({ where }),
            prisma.dispute.findMany({
                where,
                include: { user: true, resolvedByUser: true },
                orderBy: [{ createdAt: 'desc' }],
                skip: (pageNum - 1) * limitNum,
                take: limitNum
            })
        ]);

        // OPEN/IN_REVIEW first, matching original ordering intent
        const priority = { OPEN: 1, IN_REVIEW: 2, RESOLVED: 3, REJECTED: 4 };
        rows.sort((a, b) => (priority[a.status] - priority[b.status]) || (b.createdAt - a.createdAt));

        const disputes = rows.map(formatDispute);
        return res.status(200).json({
            success: true,
            count: disputes.length,
            total,
            pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) || 1 },
            data: disputes
        });
    } catch (error) {
        console.error('[getDisputes] Error:', error);
        return res.status(500).json({ success: false, message: 'Error fetching disputes: ' + error.message });
    }
};

const getDisputeById = async (req, res) => {
    try {
        const dispute = await prisma.dispute.findUnique({
            where: { id: req.params.id },
            include: { user: true, resolvedByUser: true }
        });
        if (!dispute) {
            return res.status(404).json({ success: false, message: 'Dispute not found.' });
        }
        return res.status(200).json({ success: true, data: formatDispute(dispute) });
    } catch (error) {
        console.error('[getDisputeById] Error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

const createDispute = async (req, res) => {
    try {
        const { bookingId, matchId, customerName, type = 'ESCROW', amount = 0, reason, refundToWallet = false } = req.body;

        if (!reason || !reason.trim()) {
            return res.status(400).json({ success: false, message: 'Reason is required.' });
        }

        const dispute = await prisma.dispute.create({
            data: {
                id: genId(),
                userId: req.user?.id || null,
                bookingId: bookingId ? Number(bookingId) : null,
                matchId: matchId || null,
                customerName: customerName || req.user?.name || 'Platform User',
                type: type.toUpperCase(),
                amount: Number(amount),
                reason: reason.trim(),
                status: 'OPEN',
                refundToWallet: !!refundToWallet
            }
        });

        return res.status(201).json({ success: true, message: 'Dispute raised successfully.', data: { id: dispute.id } });
    } catch (error) {
        console.error('[createDispute] Error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

const updateDisputeStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const allowed = ['OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED'];
        if (!allowed.includes((status || '').toUpperCase())) {
            return res.status(400).json({ success: false, message: `Status must be one of: ${allowed.join(', ')}` });
        }

        const updated = await prisma.dispute.update({ where: { id: req.params.id }, data: { status: status.toUpperCase() } }).catch(() => null);
        if (!updated) {
            return res.status(404).json({ success: false, message: 'Dispute not found.' });
        }
        return res.status(200).json({ success: true, message: `Dispute status updated to ${status.toUpperCase()}` });
    } catch (error) {
        console.error('[updateDisputeStatus] Error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

const resolveDispute = async (req, res) => {
    try {
        const { notes, refundToWallet = false } = req.body;
        if (!notes || !notes.trim()) {
            return res.status(400).json({ success: false, message: 'Resolution notes are required.' });
        }

        const dispute = await prisma.dispute.findUnique({ where: { id: req.params.id } });
        if (!dispute) {
            return res.status(404).json({ success: false, message: 'Dispute not found.' });
        }

        const updated = await prisma.dispute.update({
            where: { id: req.params.id },
            data: {
                status: 'RESOLVED',
                resolutionNotes: notes.trim(),
                resolvedByUserId: req.user?.id || null,
                refundToWallet: !!refundToWallet,
                resolutionDate: new Date()
            }
        });

        // Connectivity: If linked to booking or match, update status accordingly upon resolution
        if (updated.bookingId && refundToWallet) {
            await prisma.booking.update({
                where: { id: updated.bookingId },
                data: { status: 'REFUNDED', notes: `Refunded via Dispute ${updated.id}` }
            }).catch(() => null);
        }
        if (updated.matchId && refundToWallet) {
            await prisma.match.update({
                where: { id: updated.matchId },
                data: { matchStatus: 'CANCELLED' }
            }).catch(() => null);
        }

        return res.status(200).json({ 
            success: true, 
            message: 'Dispute resolved successfully.', 
            data: { id: updated.id, status: 'RESOLVED', resolvedAt: updated.resolutionDate } 
        });
    } catch (error) {
        console.error('[resolveDispute] Error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

const getDisputeStats = async (req, res) => {
    try {
        const [total, open, inReview, resolved, rejected, amountAgg] = await Promise.all([
            prisma.dispute.count(),
            prisma.dispute.count({ where: { status: 'OPEN' } }),
            prisma.dispute.count({ where: { status: 'IN_REVIEW' } }),
            prisma.dispute.count({ where: { status: 'RESOLVED' } }),
            prisma.dispute.count({ where: { status: 'REJECTED' } }),
            prisma.dispute.aggregate({ _sum: { amount: true } })
        ]);

        return res.status(200).json({
            success: true,
            data: { total, open, inReview, resolved, rejected, totalAmount: Number(amountAgg._sum.amount || 0) }
        });
    } catch (error) {
        console.error('[getDisputeStats] Error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { getDisputes, getDisputeById, createDispute, updateDisputeStatus, resolveDispute, getDisputeStats };
