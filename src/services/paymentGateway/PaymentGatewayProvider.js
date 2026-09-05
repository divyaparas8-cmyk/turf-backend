/**
 * Interface every payment gateway provider implements. Swapping which
 * provider is active (PaymentGatewayConfig.activeProvider) is meant to be the
 * only thing the rest of the codebase needs to know about -- controllers call
 * these methods, never a provider directly by name.
 */
class PaymentGatewayProvider {
    /** Returns where the customer should send money for this branch (UPI/bank/QR for manual, a linked account id for a real gateway). */
    async getPayoutDestination(_branchId) {
        throw new Error('getPayoutDestination() not implemented');
    }

    /** Owner confirms/records receipt of their leg of a payment. Returns the fields to persist on the MatchPayment/Payment row. */
    async confirmOwnerLeg(_context) {
        throw new Error('confirmOwnerLeg() not implemented');
    }

    /** Platform confirms/records receipt of its commission leg. Returns the fields to persist on the MatchPayment/Payment row. */
    async confirmCommissionLeg(_context) {
        throw new Error('confirmCommissionLeg() not implemented');
    }
}

module.exports = PaymentGatewayProvider;
