const prisma = require('../../config/prisma');
const { computeSplit } = require('../../services/paymentGateway/paymentSplit.util');

const resolveOwnerBranchIds = async (user) => {
    if (!user || user.role === 'SUPERADMIN' || user.role === 'SUPER_ADMIN') return null;
    const ownerProfile = await prisma.owner.findFirst({
        where: {
            OR: [
                { userId: user.id },
                { id: user.id },
                ...(user.email ? [{ email: user.email }] : [])
            ]
        }
    }).catch(() => null);
    const branches = await prisma.branch.findMany({
        where: {
            OR: [
                { ownerUserId: user.id },
                { ownerId: user.id },
                ...(ownerProfile ? [{ ownerId: ownerProfile.id }, { ownerUserId: ownerProfile.userId }] : []),
                ...(user.staffBranchId ? [{ id: user.staffBranchId }] : [])
            ]
        },
        select: { id: true }
    });
    return branches.map(b => b.id);
};

/**
 * POS / checkout payment recording. Uses the real Payment model as the single
 * unified transaction ledger (bookings, subscriptions, and admin-entered logs
 * all live here via the `type` field) -- no synthetic fallback names or amounts.
 * These are staff/owner-recorded at the venue (cash/card in hand), so the
 * owner leg is inherently confirmed at entry time; the commission leg is left
 * PENDING for Super Admin reconciliation via PaymentLogs, same as online
 * match-payment commission legs.
 */
const processPayment = async (req, res) => {
    const { bookingId, customerName, amount, paymentMethod } = req.body;
    if (!customerName || !amount || !paymentMethod) {
        return res.status(400).json({ success: false, message: 'customerName, amount, and paymentMethod are required fields.' });
    }

    try {
        const split = await computeSplit(amount);
        const invoiceNumber = `INV-${Math.floor(1000 + Math.random() * 9000)}`;
        const payment = await prisma.payment.create({
            data: {
                bookingId: bookingId ? Number(bookingId) : null,
                userId: req.user?.id || null,
                invoiceNumber, customerName: customerName.trim(), amount,
                commission: split.commissionAmount, ownerAmount: split.ownerAmount,
                ownerPayoutStatus: 'CONFIRMED',
                paymentMethod: paymentMethod.toUpperCase(), status: 'COMPLETED'
            }
        });

        return res.status(201).json({ success: true, message: 'Payment processed successfully', data: { invoiceNumber: payment.invoiceNumber, customerName, amount, paymentMethod, status: 'Completed' } });
    } catch (error) {
        console.error('Process payment error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error processing payment.' });
    }
};

const getPaymentStats = async (req, res) => {
    try {
        const branchIds = await resolveOwnerBranchIds(req.user);
        // Scope to owner branches if not SuperAdmin
        const paymentWhere = branchIds === null ? {} : branchIds.length > 0
            ? { OR: [{ booking: { slot: { branchId: { in: branchIds } } } }, { booking: { slotId: null } }] }
            : { id: -1 }; // no branches => no results
        const matchWhere = branchIds === null ? {} : branchIds.length > 0
            ? { match: { branchId: { in: branchIds } } }
            : { id: 'NO_MATCH' };

        const [payments, matchPayments] = await Promise.all([
            prisma.payment.findMany({ where: paymentWhere, include: { user: true } }),
            prisma.matchPayment.findMany({ where: matchWhere, include: { user: true, match: true } })
        ]);

        const processedSlotIds = new Set(payments.map(p => p.bookingId).filter(Boolean));
        let totalRevenue = 0;
        let totalCommission = 0;
        let totalTransactions = 0;
        let completedCount = 0;
        let pendingCount = 0;
        let pendingPayments = 0;
        let refundedCount = 0;
        let refundedAmount = 0;

        for (const p of payments) {
            totalTransactions += 1;
            const gross = Number(p.amount || 0);
            const comm = Number(p.commission || Math.round(gross * 0.1));
            totalRevenue += gross;
            totalCommission += comm;

            if (p.status === 'COMPLETED') {
                completedCount += 1;
            } else if (p.status === 'PENDING') {
                pendingCount += 1;
                pendingPayments += gross;
            } else if (p.status === 'REFUNDED') {
                refundedCount += 1;
                refundedAmount += gross;
            }
        }

        for (const mp of matchPayments) {
            if (mp.match?.slotId && processedSlotIds.has(mp.match.slotId)) {
                continue; // Skip duplicate
            }
            totalTransactions += 1;
            const gross = Number(mp.amount || 0);
            const comm = Number(mp.commissionAmount || Math.round(gross * 0.1));
            totalRevenue += gross;
            totalCommission += comm;

            const mpStatusUpper = (mp.paymentStatus || '').toUpperCase();
            if (mpStatusUpper === 'COMPLETED' || mpStatusUpper === 'PAID' || mpStatusUpper === 'CONFIRMED') {
                completedCount += 1;
            } else if (mpStatusUpper === 'REFUNDED') {
                refundedCount += 1;
                refundedAmount += gross;
            } else {
                pendingCount += 1;
                pendingPayments += gross;
            }
        }

        return res.status(200).json({
            success: true,
            data: {
                summary: {
                    totalTransactions,
                    totalRevenue,
                    totalCommission,
                    pendingPayments,
                    pendingCount,
                    completedCount,
                    refundedAmount,
                    refundedCount
                }
            }
        });
    } catch (error) {
        console.error('Fetch payment stats error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error compiling payment stats: ' + error.message });
    }
};

const formatPaymentLog = (p) => {
    const resolvedCustomer = p.customerName || p.booking?.customerName || p.user?.name || '';

    let resolvedStatus = (p.status || '').toUpperCase();
    const bkStatus = (p.booking?.status || '').toUpperCase();
    if (resolvedStatus === 'REFUNDED' || bkStatus === 'REFUNDED') {
        resolvedStatus = 'REFUNDED';
    } else if (resolvedStatus === 'CANCELLED' || resolvedStatus === 'FAILED' || bkStatus === 'CANCELLED') {
        resolvedStatus = 'CANCELLED';
    } else if (resolvedStatus === 'COMPLETED' || resolvedStatus === 'CONFIRMED' || resolvedStatus === 'PAID' || bkStatus === 'COMPLETED' || bkStatus === 'CONFIRMED') {
        resolvedStatus = 'COMPLETED';
    } else if (!resolvedStatus) {
        resolvedStatus = 'PENDING';
    }

    return {
        _id: `pay_${p.id}`, id: `pay_${p.id}`,
        paymentId: p.invoiceNumber, transactionId: `TXN-${p.invoiceNumber}`, invoiceNumber: p.invoiceNumber,
        userId: { _id: p.userId, fullName: resolvedCustomer, email: p.user?.email || '', mobile: p.user?.mobile || '' },
        user: resolvedCustomer, customer: resolvedCustomer, customerName: resolvedCustomer,
        branchName: p.booking?.slot?.branch?.branchName || p.branchName || '',
        type: p.type ? p.type.toUpperCase() : 'BOOKING', amount: Number(p.amount),
        commissionAmount: Number(p.commission),
        commissionRate: Number(p.amount) > 0 ? Math.round((Number(p.commission) / Number(p.amount)) * 100) : 0,
        ownerAmount: Number(p.ownerAmount),
        ownerPayoutStatus: p.ownerPayoutStatus, commissionStatus: p.commissionStatus,
        paymentMethod: p.paymentMethod, status: resolvedStatus,
        notice: p.type === 'Booking' ? 'Turf Slot Online Booking' : p.type,
        paymentDate: p.createdAt, createdAt: p.createdAt, date: p.createdAt
    };
};

const getBillHistory = async (req, res) => {
    try {
        const { page = 1, limit = 20, search = '', status = '', type = '', paymentMethod = '' } = req.query;
        const branchIds = await resolveOwnerBranchIds(req.user);

        const where = {};
        if (status && status.toUpperCase() !== 'ALL') where.status = status.toUpperCase();
        if (type && type.toUpperCase() !== 'ALL') where.type = type;
        if (paymentMethod && paymentMethod.toUpperCase() !== 'ALL') where.paymentMethod = paymentMethod.toUpperCase();
        if (search.trim()) {
            where.OR = [
                { invoiceNumber: { contains: search } },
                { customerName: { contains: search } }
            ];
        }
        // Scope to owner's branches
        if (branchIds !== null) {
            if (branchIds.length === 0) {
                return res.status(200).json({ success: true, data: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 0 } });
            }
            where.booking = { slot: { branchId: { in: branchIds } } };
        }

        const pageNum = Number(page) || 1;
        const limitNum = Number(limit) || 20;

        const matchWhere = branchIds === null ? {} : { match: { branchId: { in: branchIds } } };
        const [payments, matchPayments] = await Promise.all([
            prisma.payment.findMany({ where, include: { user: true, booking: { include: { slot: { include: { branch: true } } } } }, orderBy: { createdAt: 'desc' } }),
            prisma.matchPayment.findMany({ where: matchWhere, include: { user: true, match: { include: { branch: true } } }, orderBy: { createdAt: 'desc' } })
        ]);

        const matchSlotIds = matchPayments.map(mp => mp.match?.slotId).filter(Boolean);
        const linkedBookings = matchSlotIds.length > 0
            ? await prisma.booking.findMany({ where: { slotId: { in: matchSlotIds } } })
            : [];
        const bookingBySlot = Object.fromEntries(linkedBookings.map(b => [b.slotId, b]));

        const logs = payments.map(formatPaymentLog);
        for (const mp of matchPayments) {
            const gross = Number(mp.amount || 0);
            const comm = Number(mp.commissionAmount || Math.round(gross * 0.1));
            const owner = Number(mp.ownerAmount || (gross - comm));
            const commRate = gross > 0 ? Math.round((comm / gross) * 100) : 10;

            const linkedBooking = mp.match?.slotId ? bookingBySlot[mp.match.slotId] : null;
            const resolvedCustomerName = linkedBooking?.customerName || (mp.playerName && mp.playerName !== 'Player' ? mp.playerName : mp.user?.name) || 'Player';
            const resolvedPhone = linkedBooking?.mobileNumber || mp.playerPhone || mp.user?.mobile || '';

            let resolvedStatus = 'PENDING';
            const mpStatusUpper = (mp.paymentStatus || '').toUpperCase();
            const bkStatusUpper = (linkedBooking?.status || '').toUpperCase();

            if (mpStatusUpper === 'REFUNDED' || bkStatusUpper === 'REFUNDED') {
                resolvedStatus = 'REFUNDED';
            } else if (mpStatusUpper === 'CANCELLED' || mpStatusUpper === 'FAILED' || bkStatusUpper === 'CANCELLED') {
                resolvedStatus = 'CANCELLED';
            } else if (mpStatusUpper === 'COMPLETED' || mpStatusUpper === 'PAID' || mpStatusUpper === 'CONFIRMED' || bkStatusUpper === 'COMPLETED' || bkStatusUpper === 'CONFIRMED') {
                resolvedStatus = 'COMPLETED';
            } else if (mpStatusUpper) {
                resolvedStatus = mpStatusUpper;
            }

            logs.push({
                _id: `mp_${mp.id}`, id: `mp_${mp.id}`,
                paymentId: `INV-${mp.id.substring(0, 10)}`,
                transactionId: `TXN-${mp.id.substring(0, 10)}`,
                invoiceNumber: `INV-${mp.id.substring(0, 10)}`,
                userId: { _id: mp.userId, fullName: resolvedCustomerName, email: mp.user?.email || '', mobile: resolvedPhone },
                user: resolvedCustomerName,
                customer: resolvedCustomerName,
                customerName: resolvedCustomerName,
                branchName: mp.match?.branch?.branchName || '',
                type: 'BOOKING',
                amount: gross,
                commissionAmount: comm,
                commissionRate: commRate,
                ownerAmount: owner,
                ownerPayoutStatus: mp.ownerPayoutStatus || 'PENDING',
                commissionStatus: mp.commissionStatus || 'CONFIRMED',
                paymentMethod: mp.paymentMode || 'UPI',
                status: resolvedStatus,
                notice: `Match Booking - ${mp.match?.branch?.branchName || 'Turf Arena'} (${commRate}% Platform Commission: ₹${comm})`,
                paymentDate: mp.createdAt,
                createdAt: mp.createdAt,
                date: mp.createdAt
            });
        }

        logs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const total = logs.length;
        const startIndex = (pageNum - 1) * limitNum;
        const paginatedLogs = logs.slice(startIndex, startIndex + limitNum);

        return res.status(200).json({
            success: true,
            data: paginatedLogs,
            pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) || 1 }
        });
    } catch (error) {
        console.error('Fetch billing history error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error fetching billing ledger: ' + error.message });
    }
};

const getPaymentLogById = async (req, res) => {
    try {
        const rawId = req.params.id.replace('pay_', '');
        const payment = await prisma.payment.findFirst({
            where: { OR: [{ id: Number(rawId) || -1 }, { invoiceNumber: req.params.id }] },
            include: { user: true }
        });
        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment log record not found' });
        }
        return res.status(200).json({ success: true, data: formatPaymentLog(payment) });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/** Super Admin manual ledger entry -- persisted directly as a real Payment row. */
const createPaymentLog = async (req, res) => {
    const { userName, customerName, type = 'Booking', amount, paymentMethod, status } = req.body;
    const name = (userName || customerName || '').trim();
    if (!name || !amount) {
        return res.status(400).json({ success: false, message: 'customerName and amount are required.' });
    }

    try {
        const split = await computeSplit(amount);
        const invoiceNumber = `INV-SA-${Math.floor(100000 + Math.random() * 900000)}`;
        const payment = await prisma.payment.create({
            data: {
                invoiceNumber, customerName: name, type,
                amount: Number(amount), commission: split.commissionAmount, ownerAmount: split.ownerAmount,
                ownerPayoutStatus: 'CONFIRMED',
                paymentMethod: (paymentMethod || 'ONLINE').toUpperCase(),
                status: (status || 'COMPLETED').toUpperCase()
            }
        });
        return res.status(201).json({ success: true, message: 'Payment transaction record created successfully.', data: formatPaymentLog(payment) });
    } catch (error) {
        console.error('Create payment log error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

const posCheckout = async (req, res) => {
    const {
        branchId,
        sportId,
        courtName,
        slotDate,
        slotTime,
        duration = 60,
        customerName,
        customerPhone,
        customerEmail,
        customerType = 'Guest',
        paymentMethod = 'UPI',
        paymentStatus = 'Paid',
        advanceAmount = 0,
        cartItems = [],
        selectedExtras = [],
        discountAmount = 0,
        totalAmount,
        notes
    } = req.body;

    const name = (customerName || 'Walk-In Guest').trim();
    const phone = (customerPhone || '9876543210').trim();
    const amount = Number(totalAmount) || 0;

    if (!amount) {
        return res.status(400).json({ success: false, message: 'totalAmount is required.' });
    }

    try {
        const cleanPhone = phone.replace(/\D/g, '');
        const invoiceNumber = `INV-POS-${Math.floor(100000 + Math.random() * 900000)}`;

        let user = await prisma.user.findFirst({
            where: { OR: [{ mobile: { contains: cleanPhone.length >= 4 ? cleanPhone : phone } }, { email: customerEmail || `pos_${cleanPhone}@sportmatrix.com` }] }
        });

        if (!user) {
            user = await prisma.user.create({
                data: {
                    id: `usr_pos_${Date.now()}_${Math.floor(Math.random()*1000)}`,
                    name,
                    email: customerEmail?.trim() || `pos_${cleanPhone}@sportmatrix.com`,
                    passwordHash: 'WALKIN_GUEST_NOPASS',
                    mobile: cleanPhone || phone,
                    role: 'CUSTOMER',
                    status: 'ACTIVE'
                }
            }).catch(() => null);
        }

        let targetBranchId = branchId;
        if (!targetBranchId) {
            const defaultBranch = await prisma.branch.findFirst();
            targetBranchId = defaultBranch?.id || null;
        }

        let slotId = null;
        if (targetBranchId && slotDate && slotTime) {
            const dateObj = new Date(slotDate);
            
            // Robust 12h to 24h HH:mm:ss parser
            const timeMatch = String(slotTime).match(/(\d+)(?::(\d+))?\s*(AM|PM)?/i);
            let sH = timeMatch ? parseInt(timeMatch[1], 10) : 18;
            let sM = (timeMatch && timeMatch[2]) ? parseInt(timeMatch[2], 10) : 0;
            const ampm = timeMatch && timeMatch[3] ? timeMatch[3].toUpperCase() : null;
            if (ampm === 'PM' && sH < 12) sH += 12;
            if (ampm === 'AM' && sH === 12) sH = 0;

            const startTimeStr = `${String(sH).padStart(2, '0')}:${String(sM).padStart(2, '0')}:00`;
            const dur = Number(duration) || 60;
            const totalEndM = sH * 60 + sM + dur;
            const endH = Math.floor(totalEndM / 60) % 24;
            const endM = totalEndM % 60;
            const endTimeStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00`;

            let slot = await prisma.slot.findFirst({
                where: {
                    branchId: targetBranchId,
                    slotDate: dateObj,
                    startTime: startTimeStr
                }
            });

            if (!slot) {
                slot = await prisma.slot.create({
                    data: {
                        id: `s_pos_${Date.now()}_${Math.floor(Math.random()*1000)}`,
                        branchId: targetBranchId,
                        sportId: sportId || null,
                        courtName: courtName || 'Box Cricket Pitch 1',
                        slotDate: dateObj,
                        startTime: startTimeStr,
                        endTime: endTimeStr,
                        duration: dur,
                        regularPrice: Math.round(amount),
                        peakPrice: Math.round(amount),
                        status: 'BOOKED',
                        notes: `POS Walk-In Booking: ${name}`
                    }
                }).catch(() => null);
            } else {
                await prisma.slot.update({
                    where: { id: slot.id },
                    data: { status: 'BOOKED', notes: `POS Walk-In Booking: ${name}` }
                }).catch(() => {});
            }
            if (slot) slotId = slot.id;
        }

        const bookingCode = `BK-POS-${Math.floor(100000 + Math.random() * 900000)}`;
        const booking = await prisma.booking.create({
            data: {
                bookingCode,
                slotId: slotId || null,
                userId: user?.id || null,
                customerName: name,
                mobileNumber: phone,
                sportName: req.body.sport || 'Cricket',
                courtName: courtName || 'Box Cricket Pitch 1',
                timeSlot: slotTime || '09:00 PM',
                dutyDate: slotDate ? new Date(slotDate) : new Date(),
                amount: Math.round(amount),
                duration: Number(duration) || 60,
                status: 'COMPLETED',
                notes: notes || `POS ${customerType} Checkout`
            }
        });

        if (Array.isArray(cartItems) && cartItems.length > 0) {
            for (const item of cartItems) {
                if (item.id && item.qty > 0) {
                    await prisma.inventory.update({
                        where: { id: String(item.id) },
                        data: { stockQuantity: { decrement: Number(item.qty) } }
                    }).catch(() => {});
                }
            }
        }

        // POS venue walk-in bookings carry 0% platform commission (100% owner share)
        let validPaymentMethod = 'UPI';
        const pmUpper = (paymentMethod || '').toUpperCase();
        if (['CASH', 'UPI', 'CARD', 'NETBANKING', 'WALLET'].includes(pmUpper)) {
            validPaymentMethod = pmUpper;
        }

        await prisma.payment.create({
            data: {
                bookingId: booking.id,
                userId: user?.id || null,
                invoiceNumber,
                customerName: name,
                amount: Math.round(amount),
                commission: 0,
                ownerAmount: Math.round(amount),
                ownerPayoutStatus: 'CONFIRMED',
                paymentMethod: validPaymentMethod,
                status: 'COMPLETED',
                type: 'POS_BILL'
            }
        });


        return res.status(201).json({
            success: true,
            message: 'POS Transaction recorded successfully!',
            data: {
                invoiceNumber,
                bookingCode,
                customerName: name,
                customerPhone: phone,
                totalAmount: amount,
                paymentMethod,
                paymentStatus,
                date: new Date().toISOString(),
                booking
            }
        });
    } catch (error) {
        console.error('POS Checkout Error:', error);
        return res.status(500).json({ success: false, message: 'POS Checkout failed: ' + error.message });
    }
};

module.exports = { processPayment, posCheckout, getBillHistory, getPaymentStats, getPaymentLogById, createPaymentLog };

