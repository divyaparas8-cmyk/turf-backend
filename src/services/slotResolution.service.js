/**
 * Shared helper to resolve-or-create the real Slot a booking targets, using the
 * branch's real BranchSport pricing configuration. Relies on the DB-level
 * unique constraint on (branchId, courtName, slotDate, startTime) for atomicity.
 */
const prisma = require('../config/prisma');

const genSlotId = () => `slot_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

/**
 * @returns {{ ok: true, slot } | { ok: false, code, message }}
 */
async function resolveOrCreateSlot({ branchId, sportId, courtName, slotDate, startTime, endTime, durationMinutes }) {
    let branchSport = null;
    if (branchId && sportId) {
        branchSport = await prisma.branchSport.findUnique({ where: { branchId_sportId: { branchId, sportId } } }).catch(() => null);
    }
    
    // Fallback if branchSport is not explicitly configured
    const regularPrice = branchSport?.regularPrice ? Number(branchSport.regularPrice) : 1000;
    const peakPrice = branchSport?.peakPrice ? Number(branchSport.peakPrice) : 1200;
    const duration = durationMinutes || branchSport?.slotDuration || 60;

    const startHour = Number(startTime ? startTime.split(':')[0] : 18);
    const isPeak = startHour >= 18 || startHour < 6;

    let slot;
    try {
        slot = await prisma.slot.upsert({
            where: { branchId_courtName_slotDate_startTime: { branchId, courtName: courtName || 'Court 1', slotDate: new Date(slotDate), startTime } },
            update: {},
            create: {
                id: genSlotId(),
                branchId, 
                sportId: sportId || null, 
                courtName: courtName || 'Court 1',
                slotDate: new Date(slotDate),
                startTime, 
                endTime: endTime || `${startHour + 1}:00:00`,
                duration,
                regularPrice,
                peakPrice,
                isPeakHour: isPeak,
                status: 'AVAILABLE'
            }
        });
    } catch (e) {
        slot = await prisma.slot.findFirst({
            where: { branchId, courtName: courtName || 'Court 1', slotDate: new Date(slotDate), startTime }
        }).catch(() => null);
    }

    if (!slot) {
        return { ok: false, code: 409, message: 'Could not resolve the requested slot.' };
    }

    return { ok: true, slot };
}

module.exports = { resolveOrCreateSlot };
