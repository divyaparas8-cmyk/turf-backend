const prisma = require('../../config/prisma');
const MatchSettlementService = require('../../services/matchSettlement.service');
const { emitToBranch, emitToUser } = require('../../realtime/socket');

const genId = (prefix) => `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
const genTicket = () => `REF-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

const formatRefund = (r) => ({
    id: r.id,
    ticketNumber: r.ticketNumber,
    booking: r.booking?.bookingCode || (r.bookingId ? `BK-${r.bookingId}` : ''),
    bookingId: r.bookingId,
    customer: r.customerName,
    phone: r.customerPhone,
    amount: Number(r.amount),
    reason: r.reason,
    status: r.status,
    adminNotes: r.adminNotes,
    requestedDate: r.createdAt,
    branchId: r.branchId
});

/**
 * Resolves the current user's own branch id. The JWT payload only carries
 * {id, name, email, role} -- staffBranchId/ownerUserId live on the User row,
 * so this looks them up rather than trusting anything client-supplied.
 */
const resolveOwnBranchId = async (userId) => {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { staffBranchId: true } });
    if (user?.staffBranchId) return user.staffBranchId;
    const ownerBranch = await prisma.branch.findFirst({ where: { ownerUserId: userId } });
    return ownerBranch?.id || null;
};

/** Scope: Staff/Owner see only their own branch's refund requests; Super Admin sees all. */
const resolveBranchScope = async (req) => {
    if (req.user.role === 'SUPER_ADMIN') return {};
    const branchId = await resolveOwnBranchId(req.user.id);
    return branchId ? { branchId } : { branchId: '__none__' };
};

const getRefundRequests = async (req, res) => {
    try {
        const where = await resolveBranchScope(req);
        const rows = await prisma.refundRequest.findMany({ where, include: { booking: true }, orderBy: { createdAt: 'desc' } });
        return res.status(200).json({ success: true, data: rows.map(formatRefund) });
    } catch (error) {
        console.error('Fetch refund requests error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error fetching refund requests: ' + error.message });
    }
};

const createRefundRequest = async (req, res) => {
    const { bookingId, customerName, customerPhone, amount, reason, branchId } = req.body;
    if (!customerName || !amount || !reason) {
        return res.status(400).json({ success: false, message: 'customerName, amount, and reason are required.' });
    }

    try {
        const resolvedBranchId = branchId || await resolveOwnBranchId(req.user.id);
        if (!resolvedBranchId) {
            return res.status(400).json({ success: false, message: 'No branch could be resolved for this refund request. Provide branchId explicitly.' });
        }

        const created = await prisma.refundRequest.create({
            data: {
                id: genId('ref'),
                ticketNumber: genTicket(),
                branchId: resolvedBranchId,
                bookingId: bookingId ? Number(bookingId) : null,
                customerName: customerName.trim(),
                customerPhone: customerPhone || null,
                amount: Number(amount),
                reason: reason.trim(),
                requestedByStaffId: req.user.id,
                status: 'PENDING_REVIEW'
            }
        });

        emitToBranch(resolvedBranchId, 'refund:new', { id: created.id });
        return res.status(201).json({ success: true, message: 'Refund request submitted.', data: formatRefund(created) });
    } catch (error) {
        console.error('Create refund request error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error creating refund request: ' + error.message });
    }
};

/**
 * PATCH /api/v1/refunds/:id/status -- Owner/Super Admin approve/reject/settle.
 * Marking REFUNDED credits the customer's real wallet (if the booking has a
 * linked account) via the same ledger path booking cancellations use.
 */
const updateRefundStatus = async (req, res) => {
    const { id } = req.params;
    const { status, adminNotes } = req.body;
    if (!['APPROVED', 'REJECTED', 'REFUNDED'].includes(status)) {
        return res.status(400).json({ success: false, message: 'status must be APPROVED, REJECTED, or REFUNDED.' });
    }

    try {
        const refund = await prisma.refundRequest.findUnique({ where: { id }, include: { booking: true } });
        if (!refund) {
            return res.status(404).json({ success: false, message: 'Refund request not found.' });
        }

        const updated = await prisma.$transaction(async (tx) => {
            const row = await tx.refundRequest.update({ where: { id }, data: { status, adminNotes: adminNotes || refund.adminNotes, approvedByUserId: req.user.id } });

            if (status === 'REFUNDED' && refund.refundedToWallet && refund.booking?.userId) {
                await MatchSettlementService.postWalletTransaction(tx, {
                    userId: refund.booking.userId,
                    type: 'REFUND',
                    description: `Refund ${refund.ticketNumber}: ${refund.reason}`,
                    amount: Number(refund.amount)
                });
            }

            return row;
        });

        emitToBranch(refund.branchId, 'refund:updated', { id, status });
        if (refund.booking?.userId) emitToUser(refund.booking.userId, 'wallet:updated', {});

        return res.status(200).json({ success: true, message: `Refund request ${status.toLowerCase()}.`, data: formatRefund(updated) });
    } catch (error) {
        console.error('Update refund status error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error updating refund status: ' + error.message });
    }
};

module.exports = { getRefundRequests, createRefundRequest, updateRefundStatus };
