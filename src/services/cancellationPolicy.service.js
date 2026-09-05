/**
 * CancellationPolicyService
 * Centralized policy engine calculating originalAmount, refundableAmount, cancellationFee,
 * platformShare, venueShare, taxAdjustment, and handling venue vs customer cancellation rules.
 */

class CancellationPolicyService {
    /**
     * Default platform cancellation policy parameters
     */
    static getDefaultPolicy() {
        return {
            full_refund_before_hours: 24,
            partial_refund_before_hours: 4,
            late_cancellation_penalty_percent: 50,
            no_show_refund_percent: 0,
            platform_cancel_refund_percent: 100,
            venue_cancel_refund_percent: 100,
            convenience_fee_refundable: false
        };
    }

    /**
     * Calculates cancellation quote based on match time and initiator.
     */
    static getCancellationQuote({ bookingAmount, matchStartTime, cancellationTime = new Date(), initiatedBy = 'CUSTOMER', customPolicy = null }) {
        const policy = customPolicy || this.getDefaultPolicy();
        const start = new Date(matchStartTime);
        const now = new Date(cancellationTime);
        const hoursDifference = (start.getTime() - now.getTime()) / (1000 * 60 * 60);

        let refundPercentage = 0;
        let cancellationFee = 0;

        if (initiatedBy === 'VENUE' || initiatedBy === 'PLATFORM') {
            // Venue or Platform cancellations receive 100% full refund
            refundPercentage = policy.platform_cancel_refund_percent;
        } else {
            // Customer cancellations based on hours remaining
            if (hoursDifference >= policy.full_refund_before_hours) {
                refundPercentage = 100;
            } else if (hoursDifference >= policy.partial_refund_before_hours) {
                refundPercentage = 100 - policy.late_cancellation_penalty_percent;
            } else {
                refundPercentage = policy.no_show_refund_percent;
            }
        }

        const refundableAmount = Math.round((bookingAmount * refundPercentage) / 100);
        cancellationFee = bookingAmount - refundableAmount;

        const platformShare = Math.round(cancellationFee * 0.20);
        const venueShare = cancellationFee - platformShare;

        return {
            originalAmount: bookingAmount,
            refundableAmount,
            cancellationFee,
            refundPercentage,
            platformShare,
            venueShare,
            initiatedBy,
            hoursDifference: Math.max(0, hoursDifference),
            policySnapshot: policy
        };
    }
}

module.exports = CancellationPolicyService;
