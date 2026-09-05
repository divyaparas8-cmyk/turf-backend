const prisma = require('../../config/prisma');
const PaymentGatewayProvider = require('./PaymentGatewayProvider');

/**
 * Active by default. No live payment gateway is wired in yet, so the customer
 * pays the turf owner directly via the owner's own UPI/bank/QR account
 * (returned by getPayoutDestination) -- the full amount lands with the owner
 * outside the platform's books. Both settlement legs are confirmed manually:
 * the owner confirms they received the customer's payment, and the platform's
 * commission cut is then settled by debiting it from the owner's in-app
 * wallet (they already hold the full amount, so the platform "invoices" its
 * share rather than crediting money that was never routed through it).
 *
 * This is an honest reflection of "no gateway yet" -- not a simulation of one.
 */
class ManualGatewayProvider extends PaymentGatewayProvider {
    async getPayoutDestination(branchId) {
        const account = await prisma.ownerPayoutAccount.findUnique({ where: { branchId } });
        if (!account || !account.isActive) {
            return {
                configured: false,
                message: 'This venue has not added a payout account yet. Confirm payment details with the venue directly before paying.'
            };
        }
        return {
            configured: true,
            accountType: account.accountType,
            upiId: account.upiId,
            bankAccountHolder: account.bankAccountHolder,
            bankAccountNumber: account.bankAccountNumber,
            bankIfsc: account.bankIfsc,
            bankName: account.bankName,
            qrCodeImageUrl: account.qrCodeImageUrl
        };
    }

    async confirmOwnerLeg() {
        return { ownerPayoutStatus: 'CONFIRMED', ownerConfirmedAt: new Date() };
    }

    async confirmCommissionLeg() {
        return { commissionStatus: 'CONFIRMED', commissionConfirmedAt: new Date() };
    }
}

module.exports = ManualGatewayProvider;
