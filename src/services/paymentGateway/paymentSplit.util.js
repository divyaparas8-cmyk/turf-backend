/**
 * Shared commission/owner split math -- used by every PaymentGatewayProvider
 * (manual today, a real gateway later) so the split calculation itself never
 * differs by provider, only how each leg gets confirmed does.
 */
const prisma = require('../../config/prisma');

async function getPlatformCommissionRate() {
    const settings = await prisma.systemSetting.findUnique({ where: { id: 'global_commission' } });
    return settings ? Number(settings.defaultRate) : 5.0;
}

/**
 * @param totalAmount the gross amount being paid for this leg
 * @param commissionRateOverride optional rate (e.g. Match.commissionRateSnapshot) to honor a rate locked in at booking time
 */
async function computeSplit(totalAmount, commissionRateOverride) {
    const commissionRate = (commissionRateOverride !== undefined && commissionRateOverride !== null && !isNaN(Number(commissionRateOverride)))
        ? Number(commissionRateOverride)
        : await getPlatformCommissionRate();

    const commissionAmount = Math.round((Number(totalAmount) * commissionRate) / 100);
    const ownerAmount = Number(totalAmount) - commissionAmount;

    return { commissionRate, commissionAmount, ownerAmount };
}

module.exports = { computeSplit, getPlatformCommissionRate };
