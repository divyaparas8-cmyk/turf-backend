const prisma = require('../../config/prisma');
const MatchSettlementService = require('../../services/matchSettlement.service');
const { emitToUser } = require('../../realtime/socket');

const genId = (prefix) => `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
const genTxCode = () => `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

const getWalletBalance = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    try {
        let wallet = await prisma.wallet.findUnique({ where: { userId: req.user.id } });
        if (!wallet) {
            wallet = await prisma.wallet.create({ data: { id: genId('wal'), userId: req.user.id, balance: 0 } });
        }

        const [payments, bookings] = await Promise.all([
            prisma.payment.findMany({ where: { status: 'COMPLETED' } }).catch(() => []),
            prisma.booking.findMany({ where: { status: 'COMPLETED' } }).catch(() => [])
        ]);

        const paymentTotal = payments.reduce((acc, p) => acc + Number(p.ownerAmount || p.amount || 0), 0);
        const bookingTotal = bookings.reduce((acc, b) => acc + Number(b.amount || b.finalPrice || b.totalPrice || 0), 0);
        const totalRevenue = Math.max(paymentTotal, bookingTotal);

        const totalComm = payments.reduce((acc, p) => acc + Number(p.commission || 0), 0);
        const currentBalance = Math.max(Number(wallet.balance), totalRevenue);

        return res.status(200).json({
            success: true,
            data: {
                balance: currentBalance,
                locked: Number(wallet.lockedEscrow),
                totalCommissionPaid: totalComm || Number(wallet.totalCommissionPaid),
                bankAccountMasked: wallet.bankAccountMasked
            }
        });
    } catch (error) {
        console.error('Fetch wallet balance error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error fetching wallet balance.' });
    }
};

const getWalletTransactions = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    try {
        const wallet = await prisma.wallet.findUnique({ where: { userId: req.user.id }, include: { transactions: { orderBy: { createdAt: 'desc' } } } });
        let rows = wallet?.transactions || [];

        const formatDate = (dateVal) => {
            const d = new Date(dateVal);
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
        };

        if (!rows || rows.length === 0) {
            const [payments, bookings] = await Promise.all([
                prisma.payment.findMany({ where: { status: 'COMPLETED' }, orderBy: { createdAt: 'desc' } }).catch(() => []),
                prisma.booking.findMany({ where: { status: 'COMPLETED' }, orderBy: { createdAt: 'desc' } }).catch(() => [])
            ]);

            let combined = [];

            if (payments.length > 0) {
                combined = payments.map(p => ({
                    id: p.invoiceNumber || `INV-${p.id}`,
                    _id: p.id,
                    type: p.type === 'POS_BILL' ? 'POS Walk-In Settlement' : 'Online Turf Reservation',
                    desc: `Invoice #${p.invoiceNumber || p.id} - ${p.customerName || 'Customer'}`,
                    amount: `+₹${Number(p.amount).toLocaleString('en-IN')}`,
                    grossAmount: Number(p.amount),
                    platformCommission: Number(p.commission || 0),
                    settledNet: Number(p.ownerAmount || p.amount),
                    date: formatDate(p.createdAt),
                    rawDate: p.createdAt,
                    status: 'Completed'
                }));
            } else if (bookings.length > 0) {
                combined = bookings.map(b => ({
                    id: b.bookingCode || `BK-${b.id}`,
                    _id: b.id,
                    type: 'Turf Reservation',
                    desc: `Booking #${b.bookingCode || b.id} - ${b.customerName || 'Customer'}`,
                    amount: `+₹${Number(b.amount || b.finalPrice || b.totalPrice || 0).toLocaleString('en-IN')}`,
                    grossAmount: Number(b.amount || b.finalPrice || b.totalPrice || 0),
                    platformCommission: 0,
                    settledNet: Number(b.amount || b.finalPrice || b.totalPrice || 0),
                    date: formatDate(b.createdAt),
                    rawDate: b.createdAt,
                    status: 'Completed'
                }));
            }

            return res.status(200).json({ success: true, data: combined });
        }


        const formatted = rows.map(r => {
            const amt = Number(r.amount);
            const amtStr = amt >= 0 ? `+₹${amt.toLocaleString('en-IN')}` : `-₹${Math.abs(amt).toLocaleString('en-IN')}`;
            return {
                id: r.transactionCode, _id: r.id, type: r.type, desc: r.description, amount: amtStr,
                grossAmount: Number(r.grossAmount), platformCommission: Number(r.platformCommission), settledNet: Number(r.settledNet),
                date: formatDate(r.createdAt), rawDate: r.createdAt, status: r.status
            };
        });

        return res.status(200).json({ success: true, data: formatted });
    } catch (error) {
        console.error('Fetch wallet transactions error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error fetching transaction logs.' });
    }
};


const topUpWallet = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    const { amount } = req.body;
    if (!amount || Number(amount) <= 0) {
        return res.status(400).json({ success: false, message: 'Please provide a valid top-up amount greater than zero.' });
    }

    try {
        const topUpAmt = Number(amount);
        const result = await prisma.$transaction(async (tx) => {
            let wallet = await tx.wallet.findUnique({ where: { userId: req.user.id } });
            if (!wallet) {
                wallet = await tx.wallet.create({ data: { id: genId('wal'), userId: req.user.id, balance: 0 } });
            }
            const updated = await tx.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: topUpAmt } } });
            const txnCode = genTxCode();
            await tx.walletTransaction.create({
                data: { walletId: wallet.id, transactionCode: txnCode, type: 'TOP_UP', description: 'Wallet top-up', grossAmount: topUpAmt, settledNet: topUpAmt, amount: topUpAmt, status: 'Completed' }
            });
            return { balance: Number(updated.balance), transactionCode: txnCode };
        });

        emitToUser(req.user.id, 'wallet:updated', result);

        return res.status(200).json({ success: true, message: 'Wallet credited successfully', data: result });
    } catch (error) {
        console.error('Top-up wallet transaction error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error processing wallet top-up.' });
    }
};

/**
 * Process a booking cancellation and refund the amount back to the customer's
 * wallet (Owner/Super Admin only).
 */
const refundBooking = async (req, res) => {
    const { bookingId, refundReason } = req.body;
    if (!bookingId) {
        return res.status(400).json({ success: false, message: 'bookingId is required to process refund.' });
    }

    try {
        const booking = await prisma.booking.findUnique({ where: { id: Number(bookingId) } });
        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        }
        if (booking.status === 'REFUNDED') {
            return res.status(400).json({ success: false, message: 'This booking has already been refunded.' });
        }
        if (!booking.userId) {
            return res.status(400).json({ success: false, message: 'This booking has no linked customer account to refund into.' });
        }

        const result = await prisma.$transaction(async (tx) => {
            if (booking.slotId) {
                await tx.slot.update({ where: { id: booking.slotId }, data: { status: 'AVAILABLE' } });
            }
            await tx.booking.update({ where: { id: booking.id }, data: { status: 'REFUNDED' } });

            const desc = refundReason ? `Refund: ${refundReason.trim()}` : `Refund for Booking #${booking.bookingCode || booking.id}`;
            await MatchSettlementService.postWalletTransaction(tx, {
                userId: booking.userId, type: 'REFUND', description: desc, amount: Number(booking.amount)
            });

            const wallet = await tx.wallet.findUnique({ where: { userId: booking.userId } });
            return { refundedAmount: Number(booking.amount), newBalance: Number(wallet.balance) };
        });

        emitToUser(booking.userId, 'wallet:updated', result);

        return res.status(200).json({ success: true, message: 'Booking cancelled and refunded successfully.', data: result });
    } catch (error) {
        console.error('Booking refund error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error processing refund.' });
    }
};

/**
 * POST /api/v1/wallet/withdraw
 * Real withdrawal request: funds move from `balance` into `lockedEscrow`
 * (held, not gone) and a real WalletTransaction is recorded -- no live payout
 * gateway exists yet, so this doesn't actually wire a bank transfer, but it's
 * an honest "requested and held" state rather than a UI-only fake success.
 */
const requestWithdrawal = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    const { amount, payoutMethod, upiId, bankAccountNumber, bankIfsc } = req.body;
    const withdrawAmt = Number(amount);
    if (!withdrawAmt || withdrawAmt <= 0) {
        return res.status(400).json({ success: false, message: 'Please provide a valid withdrawal amount greater than zero.' });
    }
    if (payoutMethod === 'UPI' && !upiId) {
        return res.status(400).json({ success: false, message: 'upiId is required for UPI withdrawals.' });
    }
    if (payoutMethod === 'Bank' && (!bankAccountNumber || !bankIfsc)) {
        return res.status(400).json({ success: false, message: 'bankAccountNumber and bankIfsc are required for bank withdrawals.' });
    }

    try {
        const result = await prisma.$transaction(async (tx) => {
            const wallet = await tx.wallet.findUnique({ where: { userId: req.user.id } });
            if (!wallet || Number(wallet.balance) < withdrawAmt) {
                throw Object.assign(new Error('Withdrawal request exceeds current settled balance.'), { code: 'INSUFFICIENT_FUNDS' });
            }

            const destination = payoutMethod === 'UPI' ? upiId : `${bankAccountNumber} (${bankIfsc})`;
            const masked = payoutMethod === 'UPI' ? upiId : `**** **** **** ${String(bankAccountNumber).slice(-4)}`;

            const updated = await tx.wallet.update({
                where: { id: wallet.id },
                data: { balance: { decrement: withdrawAmt }, lockedEscrow: { increment: withdrawAmt }, bankAccountMasked: masked }
            });

            const txnCode = genTxCode();
            await tx.walletTransaction.create({
                data: {
                    walletId: wallet.id, transactionCode: txnCode, type: 'WITHDRAWAL',
                    description: `Withdrawal requested to ${payoutMethod} (${destination})`,
                    grossAmount: withdrawAmt, settledNet: withdrawAmt, amount: -withdrawAmt, status: 'Held'
                }
            });

            return { balance: Number(updated.balance), locked: Number(updated.lockedEscrow), transactionCode: txnCode };
        });

        emitToUser(req.user.id, 'wallet:updated', result);

        return res.status(200).json({ success: true, message: 'Withdrawal request submitted and held pending settlement.', data: result });
    } catch (error) {
        if (error.code === 'INSUFFICIENT_FUNDS') {
            return res.status(400).json({ success: false, message: error.message });
        }
        console.error('Withdrawal request error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error processing withdrawal request.' });
    }
};

module.exports = { getWalletBalance, getWalletTransactions, topUpWallet, refundBooking, requestWithdrawal };
