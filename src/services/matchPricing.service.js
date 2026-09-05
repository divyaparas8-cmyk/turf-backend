/**
 * MatchPricingService
 * Server-side authoritative calculation for match rent, per-mode share split,
 * and platform commission snapshot. Base price always comes from the real,
 * already-resolved Slot (or its BranchSport configuration) -- never a
 * hardcoded fallback figure.
 */
const prisma = require('../config/prisma');

class MatchPricingService {
    /**
     * @param baseHourlyPrice real regular/peak price resolved from the Slot being booked
     * @param durationHours number of hours the match runs
     * @param paymentMode one of FULL_PAY | SPLIT_50_50 | PER_PLAYER | DARE_TO_PLAY
     * @param totalPayingPlayers used to compute PER_PLAYER share
     */
    static async calculateMatchPricing({ baseHourlyPrice, durationHours = 1, paymentMode, totalPayingPlayers = 12, promoCode = null, branchId = null }) {
        const rawRent = Math.round(baseHourlyPrice * durationHours);
        let discountAmount = 0;

        if (promoCode && branchId) {
            const offer = await prisma.discountOffer.findFirst({
                where: {
                    promoCode: String(promoCode).trim().toUpperCase(),
                    branchId,
                    status: 'ACTIVE',
                    deletedAt: null
                }
            });
            if (offer) {
                const val = Number(offer.discountValue);
                if (offer.discountType === 'PERCENTAGE') {
                    discountAmount = Math.round((rawRent * val) / 100);
                    if (offer.maximumDiscountAmount && Number(offer.maximumDiscountAmount) > 0) {
                        discountAmount = Math.min(discountAmount, Number(offer.maximumDiscountAmount));
                    }
                } else if (offer.discountType === 'FLAT_AMOUNT') {
                    discountAmount = Math.min(val, rawRent);
                }
            }
        }

        const totalRent = Math.max(0, rawRent - discountAmount);

        let teamAShare = totalRent;
        let teamBShare = 0;
        let perPlayerAmount = 0;
        let depositAmount = 0;

        switch (paymentMode) {
            case 'FULL_PAY':
                teamAShare = totalRent;
                teamBShare = 0;
                break;
            case 'SPLIT_50_50':
                teamAShare = Math.round(totalRent / 2);
                teamBShare = totalRent - teamAShare;
                break;
            case 'DARE_TO_PLAY':
                depositAmount = 100;
                teamAShare = depositAmount;
                teamBShare = depositAmount;
                break;
            case 'PER_PLAYER': {
                const estimatedPlayers = totalPayingPlayers > 0 ? totalPayingPlayers : 12;
                perPlayerAmount = Math.round(totalRent / estimatedPlayers);
                teamAShare = perPlayerAmount;
                teamBShare = perPlayerAmount;
                break;
            }
            default:
                teamAShare = totalRent;
                teamBShare = 0;
        }

        const commissionRate = await this.getPlatformCommissionRate();
        const platformCommissionAmount = Math.round((totalRent * commissionRate) / 100);
        const ownerNetAmount = totalRent - platformCommissionAmount;

        return {
            baseHourlyPrice,
            durationHours,
            totalRent,
            teamAShare,
            teamBShare,
            perPlayerAmount,
            depositAmount,
            commissionRateSnapshot: commissionRate,
            commissionAmountSnapshot: platformCommissionAmount,
            ownerNetAmountSnapshot: ownerNetAmount,
            financialSnapshot: {
                basePrice: baseHourlyPrice,
                duration: durationHours,
                subtotal: totalRent,
                teamAShare,
                teamBShare,
                perPlayerAmount,
                depositAmount,
                commissionRate,
                platformCommission: platformCommissionAmount,
                ownerNet: ownerNetAmount
            }
        };
    }

    /** Real global commission rate from SystemSetting -- falls back to a documented platform default only if an admin has never configured one. */
    static async getPlatformCommissionRate() {
        const settings = await prisma.systemSetting.findUnique({ where: { id: 'global_commission' } });
        return settings ? Number(settings.defaultRate) : 5.0;
    }
}

module.exports = MatchPricingService;
