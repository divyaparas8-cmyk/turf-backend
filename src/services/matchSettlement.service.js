/**
 * MatchSettlementService
 * Real settlement bookkeeping using the Wallet/WalletTransaction models (customer
 * side) and the Owner's running revenue/commission totals (owner side) --
 * replaces the old bespoke financial_ledger/match_settlements tables, which no
 * longer exist in the Prisma schema.
 */
const prisma = require('../config/prisma');

const genTxCode = () => `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
const genId = (prefix) => `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

class MatchSettlementService {
    /** Credits (or debits) a user's wallet and records the transaction. */
    static async postWalletTransaction(tx, { userId, type, description, amount, status = 'Completed' }) {
        if (!userId) return null;

        let wallet = await tx.wallet.findUnique({ where: { userId } });
        if (!wallet) {
            wallet = await tx.wallet.create({ data: { id: genId('wal'), userId, balance: 0 } });
        }

        const signedAmount = ['REFUND', 'TOP_UP', 'PRIZE'].includes(type) ? amount : -amount;

        await tx.wallet.update({
            where: { id: wallet.id },
            data: {
                balance: { increment: signedAmount },
                ...(type === 'COMMISSION' ? { totalCommissionPaid: { increment: amount } } : {})
            }
        });

        return tx.walletTransaction.create({
            data: {
                walletId: wallet.id,
                transactionCode: genTxCode(),
                type,
                description,
                grossAmount: amount,
                platformCommission: type === 'COMMISSION' ? amount : 0,
                settledNet: amount,
                amount,
                status
            }
        });
    }

    /**
     * Debits the branch owner's platform wallet for their commission owed on a
     * settled booking payment. In MANUAL gateway mode the customer already paid
     * the owner directly (in full), so the platform "invoices" its cut here
     * rather than crediting money that was never routed through it -- this is
     * what actually turns Match.commissionRateSnapshot / MatchPayment split
     * fields into a real ledger entry instead of an unused snapshot.
     */
    static async postCommissionSettlement(tx, { branchId, matchId, commissionAmount, description }) {
        if (!branchId || !commissionAmount) return null;
        const branch = await tx.branch.findUnique({ where: { id: branchId } });
        if (!branch || !branch.ownerUserId) return null;

        return this.postWalletTransaction(tx, {
            userId: branch.ownerUserId,
            type: 'COMMISSION',
            description: description || `Platform commission for match ${matchId}`,
            amount: Number(commissionAmount)
        });
    }

    /**
     * Called once a single MatchPayment row's owner-receipt AND commission legs
     * are both CONFIRMED (see MatchPaymentController.confirmOwnerReceipt /
     * confirmCommission). Settles per payment row (not per match) so multi-payment
     * matches -- 50/50 split, per-player, dare deposits -- never double-count:
     * credits the branch owner's running revenue/commission totals and posts the
     * real commission debit to their platform wallet. Only fires once the money
     * is genuinely settled, not the instant the slot is locked.
     */
    static async settlePaymentAmount(tx, { branchId, matchId, captainUserId, ownerAmount, commissionAmount, commissionRate }) {
        if (!branchId) return;
        const branch = await tx.branch.findUnique({ where: { id: branchId } });
        if (!branch || !branch.ownerId) return;

        await tx.owner.update({
            where: { id: branch.ownerId },
            data: {
                totalRevenueGenerated: { increment: Number(ownerAmount) },
                totalCommissionEarned: { increment: Number(commissionAmount) }
            }
        });

        await this.postCommissionSettlement(tx, {
            branchId,
            matchId,
            commissionAmount,
            description: `Platform commission (${commissionRate}%) for match ${matchId}`
        });

        await tx.activityLog.create({
            data: {
                id: genId('log'),
                userId: captainUserId || null,
                action: 'PAYMENT_SETTLED',
                details: `Match ${matchId} payment settled. Owner net: ${ownerAmount}, platform commission: ${commissionAmount} (${commissionRate}%).`,
                entityType: 'Match',
                entityId: matchId
            }
        });
    }

    /**
     * Dare-to-Play settlement: the deposit is always refunded to both captains
     * (it was just a good-faith hold), the winner owes nothing further, and the
     * loser is charged the full rent as a new due-balance MatchPayment that they
     * must settle via POST /match-payments/:id/pay-balance. A draw splits the
     * rent 50/50 between both captains as due balances.
     */
    static async processDareSettlement(tx, match, outcome) {
        const teams = await tx.matchTeam.findMany({ where: { matchId: match.id } });
        const teamA = teams.find(t => t.teamSide === 'TEAM_A' || t.teamSide === 'A');
        const teamB = teams.find(t => t.teamSide === 'TEAM_B' || t.teamSide === 'B');

        if (match.captainAId) {
            await this.postWalletTransaction(tx, {
                userId: match.captainAId,
                type: 'REFUND',
                description: `Dare-to-Play deposit refund for match ${match.id}`,
                amount: Number(match.teamAShare)
            });
        }
        if (match.captainBId) {
            await this.postWalletTransaction(tx, {
                userId: match.captainBId,
                type: 'REFUND',
                description: `Dare-to-Play deposit refund for match ${match.id}`,
                amount: Number(match.teamBShare)
            });
        }

        const totalRent = Number(match.totalAmount);
        const createDueBalance = (teamSide, amount, userId, playerName) =>
            tx.matchPayment.create({
                data: {
                    id: genId('mpay'),
                    matchId: match.id,
                    userId: userId || null,
                    teamSide,
                    playerName: playerName || 'Captain',
                    amount,
                    paymentMode: 'DARE_BALANCE',
                    paymentStatus: 'PENDING'
                }
            });

        if (outcome === 'TEAM_A_WIN') {
            await createDueBalance('TEAM_B', totalRent, match.captainBId, teamB?.captainName);
        } else if (outcome === 'TEAM_B_WIN') {
            await createDueBalance('TEAM_A', totalRent, match.captainAId, teamA?.captainName);
        } else if (outcome === 'DRAW') {
            const half = Math.round(totalRent / 2);
            await createDueBalance('TEAM_A', half, match.captainAId, teamA?.captainName);
            await createDueBalance('TEAM_B', half, match.captainBId, teamB?.captainName);
        }
    }
}

module.exports = MatchSettlementService;
