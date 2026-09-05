/**
 * MatchExpiryService
 * Background scheduled worker: releases expired slot holds back to AVAILABLE,
 * expires matches past their opponent payment deadline, and expires stale
 * opponent invite tokens.
 */
const prisma = require('../config/prisma');
const SlotHoldService = require('./slotHold.service');

class MatchExpiryService {
    static async runExpiryTasks() {
        try {
            const expiredHolds = await this.releaseExpiredHoldsAndSlots();
            const expiredMatches = await this.expireStaleOpponentDeadlines();
            const expiredInvites = await this.expireStaleInvites();

            if (expiredHolds > 0 || expiredMatches > 0 || expiredInvites > 0) {
                console.log(`[MatchExpiryService] Cleaned: ${expiredHolds} holds, ${expiredMatches} match deadlines, ${expiredInvites} invites.`);
            }
        } catch (error) {
            console.error('[MatchExpiryService] Error running background expiry tasks:', error);
        }
    }

    /** Expired holds also release their underlying Slot back to AVAILABLE (if still just held, not booked). */
    static async releaseExpiredHoldsAndSlots() {
        const expired = await prisma.slotHold.findMany({ where: { expiresAt: { lte: new Date() } } });
        for (const hold of expired) {
            if (hold.slotId) {
                await prisma.slot.updateMany({ where: { id: hold.slotId, status: 'AVAILABLE' }, data: {} });
            }
        }
        return SlotHoldService.expireStaleHolds();
    }

    /** Matches still SLOT_HELD past their opponent payment deadline are expired and their slot released. */
    static async expireStaleOpponentDeadlines() {
        const staleMatches = await prisma.match.findMany({
            where: {
                matchStatus: 'SLOT_HELD',
                opponentPaymentDeadline: { not: null, lte: new Date() }
            }
        });

        let count = 0;
        for (const match of staleMatches) {
            await prisma.$transaction(async (tx) => {
                await tx.match.update({ where: { id: match.id }, data: { matchStatus: 'EXPIRED' } });
                if (match.slotId) {
                    await tx.slot.updateMany({ where: { id: match.slotId, status: 'AVAILABLE' }, data: { status: 'AVAILABLE' } });
                }
                await tx.slotHold.deleteMany({ where: { matchId: match.id } });
            });
            count++;
        }
        return count;
    }

    /** Opponent invite tokens past their expiry are marked EXPIRED. */
    static async expireStaleInvites() {
        const result = await prisma.match.updateMany({
            where: { inviteStatus: 'SENT', inviteExpiresAt: { not: null, lte: new Date() } },
            data: { inviteStatus: 'EXPIRED' }
        });
        return result.count || 0;
    }
}

module.exports = MatchExpiryService;
