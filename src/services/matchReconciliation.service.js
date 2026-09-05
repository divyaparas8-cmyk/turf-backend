/**
 * MatchReconciliationService
 * Background sweep for stale payment records. There is no live payment gateway
 * wired up yet (Razorpay/UPI signature verification is a documented future
 * integration), so this service never simulates a fake "gateway confirmed"
 * check -- it only expires genuinely stale PENDING records so they don't sit
 * forever, and finalizes any REFUND_PENDING rows that were already credited
 * to the user's wallet by the caller that set that status.
 */
const prisma = require('../config/prisma');

const STALE_PENDING_HOURS = 72;

class MatchReconciliationService {
    /**
     * Marks MatchPayments that have sat PENDING for too long (e.g. an unpaid
     * Dare-to-Play due balance) as FAILED so they stop showing as actionable.
     */
    static async reconcilePendingPayments() {
        const cutoff = new Date(Date.now() - STALE_PENDING_HOURS * 60 * 60 * 1000);
        const result = await prisma.matchPayment.updateMany({
            where: { paymentStatus: 'PENDING', createdAt: { lte: cutoff } },
            data: { paymentStatus: 'FAILED' }
        });
        return result.count || 0;
    }

    /**
     * Finalizes MatchPayments left in REFUND_PENDING -- the wallet credit for a
     * refund happens synchronously when the refund decision is made, so this is
     * a defensive cleanup for any that were left mid-flight (e.g. server crash).
     */
    static async reconcilePendingRefunds() {
        const pending = await prisma.matchPayment.findMany({ where: { paymentStatus: 'REFUND_PENDING' } });
        let count = 0;
        for (const payment of pending) {
            await prisma.matchPayment.update({ where: { id: payment.id }, data: { paymentStatus: 'REFUNDED' } });
            await prisma.match.updateMany({ where: { id: payment.matchId, matchStatus: { not: 'COMPLETED' } }, data: { matchStatus: 'CANCELLED' } });
            count++;
        }
        return count;
    }
}

module.exports = MatchReconciliationService;
