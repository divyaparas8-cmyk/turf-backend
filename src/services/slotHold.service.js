/**
 * SlotHoldService
 * Manages temporary 5-minute slot holds via the SlotHold model. Atomicity comes
 * from a DB-level unique constraint on `slotId` -- at most one live hold can
 * exist per slot, so a concurrent create races safely: one wins, the other gets
 * a unique-constraint violation and is told the slot is held.
 */
const prisma = require('../config/prisma');

const genId = () => `HOLD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

class SlotHoldService {
    /**
     * Creates a temporary hold on a resolved (real) slot id.
     */
    static async createHold({ slotId, branchId, slotDate, startTime, endTime, heldByUserId, durationMinutes = 5 }) {
        // Clear out any existing hold on this slot so the user can re-lock seamlessly
        await prisma.slotHold.deleteMany({ where: { slotId } });

        try {
            const hold = await prisma.slotHold.create({
                data: {
                    id: genId(),
                    slotId,
                    branchId,
                    slotDate: new Date(slotDate),
                    startTime,
                    endTime,
                    heldByUserId,
                    durationMinutes,
                    expiresAt: new Date(Date.now() + durationMinutes * 60 * 1000)
                }
            });
            return { success: true, holdId: hold.id, expiresAt: hold.expiresAt };
        } catch (error) {
            if (error.code === 'P2002') {
                return { success: false, reason: 'SLOT_HELD_BY_ANOTHER_USER' };
            }
            throw error;
        }
    }

    /** Converts a hold into a real booking -- the hold's job is done, so it is removed. */
    static async convertHold(holdId) {
        if (!holdId) return false;
        await prisma.slotHold.deleteMany({ where: { id: holdId } });
        return true;
    }

    /** Releases a hold without converting it (payment failed / user backed out). */
    static async releaseHold(holdId) {
        if (!holdId) return false;
        await prisma.slotHold.deleteMany({ where: { id: holdId } });
        return true;
    }

    /** Background cleaner for expired holds. Returns number removed. */
    static async expireStaleHolds() {
        const result = await prisma.slotHold.deleteMany({ where: { expiresAt: { lte: new Date() } } });
        return result.count || 0;
    }
}

module.exports = SlotHoldService;
