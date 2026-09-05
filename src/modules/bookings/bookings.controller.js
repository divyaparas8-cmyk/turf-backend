const prisma = require('../../config/prisma');
const { resolveOrCreateSlot } = require('../../services/slotResolution.service');
const MatchSettlementService = require('../../services/matchSettlement.service');
const { emitToBranch, emitToUser, emitToSuperAdmins } = require('../../realtime/socket');

const genInvoice = () => `INV-${Date.now().toString().substring(5)}`;
const genBookingCode = () => `BK-${Date.now().toString().slice(-8)}`;

const formatBooking = (b) => {
    const grossAmount = Number(b.amount || 0);
    const commRate = 10;
    const commissionAmount = Math.round((grossAmount * commRate) / 100);
    const ownerAmount = grossAmount - commissionAmount;

    return {
        booking_id: b.id,
        id: b.id,
        bookingCode: b.bookingCode || `BK-${b.id}`,
        user_id: b.userId,
        customer_name: b.customerName,
        mobile_number: b.mobileNumber,
        amount: grossAmount,
        gross_amount: grossAmount,
        commission_rate: commRate,
        commission_amount: commissionAmount,
        owner_amount: ownerAmount,
        duration: b.duration,
        booking_status: b.status,
        status: b.status,
        booked_on: b.createdAt,
        branch_id: b.slot?.branchId || null,
        slot_date: b.slot?.slotDate || b.dutyDate,
        start_time: b.slot?.startTime || b.timeSlot,
        end_time: b.slot?.endTime || null,
        court_name: b.slot?.courtName || b.courtName,
        sport_name: b.slot?.sport?.name || b.sportName,
        sport_icon: b.slot?.sport?.icon || null,
        checkInStatus: b.checkInStatus,
        notes: b.notes || ''
    };
};

/**
 * Create a real slot booking. Accepts either an already-resolved slotId, or
 * enough detail (branchId/sportId/courtName/slotDate/startTime/endTime) to
 * resolve-or-create the real slot atomically.
 */
const createBooking = async (req, res) => {
    const { slotId, branchId, sportId, courtName, slotDate, startTime, endTime, customerName, mobileNumber, notes, paymentMethod } = req.body;
    const resolvedPaymentMethod = ['UPI', 'CASH', 'CARD', 'WALLET', 'BANK_TRANSFER', 'ONLINE'].includes((paymentMethod || '').toUpperCase())
        ? paymentMethod.toUpperCase() : 'UPI';

    if (!customerName || !mobileNumber) {
        return res.status(400).json({ success: false, message: 'customerName and mobileNumber are required fields.' });
    }
    if (!slotId && !(branchId && sportId && courtName && slotDate && startTime && endTime)) {
        return res.status(400).json({ success: false, message: 'Provide either slotId, or branchId/sportId/courtName/slotDate/startTime/endTime.' });
    }

    try {
        let slot;
        if (slotId) {
            slot = await prisma.slot.findUnique({ where: { id: slotId } });
            if (!slot) {
                return res.status(404).json({ success: false, message: 'Target slot configuration not found.' });
            }
            if (slot.status !== 'AVAILABLE') {
                return res.status(409).json({ success: false, message: `This slot is no longer available (current status: ${slot.status}).` });
            }
        } else {
            const resolved = await resolveOrCreateSlot({ branchId, sportId, courtName, slotDate, startTime, endTime });
            if (!resolved.ok) return res.status(resolved.code).json({ success: false, message: resolved.message });
            slot = resolved.slot;
        }

        const amount = slot.isPeakHour ? Number(slot.peakPrice) : Number(slot.regularPrice);
        const bookingUserId = req.user ? req.user.id : null;

        const result = await prisma.$transaction(async (tx) => {
            const bookedSlot = await tx.slot.update({ where: { id: slot.id, status: 'AVAILABLE' }, data: { status: 'BOOKED' } }).catch(() => null);
            if (!bookedSlot) throw Object.assign(new Error('Slot was just booked by someone else.'), { code: 'RACE' });

            const booking = await tx.booking.create({
                data: {
                    bookingCode: genBookingCode(),
                    slotId: slot.id,
                    userId: bookingUserId,
                    customerName: customerName.trim(),
                    mobileNumber: mobileNumber.trim(),
                    amount,
                    duration: slot.duration,
                    notes: (notes || '').trim(),
                    status: 'COMPLETED'
                }
            });

            await tx.payment.create({
                data: {
                    bookingId: booking.id,
                    userId: bookingUserId,
                    invoiceNumber: genInvoice(),
                    customerName: customerName.trim(),
                    type: 'Booking',
                    amount,
                    paymentMethod: resolvedPaymentMethod,
                    status: 'COMPLETED'
                }
            });

            return booking;
        });

        emitToBranch(slot.branchId, 'booking:new', { bookingId: result.id, bookingCode: result.bookingCode, amount });
        if (bookingUserId) emitToUser(bookingUserId, 'booking:new', { bookingId: result.id, bookingCode: result.bookingCode });
        emitToSuperAdmins('booking:new', { bookingId: result.id, bookingCode: result.bookingCode, amount });

        return res.status(201).json({
            success: true,
            message: 'Booking successfully registered',
            data: { bookingId: result.id, bookingCode: result.bookingCode, slotId: slot.id, amount, duration: slot.duration, customerName, mobileNumber }
        });
    } catch (error) {
        if (error.code === 'RACE') {
            return res.status(409).json({ success: false, message: error.message });
        }
        console.error('Create booking transaction error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error placing booking.' });
    }
};

/**
 * Cancel a booking. Payment status moves to REFUNDED and, if the customer has
 * an account, the amount is credited back to their real Wallet.
 */
const cancelBooking = async (req, res) => {
    const rawId = String(req.params.id || '').trim();

    try {
        let booking = null;
        let numericId = !isNaN(Number(rawId)) ? Number(rawId) : null;

        if (numericId) {
            booking = await prisma.booking.findUnique({ where: { id: numericId } }).catch(() => null);
        }

        if (!booking) {
            booking = await prisma.booking.findFirst({
                where: {
                    OR: [
                        { bookingCode: rawId },
                        { id: isNaN(Number(rawId.replace(/\D/g, ''))) ? -1 : Number(rawId.replace(/\D/g, '')) }
                    ]
                }
            }).catch(() => null);
        }

        if (booking) {
            if (booking.status === 'REFUNDED' || booking.status === 'CANCELLED') {
                return res.status(400).json({ success: false, message: 'This booking is already cancelled/refunded.' });
            }

            let branchId = null;
            await prisma.$transaction(async (tx) => {
                await tx.booking.update({ where: { id: booking.id }, data: { status: 'REFUNDED' } });

                if (booking.slotId) {
                    const slot = await tx.slot.update({ where: { id: booking.slotId }, data: { status: 'AVAILABLE' } }).catch(() => null);
                    if (slot) branchId = slot.branchId;

                    const linkedMatch = await tx.match.findFirst({ where: { slotId: booking.slotId } }).catch(() => null);
                    if (linkedMatch) {
                        await tx.match.update({ where: { id: linkedMatch.id }, data: { matchStatus: 'CANCELLED' } }).catch(() => null);
                        await tx.matchPayment.updateMany({ where: { matchId: linkedMatch.id }, data: { paymentStatus: 'REFUNDED' } }).catch(() => null);
                    }
                }

                if (booking.userId) {
                    await MatchSettlementService.postWalletTransaction(tx, {
                        userId: booking.userId,
                        type: 'REFUND',
                        description: `Refund for cancelled booking #${booking.bookingCode || booking.id}`,
                        amount: Number(booking.amount)
                    }).catch(() => null);
                }

                await tx.dispute.create({
                    data: {
                        id: `DISP-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
                        userId: booking.userId || null,
                        customerName: booking.customerName || 'Customer',
                        bookingId: booking.id,
                        type: 'REFUND',
                        amount: Number(booking.amount),
                        reason: `Booking #${booking.bookingCode || booking.id} cancelled & refunded`,
                        status: 'RESOLVED',
                        resolutionNotes: 'Auto-resolved upon cancellation refund'
                    }
                }).catch(() => null);
            });

            emitToBranch(branchId, 'booking:cancelled', { bookingId: booking.id, bookingCode: booking.bookingCode });
            if (booking.userId) emitToUser(booking.userId, 'booking:cancelled', { bookingId: booking.id });
            emitToSuperAdmins('booking:cancelled', { bookingId: booking.id, bookingCode: booking.bookingCode });

            return res.status(200).json({ success: true, message: 'Booking successfully cancelled, slot is now available.' });
        }

        const matchPayment = await prisma.matchPayment.findFirst({
            where: {
                OR: [
                    { id: rawId },
                    { matchId: rawId }
                ]
            },
            include: { match: true }
        }).catch(() => null);

        if (matchPayment) {
            if (matchPayment.paymentStatus === 'REFUNDED') {
                return res.status(400).json({ success: false, message: 'This match booking is already cancelled/refunded.' });
            }

            let branchId = matchPayment.match?.branchId || null;
            await prisma.$transaction(async (tx) => {
                await tx.matchPayment.update({ where: { id: matchPayment.id }, data: { paymentStatus: 'REFUNDED' } });
                if (matchPayment.matchId) {
                    await tx.match.update({ where: { id: matchPayment.matchId }, data: { matchStatus: 'CANCELLED' } }).catch(() => null);
                }
                const slotId = matchPayment.match?.slotId;
                if (slotId) {
                    const slot = await tx.slot.update({ where: { id: slotId }, data: { status: 'AVAILABLE' } }).catch(() => null);
                    if (slot) branchId = slot.branchId;
                }
                if (matchPayment.userId) {
                    await MatchSettlementService.postWalletTransaction(tx, {
                        userId: matchPayment.userId,
                        type: 'REFUND',
                        description: `Refund for cancelled match payment #${matchPayment.id}`,
                        amount: Number(matchPayment.amount)
                    }).catch(() => null);
                }

                await tx.dispute.create({
                    data: {
                        id: `DISP-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
                        userId: matchPayment.userId || null,
                        customerName: matchPayment.playerName || 'Player',
                        matchId: matchPayment.matchId || matchPayment.id,
                        type: 'REFUND',
                        amount: Number(matchPayment.amount),
                        reason: `Match Payment #${matchPayment.id} cancelled & refunded`,
                        status: 'RESOLVED',
                        resolutionNotes: 'Auto-resolved upon match payment refund'
                    }
                }).catch(() => null);
            });

            emitToBranch(branchId, 'booking:cancelled', { matchPaymentId: matchPayment.id });
            if (matchPayment.userId) emitToUser(matchPayment.userId, 'booking:cancelled', { matchPaymentId: matchPayment.id });
            emitToSuperAdmins('booking:cancelled', { matchPaymentId: matchPayment.id });

            return res.status(200).json({ success: true, message: 'Match booking successfully cancelled, slot is now available.' });
        }

        return res.status(404).json({ success: false, message: 'Booking record not found for the provided code or ID.' });
    } catch (error) {
        console.error('Cancel booking transaction error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error cancelling booking: ' + error.message });
    }
};

/**
 * STAFF and OWNER are scoped differently: an Owner's branches are found via
 * Branch.ownerUserId, but a Staff member's own id never matches that -- their
 * assigned branch lives on User.staffBranchId instead. Resolves the real
 * branch-scoping filter for either role rather than silently returning zero
 * rows for staff accounts.
 */
const resolveBranchFilterForUser = async (req, branchId) => {
    const userRole = (req.user?.role || '').toUpperCase().replace(/[-_]/g, '');

    // If a specific branchId filter was passed in the request query
    if (branchId && branchId !== 'ALL' && branchId !== 'undefined') {
        return { branchId };
    }

    // Super Admin has global visibility across all turfs
    if (!req.user || userRole === 'SUPERADMIN') {
        return {};
    }

    // Staff member is scoped to their assigned staff branch
    if (userRole === 'STAFF') {
        const staffUser = await prisma.user.findUnique({ where: { id: req.user.id }, select: { staffBranchId: true } });
        return staffUser?.staffBranchId ? { branchId: staffUser.staffBranchId } : {};
    }

    // Owner / Turf Admin / Admin: Scope strictly to branches owned by this user
    const ownerBranches = await prisma.branch.findMany({
        where: {
            OR: [
                { ownerUserId: req.user.id },
                { owner: { userId: req.user.id } },
                ...(req.user.staffBranchId ? [{ id: req.user.staffBranchId }] : []),
                ...(req.user.email ? [{ email: req.user.email }] : [])
            ]
        },
        select: { id: true }
    });

    if (ownerBranches.length > 0) {
        const ids = ownerBranches.map(b => b.id);
        return { branchId: ids.length === 1 ? ids[0] : { in: ids } };
    }

    return {};
};

const getUpcomingBookings = async (req, res) => {
    const { branchId } = req.query;
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    try {
        const where = { status: { in: ['COMPLETED', 'HELD'] }, slot: { slotDate: { gte: new Date(new Date().toDateString()) } } };

        if (req.user.role === 'CUSTOMER') {
            const userPhone = req.user.mobile || req.user.phone;
            if (userPhone) {
                const cleanPhone = userPhone.replace(/\D/g, '').slice(-10);
                where.OR = [
                    { userId: req.user.id },
                    { mobileNumber: { contains: cleanPhone } }
                ];
            } else {
                where.userId = req.user.id;
            }
        } else {
            where.slot = { ...where.slot, ...(await resolveBranchFilterForUser(req, branchId)) };
        }

        const rows = await prisma.booking.findMany({
            where,
            include: { slot: { include: { sport: true } } },
            orderBy: [{ slot: { slotDate: 'asc' } }]
        });

        return res.status(200).json({ success: true, data: rows.map(formatBooking) });
    } catch (error) {
        console.error('Fetch upcoming bookings error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error fetching upcoming bookings.' });
    }
};

const getBookingHistory = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    try {
        const { branchId } = req.query;
        let bookingWhere = {};
        let matchPayWhere = {};

        if (req.user.role === 'CUSTOMER') {
            const userPhone = req.user.mobile || req.user.phone;
            const cleanPhone = userPhone ? userPhone.replace(/\D/g, '').slice(-10) : '';
            bookingWhere = {
                OR: [
                    { userId: req.user.id },
                    ...(cleanPhone ? [{ mobileNumber: { contains: cleanPhone } }] : [])
                ]
            };
            matchPayWhere = {
                OR: [
                    { userId: req.user.id },
                    ...(cleanPhone ? [{ playerPhone: { contains: cleanPhone } }] : [])
                ]
            };
        } else {
            // STAFF, OWNER, SUPER_ADMIN - scope by branch
            const branchFilter = await resolveBranchFilterForUser(req, branchId);
            if (branchFilter.branchId) {
                bookingWhere = { slot: { branchId: branchFilter.branchId } };
                matchPayWhere = { match: { branchId: branchFilter.branchId } };
            }
        }

        const [bookings, matchPayments] = await Promise.all([
            prisma.booking.findMany({
                where: bookingWhere,
                include: { slot: { include: { sport: true, branch: true } } },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.matchPayment.findMany({
                where: matchPayWhere,
                include: { match: { include: { branch: true, sport: true, captainA: true, matchTeams: true } } },
                orderBy: { createdAt: 'desc' }
            })
        ]);

        const existingBookingCodes = new Set(bookings.map(b => (b.bookingCode || '').replace(/\D/g, '')));
        const existingSlotIds = new Set(bookings.map(b => b.slotId).filter(Boolean));

        const formatted = bookings.map(formatBooking);

        for (const mp of matchPayments) {
            const rawMatchId = mp.matchId || mp.id || '';
            const digitsOnly = rawMatchId.replace(/\D/g, '');
            const slotId = mp.match?.slotId;

            // Suppress duplicate rows if this match is already in the bookings list by ID digits or slotId
            const isDuplicateCode = digitsOnly && existingBookingCodes.has(digitsOnly);
            const isDuplicateSlot = slotId && existingSlotIds.has(slotId);

            if (!isDuplicateCode && !isDuplicateSlot) {
                const captainName = mp.playerName || mp.match?.captainA?.name || mp.match?.matchTeams?.[0]?.captainName || 'Valued Player';
                const matchStatus = (mp.paymentStatus === 'COMPLETED' || mp.match?.matchStatus === 'CONFIRMED' || mp.match?.matchStatus === 'COMPLETED') ? 'COMPLETED' : 'HELD';

                formatted.push({
                    booking_id: mp.id,
                    id: mp.id,
                    bookingCode: `MATCH-${digitsOnly ? digitsOnly.slice(-10) : mp.id.slice(-8)}`,
                    user_id: mp.userId,
                    customer_name: captainName,
                    mobile_number: mp.playerPhone || mp.match?.matchTeams?.[0]?.captainPhone || '',
                    amount: Number(mp.amount || mp.match?.totalAmount || 0),
                    gross_amount: Number(mp.amount || mp.match?.totalAmount || 0),
                    commission_rate: 10,
                    commission_amount: Number(mp.commissionAmount || Math.round(Number(mp.amount || 0) * 0.1)),
                    owner_amount: Number(mp.ownerAmount || (Number(mp.amount || 0) * 0.9)),
                    duration: mp.match?.financialSnapshot?.durationHours || 1,
                    booking_status: matchStatus,
                    status: matchStatus,
                    booked_on: mp.createdAt,
                    branch_id: mp.match?.branchId || null,
                    slot_date: mp.createdAt.toISOString().substring(0, 10),
                    start_time: '18:00',
                    end_time: '19:00',
                    court_name: 'Court 1',
                    sport_name: mp.match?.sport?.name || 'Cricket',
                    sport_icon: mp.match?.sport?.icon || '🏏',
                    checkInStatus: 'PENDING',
                    notes: 'E2E Match Slot Booking'
                });
            }
        }

        formatted.sort((a, b) => new Date(b.booked_on) - new Date(a.booked_on));

        return res.status(200).json({ success: true, data: formatted });
    } catch (error) {
        console.error('Fetch booking history error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error fetching booking history.' });
    }
};

const getBookingLedgerSummary = async (req, res) => {
    try {
        const branchFilter = await resolveBranchFilterForUser(req, req.query.branchId);
        const whereSlot = Object.keys(branchFilter).length > 0 ? { slot: branchFilter } : {};

        const now = new Date();
        const startOfToday = new Date(now.toDateString());
        const startOfWeek = new Date(startOfToday);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const [todayCount, weekCount, monthCount, revenue] = await Promise.all([
            prisma.booking.count({ where: { ...whereSlot, createdAt: { gte: startOfToday } } }),
            prisma.booking.count({ where: { ...whereSlot, createdAt: { gte: startOfWeek } } }),
            prisma.booking.count({ where: { ...whereSlot, createdAt: { gte: startOfMonth } } }),
            prisma.booking.aggregate({ where: { ...whereSlot, status: 'COMPLETED' }, _sum: { amount: true } })
        ]);

        const grossRevenue = Number(revenue._sum.amount || 0);
        const commRate = 10; // 10% platform commission
        const totalCommission = Math.round((grossRevenue * commRate) / 100);
        const ownerNetRevenue = grossRevenue - totalCommission;

        const isSuperAdmin = req.user && req.user.role === 'SUPER_ADMIN';

        return res.status(200).json({
            success: true,
            data: {
                todayCount,
                weekCount,
                monthCount,
                grossRevenue,
                totalCommission,
                ownerNetRevenue,
                totalRevenue: isSuperAdmin ? totalCommission : ownerNetRevenue
            }
        });
    } catch (error) {
        console.error('Fetch booking ledger summary error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error fetching booking summary.' });
    }
};

/**
 * Update a booking's payment/lifecycle status. Booking.status is a PaymentStatus
 * value (PENDING/COMPLETED/HELD/FAILED/REFUND_PENDING/REFUNDED) -- there is no
 * separate CONFIRMED/CANCELLED enum on this model.
 */
const updateBookingStatus = async (req, res) => {
    const id = Number(req.params.id);
    const { status } = req.body;

    const upperStatus = (status || '').toUpperCase();
    if (!['PENDING', 'COMPLETED', 'HELD', 'FAILED', 'REFUND_PENDING', 'REFUNDED'].includes(upperStatus)) {
        return res.status(400).json({ success: false, message: 'status must be one of PENDING, COMPLETED, HELD, FAILED, REFUND_PENDING, REFUNDED.' });
    }

    try {
        const booking = await prisma.booking.update({ where: { id }, data: { status: upperStatus } }).catch(() => null);
        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        }

        if (booking.slotId) {
            const slotStatus = ['REFUNDED', 'FAILED', 'REFUND_PENDING'].includes(upperStatus) ? 'AVAILABLE' : 'BOOKED';
            await prisma.slot.update({ where: { id: booking.slotId }, data: { status: slotStatus } });
        }

        return res.status(200).json({ success: true, message: `Booking ${id} status updated to ${upperStatus}` });
    } catch (error) {
        console.error('Update booking status error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error updating booking status.' });
    }
};

/**
 * Guest booking creation -- still requires a real branch/sport/court/slot, just
 * without a logged-in session. No fabricated venue name or price is ever used.
 */
const createGuestBooking = async (req, res) => {
    const { branchId, sportId, courtName, slotDate, startTime, endTime, customerName, phone, notes } = req.body;

    if (!customerName || !phone) {
        return res.status(400).json({ success: false, message: 'customerName and phone are required.' });
    }
    if (!branchId || !sportId || !courtName || !slotDate || !startTime || !endTime) {
        return res.status(400).json({ success: false, message: 'branchId, sportId, courtName, slotDate, startTime, and endTime are required.' });
    }

    try {
        const resolved = await resolveOrCreateSlot({ branchId, sportId, courtName, slotDate, startTime, endTime });
        if (!resolved.ok) return res.status(resolved.code).json({ success: false, message: resolved.message });
        const slot = resolved.slot;
        const amount = slot.isPeakHour ? Number(slot.peakPrice) : Number(slot.regularPrice);

        const booking = await prisma.$transaction(async (tx) => {
            const bookedSlot = await tx.slot.update({ where: { id: slot.id, status: 'AVAILABLE' }, data: { status: 'BOOKED' } }).catch(() => null);
            if (!bookedSlot) throw Object.assign(new Error('Slot was just booked by someone else.'), { code: 'RACE' });

            return tx.booking.create({
                data: {
                    bookingCode: genBookingCode(),
                    slotId: slot.id,
                    customerName: customerName.trim(),
                    mobileNumber: phone.trim(),
                    amount,
                    duration: slot.duration,
                    notes: (notes || '').trim(),
                    status: 'COMPLETED'
                }
            });
        });

        return res.status(201).json({
            success: true,
            message: 'Guest booking created successfully',
            data: { id: booking.bookingCode, bookingId: booking.id, customerName: customerName.trim(), phone: phone.trim(), slotDate, slotTime: startTime, amount, status: 'COMPLETED' }
        });
    } catch (error) {
        if (error.code === 'RACE') {
            return res.status(409).json({ success: false, message: error.message });
        }
        console.error('Guest booking error:', error);
        return res.status(500).json({ success: false, message: 'Failed to create guest booking: ' + error.message });
    }
};

const lookupGuestBookingsByPhone = async (req, res) => {
    const { phone, query } = req.query;
    const searchVal = (phone || query || '').trim();
    const cleanPhone = searchVal.replace(/\D/g, '');

    if (!searchVal) {
        return res.status(400).json({ success: false, message: 'Provide a phone number or booking reference ID to search.' });
    }

    try {
        const bookings = await prisma.booking.findMany({
            where: {
                OR: [
                    { mobileNumber: { contains: cleanPhone.length >= 4 ? cleanPhone : searchVal } },
                    { id: { equals: isNaN(Number(searchVal)) ? -1 : Number(searchVal) } },
                    { bookingCode: { contains: searchVal } }
                ]
            },
            include: { slot: { include: { branch: true, sport: true } } },
            orderBy: { createdAt: 'desc' }
        });

        return res.status(200).json({
            success: true,
            count: bookings.length,
            data: bookings.map(b => {
                const venueName = b.slot?.branch?.branchName || b.branchName || '';
                const dateStr = b.slot?.slotDate ? b.slot.slotDate.toISOString().split('T')[0] : 'Today';
                const timeStr = b.slot?.startTime ? b.slot.startTime.substring(0, 5) : '18:00';
                const bCode = b.bookingCode || `BK-${b.id}`;

                return {
                    id: bCode,
                    bookingId: bCode,
                    customerName: b.customerName,
                    phone: b.mobileNumber,
                    amount: Number(b.amount),
                    duration: b.duration,
                    status: b.status || 'Confirmed',
                    venue: venueName,
                    turfName: venueName,
                    date: dateStr,
                    slotDate: dateStr,
                    time: timeStr,
                    slotTime: timeStr,
                    createdAt: b.createdAt
                };
            })
        });
    } catch (error) {
        console.error('Lookup guest bookings error:', error);
        return res.status(500).json({ success: false, message: 'Failed to lookup guest bookings: ' + error.message });
    }
};

const updateCheckInStatus = async (req, res) => {
    const rawId = req.params.id;
    const { checkInStatus } = req.body;

    const normalizedStatus = (checkInStatus || '').toUpperCase().replace(/[\s-]/g, '_');
    let targetStatus;
    if (['CHECKED_IN', 'CHECKEDIN', 'CHECKIN', 'CHECK_IN'].includes(normalizedStatus)) {
        targetStatus = 'CHECKED_IN';
    } else if (['NO_SHOW', 'NOSHOW', 'NO-SHOW'].includes(normalizedStatus)) {
        targetStatus = 'NO_SHOW';
    } else if (['PENDING', 'PENDING_CHECK_IN'].includes(normalizedStatus)) {
        targetStatus = 'PENDING_CHECK_IN';
    } else {
        return res.status(400).json({ success: false, message: 'checkInStatus must be CHECKED_IN, NO_SHOW, or PENDING_CHECK_IN.' });
    }

    try {
        let bookingId = isNaN(Number(rawId)) ? null : Number(rawId);
        if (!bookingId) {
            const found = await prisma.booking.findFirst({
                where: { OR: [{ bookingCode: rawId }, { id: isNaN(Number(rawId.replace(/\D/g, ''))) ? -1 : Number(rawId.replace(/\D/g, '')) }] }
            });
            if (found) bookingId = found.id;
        }

        if (!bookingId) {
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        }

        const updated = await prisma.booking.update({
            where: { id: bookingId },
            data: {
                checkInStatus: targetStatus,
                checkedInAt: targetStatus === 'CHECKED_IN' ? new Date() : null,
                checkedInByStaffId: req.user?.id || null
            }
        });

        return res.status(200).json({
            success: true,
            message: `Booking check-in status updated to ${targetStatus}`,
            data: {
                id: updated.bookingCode || `BK-${updated.id}`,
                bookingId: updated.id,
                checkInStatus: updated.checkInStatus,
                checkedInAt: updated.checkedInAt
            }
        });
    } catch (error) {
        console.error('Update booking check-in status error:', error);
        return res.status(500).json({ success: false, message: 'Failed to update check-in status: ' + error.message });
    }
};

module.exports = {
    createBooking,
    cancelBooking,
    getUpcomingBookings,
    getBookingHistory,
    getBookingLedgerSummary,
    updateBookingStatus,
    updateCheckInStatus,
    createGuestBooking,
    lookupGuestBookingsByPhone
};
