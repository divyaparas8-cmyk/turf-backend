const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const prisma = require('../../config/prisma');
const { emitToBranch, getIo } = require('../../realtime/socket');

const genId = (prefix) => `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

const saveBase64Image = (base64Str) => {
    if (!base64Str || typeof base64Str !== 'string' || !base64Str.startsWith('data:image/')) {
        return base64Str || null;
    }
    try {
        const matches = base64Str.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
        if (!matches) return base64Str;
        const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        const fileName = `tournament_banner_${Date.now()}_${Math.floor(Math.random() * 10000)}.${ext}`;
        const uploadDir = path.join(__dirname, '../../../public/uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        fs.writeFileSync(path.join(uploadDir, fileName), buffer);
        return `/uploads/${fileName}`;
    } catch (err) {
        console.error('Base64 banner save error:', err);
        return base64Str;
    }
};

const STATUS_MAP_IN = {
    'Pending Approval': 'PENDING_APPROVAL', 'Approved': 'APPROVED', 'Rejected': 'REJECTED',
    'Suspended': 'CANCELLED', 'Active': 'ACTIVE', 'Completed': 'COMPLETED'
};
const normalizeStatus = (s) => (s ? (STATUS_MAP_IN[s] || s.toUpperCase()) : undefined);

/** Blocks a branch's court for every day of the tournament via real Slot rows. */
const autoLockTurfSlots = async (tournament) => {
    try {
        let curr = new Date(tournament.startDate);
        const end = new Date(tournament.endDate);
        const courtName = tournament.turfCourtName || 'Main Turf';

        while (curr <= end) {
            const dateStr = curr.toISOString().split('T')[0];
            await prisma.slot.upsert({
                where: { branchId_courtName_slotDate_startTime: { branchId: tournament.branchId, courtName, slotDate: new Date(dateStr), startTime: '08:00:00' } },
                update: { status: 'BLOCKED', notes: `Locked for Tournament: ${tournament.title}` },
                create: {
                    id: `slot_tourney_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                    branchId: tournament.branchId, sportId: tournament.sportId, courtName,
                    slotDate: new Date(dateStr), startTime: '08:00:00', endTime: '20:00:00', duration: 720,
                    status: 'BLOCKED', notes: `Locked for Tournament: ${tournament.title}`
                }
            });
            curr.setDate(curr.getDate() + 1);
        }
    } catch (err) {
        console.error('Error auto locking turf slots:', err);
    }
};

const formatTournament = (r) => ({
    id: r.id, _id: r.id, name: r.title, title: r.title,
    banner: r.bannerImage || '', description: r.description || '', rules: r.tournamentRules || '',
    sport: r.sport?.name, sportId: r.sportId, category: r.category?.name || null, categoryId: r.categoryId,
    courtName: r.turfCourtName || 'Main Pitch',
    branchName: r.branch?.name || 'SportMatrix Arena',
    location: r.branch ? `${r.branch.city || 'Matrix Arena'}${r.branch.state ? ', ' + r.branch.state : ''}` : 'SportMatrix Venue',
    organizer: r.branch?.ownerUser?.name || 'Turf Owner',
    organizerEmail: r.branch?.ownerUser?.email || '',
    startDate: r.startDate, endDate: r.endDate,
    registrationLastDate: r.registrationLastDate,
    entryFee: String(r.entryFeePerTeam), prize: r.prizePoolTotal, prizePool: r.prizePoolTotal,
    winnerPrize: Number(r.firstPrizeWinner), runnerPrize: Number(r.secondPrizeRunnerUp), thirdPrize: Number(r.thirdPrize),
    teams: `${r._count?.teams ?? 0}/${r.maximumTeams}`,
    registrations: r._count?.teams ?? 0,
    maxTeams: r.maximumTeams, minTeams: r.minimumTeams,
    format: r.tournamentFormat, matchDuration: r.matchDurationMinutes,
    skillLevel: r.skillLevel, ageLimit: r.ageLimit, gender: r.genderCriteria,
    status: r.status, branchId: r.branchId, createdAt: r.createdAt
});

const getOwnerBranchIds = async (user) => {
    if (!user || user.role === 'SUPER_ADMIN' || user.role === 'SUPERADMIN' || user.role === 'ADMIN') return null;
    if (user.role === 'STAFF') {
        const staffUser = await prisma.user.findUnique({ where: { id: user.id } }).catch(() => null);
        const targetBranchId = staffUser?.staffBranchId || user.staffBranchId || user.branchId;
        if (targetBranchId) return [targetBranchId];
    }
    const branches = await prisma.branch.findMany({
        where: { OR: [{ ownerUserId: user.id }, { owner: { userId: user.id } }, { ownerId: user.id }] },
        select: { id: true }
    });
    if (branches.length > 0) return branches.map(b => b.id);
    const fallbackBranches = await prisma.branch.findMany({ select: { id: true } });
    return fallbackBranches.map(b => b.id);
};

const getTournaments = async (req, res) => {
    const { branchId, status } = req.query;
    try {
        const where = {};
        if (branchId) {
            where.branchId = branchId;
        } else if (req.user && (req.user.role === 'OWNER' || req.user.role === 'STAFF')) {
            const ownerBranchIds = await getOwnerBranchIds(req.user);
            if (ownerBranchIds) {
                where.branchId = { in: ownerBranchIds };
            }
        }

        if (status) where.status = normalizeStatus(status);
        else if (!req.user || req.user.role === 'CUSTOMER') where.status = { in: ['APPROVED', 'REGISTRATION_OPEN', 'UPCOMING', 'ACTIVE', 'RUNNING', 'COMPLETED'] };

        const rows = await prisma.tournament.findMany({
            where,
            include: {
                sport: true,
                category: true,
                branch: { include: { ownerUser: { select: { id: true, name: true, email: true } } } },
                _count: { select: { teams: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        return res.status(200).json({ success: true, data: rows.map(formatTournament) });
    } catch (error) {
        console.error('Fetch tournaments error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error fetching tournaments.' });
    }
};

const getTournamentById = async (req, res) => {
    try {
        const t = await prisma.tournament.findUnique({
            where: { id: req.params.id },
            include: {
                sport: true,
                category: true,
                branch: { include: { ownerUser: { select: { id: true, name: true, email: true } } } },
                teams: { include: { players: true } }
            }
        });
        if (!t) {
            return res.status(404).json({ success: false, message: 'Tournament not found.' });
        }
        return res.status(200).json({
            success: true,
            data: { ...formatTournament(t), registrations: t.teams.filter(tm => tm.status === 'APPROVED' || tm.status === 'CONFIRMED').length, teamsList: t.teams }
        });
    } catch (error) {
        console.error('Fetch tournament error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error.' });
    }
};

const createTournament = async (req, res) => {
    const {
        branchId, title, name, banner, sportId, categoryId, description, rules, courtName,
        startDate, endDate, registrationLastDate, maxTeams = 16, minTeams = 4, entryFee = 0,
        winnerPrize = 0, runnerPrize = 0, thirdPrize = 0, format = 'Knockout Bracket',
        matchDuration = 60, skillLevel, ageLimit, gender
    } = req.body;

    const tournamentTitle = title || name;
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    try {
        let targetBranchId = branchId;
        if (req.user.role === 'OWNER' || req.user.role === 'STAFF') {
            const userBranch = await prisma.branch.findFirst({
                where: req.user.role === 'STAFF' && req.user.staffBranchId ? { id: req.user.staffBranchId } : { ownerUserId: req.user.id }
            });
            if (userBranch) {
                targetBranchId = userBranch.id;
            } else if (!targetBranchId || targetBranchId === 'br_001') {
                const anyBranch = await prisma.branch.findFirst();
                if (anyBranch) targetBranchId = anyBranch.id;
            }
        }

        if (!targetBranchId || !sportId || !tournamentTitle || !startDate || !endDate) {
            return res.status(400).json({ success: false, message: 'branchId, sportId, title, startDate, and endDate are required.' });
        }

        const initialStatus = (req.user.role === 'OWNER' || req.user.role === 'SUPER_ADMIN') ? 'APPROVED' : 'PENDING_APPROVAL';
        const prizePool = `₹${(Number(winnerPrize) + Number(runnerPrize) + Number(thirdPrize)).toLocaleString()}`;
        const savedBannerPath = saveBase64Image(banner);

        const tournament = await prisma.tournament.create({
            data: {
                id: genId('t'),
                branchId: targetBranchId, sportId, categoryId: categoryId || null,
                title: tournamentTitle, bannerImage: savedBannerPath, description: description || null, tournamentRules: rules || null,
                turfCourtName: courtName || undefined,
                startDate: new Date(startDate), endDate: new Date(endDate),
                registrationLastDate: registrationLastDate ? new Date(registrationLastDate) : new Date(endDate),
                maximumTeams: maxTeams, minimumTeams: minTeams, entryFeePerTeam: entryFee,
                firstPrizeWinner: winnerPrize, secondPrizeRunnerUp: runnerPrize, thirdPrize,
                prizePoolTotal: prizePool, tournamentFormat: format, matchDurationMinutes: matchDuration,
                skillLevel: skillLevel || undefined, ageLimit: ageLimit || undefined, genderCriteria: gender || undefined,
                status: initialStatus
            }
        });

        if (initialStatus === 'APPROVED') {
            await autoLockTurfSlots(tournament);
        }

        return res.status(201).json({
            success: true,
            message: initialStatus === 'APPROVED' ? 'Tournament created & approved successfully!' : 'Tournament created & submitted for approval.',
            data: { id: tournament.id, title: tournament.title, status: tournament.status }
        });
    } catch (error) {
        console.error('Create tournament error:', error);
        return res.status(500).json({ success: false, message: error.message || 'Internal Server Error.' });
    }
};

const requireTournamentAdmin = async (id, user) => {
    if (user.role === 'SUPER_ADMIN') return true;
    const tournament = await prisma.tournament.findUnique({ where: { id }, include: { branch: true } });
    return !!tournament && tournament.branch.ownerUserId === user.id;
};

const approveTournament = async (req, res) => {
    try {
        if (!(await requireTournamentAdmin(req.params.id, req.user))) {
            return res.status(403).json({ success: false, message: 'Forbidden.' });
        }
        const tournament = await prisma.tournament.update({ where: { id: req.params.id }, data: { status: 'APPROVED' } }).catch(() => null);
        if (!tournament) {
            return res.status(404).json({ success: false, message: 'Tournament not found.' });
        }
        await autoLockTurfSlots(tournament);
        return res.status(200).json({ success: true, message: 'Tournament approved successfully. Turf match slots reserved.' });
    } catch (error) {
        console.error('Approve tournament error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error.' });
    }
};

const rejectTournament = async (req, res) => {
    try {
        if (!(await requireTournamentAdmin(req.params.id, req.user))) {
            return res.status(403).json({ success: false, message: 'Forbidden.' });
        }
        await prisma.tournament.update({ where: { id: req.params.id }, data: { status: 'REJECTED' } });
        return res.status(200).json({ success: true, message: 'Tournament rejected.' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal Server Error.' });
    }
};

const suspendTournament = async (req, res) => {
    try {
        if (!(await requireTournamentAdmin(req.params.id, req.user))) {
            return res.status(403).json({ success: false, message: 'Forbidden.' });
        }
        await prisma.tournament.update({ where: { id: req.params.id }, data: { status: 'CANCELLED' } });
        return res.status(200).json({ success: true, message: 'Tournament suspended.' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal Server Error.' });
    }
};

const deleteTournament = async (req, res) => {
    try {
        if (!(await requireTournamentAdmin(req.params.id, req.user))) {
            return res.status(403).json({ success: false, message: 'Forbidden.' });
        }
        await prisma.tournament.delete({ where: { id: req.params.id } });
        return res.status(200).json({ success: true, message: 'Tournament deleted.' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal Server Error.' });
    }
};

const updateTournament = async (req, res) => {
    const { title, name, description, rules, startDate, endDate, entryFee, winnerPrize, runnerPrize, thirdPrize, maxTeams, minTeams, format, status } = req.body;
    try {
        if (!(await requireTournamentAdmin(req.params.id, req.user))) {
            return res.status(403).json({ success: false, message: 'Forbidden.' });
        }
        await prisma.tournament.update({
            where: { id: req.params.id },
            data: {
                title: (title || name) ?? undefined, description: description ?? undefined, tournamentRules: rules ?? undefined,
                startDate: startDate ? new Date(startDate) : undefined, endDate: endDate ? new Date(endDate) : undefined,
                entryFeePerTeam: entryFee ?? undefined, firstPrizeWinner: winnerPrize ?? undefined,
                secondPrizeRunnerUp: runnerPrize ?? undefined, thirdPrize: thirdPrize ?? undefined,
                maximumTeams: maxTeams ?? undefined, minimumTeams: minTeams ?? undefined,
                tournamentFormat: format ?? undefined, status: status ? normalizeStatus(status) : undefined
            }
        });
        return res.status(200).json({ success: true, message: 'Tournament updated successfully.' });
    } catch (error) {
        console.error('Update tournament error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error.' });
    }
};

// ==========================================
// CATEGORIES
// ==========================================
const DEFAULT_CATEGORIES = [
    { id: 'cat_01', name: 'Open Category', description: 'All ages open tournament' },
    { id: 'cat_02', name: 'Under 19 (U-19)', description: 'Youth tournament for U-19 players' },
    { id: 'cat_03', name: 'Corporate Cup', description: 'Exclusive for corporate company teams' },
    { id: 'cat_04', name: 'Veterans (35+)', description: 'Tournament for veteran players 35 years & above' },
    { id: 'cat_05', name: 'Women League', description: 'All women team tournament' }
];

const getCategories = async (req, res) => {
    try {
        let rows = await prisma.tournamentCategory.findMany({ orderBy: { name: 'asc' } });
        if (rows.length === 0) {
            await prisma.tournamentCategory.createMany({ data: DEFAULT_CATEGORIES });
            rows = await prisma.tournamentCategory.findMany({ orderBy: { name: 'asc' } });
        }
        return res.status(200).json({ success: true, data: rows });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal Server Error.' });
    }
};

const createCategory = async (req, res) => {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Category name is required.' });
    try {
        const category = await prisma.tournamentCategory.create({ data: { id: genId('cat'), name, description: description || null } });
        return res.status(201).json({ success: true, message: 'Category created successfully.', data: category });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal Server Error.' });
    }
};

const updateCategory = async (req, res) => {
    const { name, description } = req.body;
    try {
        await prisma.tournamentCategory.update({ where: { id: req.params.id }, data: { name: name ?? undefined, description: description ?? undefined } });
        return res.status(200).json({ success: true, message: 'Category updated.' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal Server Error.' });
    }
};

const deleteCategory = async (req, res) => {
    try {
        await prisma.tournamentCategory.delete({ where: { id: req.params.id } });
        return res.status(200).json({ success: true, message: 'Category deleted.' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal Server Error.' });
    }
};

// ==========================================
// TEAM REGISTRATION
// ==========================================
const registerTeam = async (req, res) => {
    const { teamName, captainName, captainEmail, captainMobile, players, paymentMethod = 'UPI' } = req.body;
    if (!teamName || !captainName || !captainMobile || !captainEmail) {
        return res.status(400).json({ success: false, message: 'Team Name, Captain Name, Captain Email, and Captain Mobile are required.' });
    }

    try {
        const tournament = await prisma.tournament.findUnique({ where: { id: req.params.id } });
        if (!tournament) {
            return res.status(404).json({ success: false, message: 'Tournament not found.' });
        }

        const teamId = genId('tm');
        const team = await prisma.$transaction(async (tx) => {
            const created = await tx.tournamentTeam.create({
                data: {
                    id: teamId, tournamentId: tournament.id, teamName, captainName, captainEmail, captainMobile,
                    paymentMethod: paymentMethod.toUpperCase(), paymentStatus: 'COMPLETED', status: 'CONFIRMED'
                }
            });

            if (Array.isArray(players)) {
                for (const p of players) {
                    if (p.name || p.playerName) {
                        const parsedJersey = p.jerseyNumber && !isNaN(p.jerseyNumber) ? parseInt(p.jerseyNumber, 10) : null;
                        await tx.tournamentPlayer.create({
                            data: { id: genId('pl'), teamId, playerName: p.name || p.playerName, mobile: p.mobile || null, jerseyNumber: parsedJersey, role: p.role || null }
                        });
                    }
                }
            }

            const invoiceNumber = `INV-TRN-${Date.now().toString().slice(-6)}`;
            const commissionRate = 10;
            await tx.tournamentPayment.create({
                data: {
                    id: genId('tpay'), invoiceNumber, tournamentId: tournament.id, teamId,
                    payerName: captainName, transactionType: 'Entry Fee', amount: tournament.entryFeePerTeam,
                    platformCommRate: commissionRate, commissionAmount: Math.round(Number(tournament.entryFeePerTeam) * commissionRate / 100),
                    paymentMode: paymentMethod.toUpperCase(), status: 'COMPLETED'
                }
            });

            return created;
        });

        return res.status(201).json({ success: true, message: 'Team registered successfully.', teamId: team.id });
    } catch (error) {
        console.error('Register team error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error.' });
    }
};

const createRazorpayOrder = async (req, res) => {
    try {
        const tournament = await prisma.tournament.findUnique({ where: { id: req.params.id } });
        if (!tournament) {
            return res.status(404).json({ success: false, message: 'Tournament not found.' });
        }

        const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_T1r8sgDPyFz1bB';
        const keySecret = process.env.RAZORPAY_KEY_SECRET || 'GBL1GdG1iHJWvDEFkvDyG0Bf';

        const razorpay = new Razorpay({
            key_id: keyId,
            key_secret: keySecret
        });

        const entryFee = Number(tournament.entryFeePerTeam) || 0;
        const amountInPaise = Math.round(entryFee * 100);

        if (amountInPaise <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid tournament entry fee amount.' });
        }

        const options = {
            amount: amountInPaise,
            currency: 'INR',
            receipt: `rcpt_trn_${Date.now().toString().slice(-8)}`,
            notes: {
                tournamentId: tournament.id,
                tournamentTitle: tournament.title
            }
        };

        const order = await razorpay.orders.create(options);
        return res.status(200).json({
            success: true,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: keyId,
            tournamentTitle: tournament.title,
            entryFee: entryFee
        });
    } catch (error) {
        console.error('Create Razorpay Order error:', error);
        return res.status(500).json({ success: false, message: 'Failed to initialize Razorpay payment order: ' + error.message });
    }
};

const verifyRazorpayPayment = async (req, res) => {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, teamName, captainName, captainEmail, captainMobile, players, jerseyColor } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !teamName || !captainName || !captainMobile) {
        return res.status(400).json({ success: false, message: 'Payment verification tokens and captain/team details are required.' });
    }

    try {
        const keySecret = process.env.RAZORPAY_KEY_SECRET || 'GBL1GdG1iHJWvDEFkvDyG0Bf';
        const body = razorpayOrderId + '|' + razorpayPaymentId;

        const expectedSignature = crypto
            .createHmac('sha256', keySecret)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature !== razorpaySignature) {
            return res.status(400).json({ success: false, message: 'Razorpay payment signature verification failed. Tampered transaction detected.' });
        }

        const tournament = await prisma.tournament.findUnique({ where: { id: req.params.id } });
        if (!tournament) {
            return res.status(404).json({ success: false, message: 'Tournament not found.' });
        }

        const validPaymentMethod = (req.body.paymentMethod && ['UPI', 'CASH', 'CARD', 'WALLET', 'BANK_TRANSFER', 'ONLINE'].includes(req.body.paymentMethod.toUpperCase()))
            ? req.body.paymentMethod.toUpperCase()
            : 'UPI';

        const teamId = genId('tm');
        const team = await prisma.$transaction(async (tx) => {
            const created = await tx.tournamentTeam.create({
                data: {
                    id: teamId,
                    tournamentId: tournament.id,
                    teamName,
                    captainName,
                    captainEmail: captainEmail || '',
                    captainMobile,
                    paymentMethod: validPaymentMethod,
                    paymentStatus: 'COMPLETED',
                    status: 'CONFIRMED'
                }
            });

            if (Array.isArray(players)) {
                for (const p of players) {
                    if (p.name || p.playerName) {
                        const parsedJersey = p.jerseyNumber && !isNaN(p.jerseyNumber) ? parseInt(p.jerseyNumber, 10) : null;
                        await tx.tournamentPlayer.create({
                            data: {
                                id: genId('pl'),
                                teamId,
                                playerName: p.name || p.playerName,
                                mobile: p.mobile || null,
                                jerseyNumber: parsedJersey,
                                role: p.role || null
                            }
                        });
                    }
                }
            }

            const invoiceNumber = `INV-TRN-RZP-${Date.now().toString().slice(-6)}`;
            const commissionRate = 10;
            await tx.tournamentPayment.create({
                data: {
                    id: genId('tpay'),
                    invoiceNumber,
                    tournamentId: tournament.id,
                    teamId,
                    payerName: captainName,
                    transactionType: 'Entry Fee',
                    amount: tournament.entryFeePerTeam,
                    platformCommRate: commissionRate,
                    commissionAmount: Math.round(Number(tournament.entryFeePerTeam) * commissionRate / 100),
                    paymentMode: validPaymentMethod,
                    status: 'COMPLETED',
                    transactionId: razorpayPaymentId
                }
            });

            return created;
        });

        return res.status(201).json({ success: true, message: 'Payment verified and Team registered successfully!', teamId: team.id });
    } catch (error) {
        console.error('Verify Razorpay Payment error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error verifying Razorpay payment: ' + error.message });
    }
};

const getTeams = async (req, res) => {
    const { tournamentId } = req.query;
    try {
        const where = {};
        if (tournamentId) where.tournamentId = tournamentId;
        if (req.user && (req.user.role === 'OWNER' || req.user.role === 'STAFF')) {
            const ownerBranchIds = await getOwnerBranchIds(req.user);
            if (ownerBranchIds) {
                where.tournament = { branchId: { in: ownerBranchIds } };
            }
        }
        const teams = await prisma.tournamentTeam.findMany({
            where,
            include: { players: true, tournament: { select: { title: true, entryFeePerTeam: true } } },
            orderBy: { createdAt: 'desc' }
        });
        const formattedTeams = teams.map(tm => ({
            ...tm,
            tournamentTitle: tm.tournament?.title || 'Tournament',
            amount: tm.tournament?.entryFeePerTeam || 0
        }));
        return res.status(200).json({ success: true, data: formattedTeams });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal Server Error.' });
    }
};

const updateTeamStatus = async (req, res) => {
    try {
        await prisma.tournamentTeam.update({ where: { id: req.params.teamId }, data: { status: (req.body.status || '').toUpperCase() } });
        return res.status(200).json({ success: true, message: `Team status updated to ${req.body.status}` });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal Server Error.' });
    }
};

// ==========================================
// FIXTURES & LEADERBOARD
// ==========================================
const generateFixtures = async (req, res) => {
    try {
        const tournament = await prisma.tournament.findUnique({ where: { id: req.params.id } });
        if (!tournament) {
            return res.status(404).json({ success: false, message: 'Tournament not found.' });
        }
        const teams = await prisma.tournamentTeam.findMany({ where: { tournamentId: tournament.id, status: { in: ['APPROVED', 'CONFIRMED'] } } });
        if (teams.length < 2) {
            return res.status(400).json({ success: false, message: 'At least 2 approved teams required to generate fixtures.' });
        }

        await prisma.fixture.deleteMany({ where: { tournamentId: tournament.id } });
        await prisma.tournamentLeaderboard.deleteMany({ where: { tournamentId: tournament.id } });

        const fixtures = [];
        let matchCounter = 1;

        if (tournament.tournamentFormat.toLowerCase().includes('knockout')) {
            const roundName = teams.length <= 4 ? 'Semi-Finals' : teams.length <= 8 ? 'Quarter-Finals' : 'Round of 16';
            for (let i = 0; i < teams.length; i += 2) {
                if (!teams[i + 1]) continue;
                fixtures.push({
                    id: genId('fix'), tournamentId: tournament.id, roundName, matchNumber: matchCounter,
                    teamAId: teams[i].id, teamBId: teams[i + 1].id, matchDate: tournament.startDate, matchTime: '16:00:00'
                });
                matchCounter++;
            }
        } else {
            for (let i = 0; i < teams.length; i++) {
                for (let j = i + 1; j < teams.length; j++) {
                    fixtures.push({
                        id: genId('fix'), tournamentId: tournament.id, roundName: `League Round ${Math.floor(matchCounter / 2) + 1}`,
                        matchNumber: matchCounter, teamAId: teams[i].id, teamBId: teams[j].id,
                        matchDate: tournament.startDate, matchTime: `${14 + (matchCounter % 5)}:00:00`
                    });
                    matchCounter++;
                }
            }
        }

        await prisma.fixture.createMany({ data: fixtures });
        await prisma.tournamentLeaderboard.createMany({
            data: teams.map(t => ({ id: genId('lb'), tournamentId: tournament.id, teamId: t.id }))
        });

        return res.status(200).json({ success: true, message: `Generated ${fixtures.length} match fixtures successfully!`, count: fixtures.length });
    } catch (error) {
        console.error('Generate fixtures error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error.' });
    }
};

const getFixtures = async (req, res) => {
    try {
        const fixtures = await prisma.fixture.findMany({
            where: { tournamentId: req.params.id },
            include: { teamA: true, teamB: true, winner: true },
            orderBy: { matchNumber: 'asc' }
        });
        return res.status(200).json({ success: true, data: fixtures });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal Server Error.' });
    }
};

const updateMatchScore = async (req, res) => {
    const {
        teamAScore, teamBScore, winnerId, status = 'COMPLETED',
        yellowCardsTeamA = 0, redCardsTeamA = 0, yellowCardsTeamB = 0, redCardsTeamB = 0,
        matchDate, matchTime, groundCourtName
    } = req.body;

    try {
        const fixture = await prisma.fixture.findUnique({ where: { id: req.params.matchId }, include: { tournament: true } });
        if (!fixture) {
            return res.status(404).json({ success: false, message: 'Match fixture not found.' });
        }

        await prisma.fixture.update({
            where: { id: fixture.id },
            data: {
                teamAScore: teamAScore ?? undefined, teamBScore: teamBScore ?? undefined, winnerId: winnerId || undefined,
                status, yellowCardsTeamA, redCardsTeamA, yellowCardsTeamB, redCardsTeamB,
                matchDate: matchDate ? new Date(matchDate) : undefined,
                matchTime: matchTime ?? undefined,
                groundCourtName: groundCourtName ?? undefined
            }
        });

        if (status === 'COMPLETED' && winnerId !== undefined) {
            const isDraw = !winnerId;
            const applyResult = (teamId, isWinner) => prisma.tournamentLeaderboard.updateMany({
                where: { tournamentId: fixture.tournamentId, teamId },
                data: {
                    matchesPlayed: { increment: 1 },
                    matchesWon: { increment: isWinner ? 1 : 0 },
                    matchesLost: { increment: (!isWinner && !isDraw) ? 1 : 0 },
                    matchesTied: { increment: isDraw ? 1 : 0 },
                    points: { increment: isWinner ? 2 : (isDraw ? 1 : 0) }
                }
            });

            if (fixture.teamAId) await applyResult(fixture.teamAId, winnerId === fixture.teamAId);
            if (fixture.teamBId) await applyResult(fixture.teamBId, winnerId === fixture.teamBId);
        }

        emitToBranch(fixture.tournament?.branchId, 'tournament:match-updated', { matchId: fixture.id, tournamentId: fixture.tournamentId });

        return res.status(200).json({ success: true, message: 'Match score & live status updated successfully.' });
    } catch (error) {
        console.error('Update match score error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error.' });
    }
};

const getLeaderboard = async (req, res) => {
    try {
        const rows = await prisma.tournamentLeaderboard.findMany({
            where: { tournamentId: req.params.id },
            include: { team: true },
            orderBy: [{ points: 'desc' }, { matchesWon: 'desc' }, { netRunRate: 'desc' }]
        });
        return res.status(200).json({ success: true, data: rows });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal Server Error.' });
    }
};

const getGlobalLeaderboard = async (req, res) => {
    try {
        const players = await prisma.scorecard.findMany({ 
            orderBy: [{ ppsScore: 'desc' }, { matches: 'desc' }], 
            take: 100 
        });
        return res.status(200).json({ success: true, data: players });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};



// ==========================================
// SPONSORS
// ==========================================
const getSponsors = async (req, res) => {
    try {
        const where = {};
        if (req.user && (req.user.role === 'OWNER' || req.user.role === 'STAFF')) {
            const ownerBranchIds = await getOwnerBranchIds(req.user);
            if (ownerBranchIds) {
                where.tournament = { branchId: { in: ownerBranchIds } };
            }
        }
        const rows = await prisma.tournamentSponsor.findMany({ where, include: { tournament: { select: { title: true } } }, orderBy: { packageAmount: 'desc' } });
        return res.status(200).json({ success: true, data: rows });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal Server Error.' });
    }
};

const createSponsor = async (req, res) => {
    const { tournamentId, companyName, sponsorName, tier, sponsorTier, logo, website, websiteUrl, packageAmount = 0 } = req.body;
    const name = sponsorName || companyName;
    if (!tournamentId || !name) return res.status(400).json({ success: false, message: 'tournamentId and sponsor name are required.' });

    try {
        const sponsor = await prisma.tournamentSponsor.create({
            data: { id: genId('spn'), tournamentId, sponsorName: name, sponsorTier: sponsorTier || tier || 'Gold Sponsor', logo: logo || null, websiteUrl: websiteUrl || website || null, packageAmount }
        });
        return res.status(201).json({ success: true, message: 'Sponsor added successfully.', data: sponsor });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal Server Error.' });
    }
};

const updateSponsor = async (req, res) => {
    const { companyName, sponsorName, tier, sponsorTier, logo, website, websiteUrl, packageAmount, status } = req.body;
    try {
        await prisma.tournamentSponsor.update({
            where: { id: req.params.id },
            data: {
                sponsorName: (sponsorName || companyName) ?? undefined, sponsorTier: (sponsorTier || tier) ?? undefined,
                logo: logo ?? undefined, websiteUrl: (websiteUrl || website) ?? undefined,
                packageAmount: packageAmount ?? undefined, status: status ?? undefined
            }
        });
        return res.status(200).json({ success: true, message: 'Sponsor updated.' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal Server Error.' });
    }
};

const deleteSponsor = async (req, res) => {
    try {
        await prisma.tournamentSponsor.delete({ where: { id: req.params.id } });
        return res.status(200).json({ success: true, message: 'Sponsor deleted.' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal Server Error.' });
    }
};

// ==========================================
// PAYMENTS & REPORTS
// ==========================================
const getTournamentPayments = async (req, res) => {
    try {
        const where = {};
        if (req.user && (req.user.role === 'OWNER' || req.user.role === 'STAFF')) {
            const ownerBranchIds = await getOwnerBranchIds(req.user);
            if (ownerBranchIds) {
                where.tournament = { branchId: { in: ownerBranchIds } };
            }
        }
        const rows = await prisma.tournamentPayment.findMany({ where, include: { tournament: { select: { title: true } } }, orderBy: { createdAt: 'desc' } });
        const totalRevenue = rows.reduce((sum, r) => sum + Number(r.amount), 0);
        const totalCommission = rows.reduce((sum, r) => sum + Number(r.commissionAmount), 0);
        return res.status(200).json({ success: true, summary: { totalRevenue, totalCommission, totalTransactions: rows.length }, data: rows });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal Server Error.' });
    }
};

const getTournamentReports = async (req, res) => {
    try {
        const tournamentWhere = {};
        if (req.user && (req.user.role === 'OWNER' || req.user.role === 'STAFF')) {
            const ownerBranchIds = await getOwnerBranchIds(req.user);
            if (ownerBranchIds) {
                tournamentWhere.branchId = { in: ownerBranchIds };
            }
        }
        const teamWhere = Object.keys(tournamentWhere).length ? { tournament: tournamentWhere } : {};
        const paymentWhere = Object.keys(tournamentWhere).length ? { tournament: tournamentWhere } : {};

        const [statusGroups, totalTeams, paymentAgg] = await Promise.all([
            prisma.tournament.groupBy({ by: ['status'], where: tournamentWhere, _count: { status: true } }),
            prisma.tournamentTeam.count({ where: teamWhere }),
            prisma.tournamentPayment.aggregate({ where: paymentWhere, _sum: { amount: true, commissionAmount: true } })
        ]);

        return res.status(200).json({
            success: true,
            data: {
                tournamentStatusBreakdown: statusGroups.map(g => ({ status: g.status, count: g._count.status })),
                totalTeamsRegistered: totalTeams,
                totalRevenue: Number(paymentAgg._sum.amount || 0),
                totalCommission: Number(paymentAgg._sum.commissionAmount || 0)
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal Server Error.' });
    }
};

// ==========================================
// SETTINGS
// ==========================================
const getSettings = async (req, res) => {
    try {
        let settings = await prisma.tournamentSetting.findUnique({ where: { id: 'global_tournament_settings' } });
        if (!settings) {
            settings = await prisma.tournamentSetting.create({ data: { id: 'global_tournament_settings' } });
        }
        return res.status(200).json({ success: true, data: settings });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal Server Error.' });
    }
};

const updateSettings = async (req, res) => {
    const { platformCommissionPercentage, autoLockSlots, allowStaffCreate, notifyOnApproval } = req.body;
    try {
        const settings = await prisma.tournamentSetting.upsert({
            where: { id: 'global_tournament_settings' },
            update: {
                platformCommissionPercentage: platformCommissionPercentage ?? undefined,
                automaticSlotReservation: autoLockSlots ?? undefined,
                allowStaffTournamentCreation: allowStaffCreate ?? undefined,
                automatedApprovalNotifications: notifyOnApproval ?? undefined
            },
            create: {
                id: 'global_tournament_settings',
                platformCommissionPercentage: platformCommissionPercentage ?? 10.0,
                automaticSlotReservation: autoLockSlots ?? true,
                allowStaffTournamentCreation: allowStaffCreate ?? true,
                automatedApprovalNotifications: notifyOnApproval ?? true
            }
        });
        return res.status(200).json({ success: true, message: 'Tournament settings saved successfully.', data: settings });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal Server Error.' });
    }
};

// ==========================================
// LIVE MATCH SCORING (real Fixtures, not a disconnected mock table)
// ==========================================
const getAllTournamentMatches = async (req, res) => {
    try {
        const where = {};
        if (req.user && (req.user.role === 'OWNER' || req.user.role === 'STAFF')) {
            const ownerBranchIds = await getOwnerBranchIds(req.user);
            if (ownerBranchIds) {
                where.tournament = { branchId: { in: ownerBranchIds } };
            }
        }
        const rows = await prisma.fixture.findMany({
            where,
            include: {
                teamA: true,
                teamB: true,
                tournament: {
                    select: {
                        title: true,
                        branchId: true,
                        turfCourtName: true,
                        branch: { select: { branchName: true, city: true } }
                    }
                }
            },
            orderBy: { matchDate: 'desc' }
        });
        return res.status(200).json({ success: true, data: rows });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const saveLiveMatchScore = async (req, res) => {
    const { matchId, teamAScore, teamBScore, matchSummary, status } = req.body;
    if (!matchId) {
        return res.status(400).json({ success: false, message: 'matchId is required.' });
    }
    try {
        const updated = await prisma.fixture.update({
            where: { id: matchId },
            data: {
                teamAScore: teamAScore ?? undefined,
                teamBScore: teamBScore ?? undefined,
                matchSummary: matchSummary ?? undefined,
                status: status ? status.toUpperCase() : undefined
            },
            include: { teamA: true, teamB: true, tournament: { select: { title: true, branchId: true } } }
        }).catch(() => null);

        if (!updated) {
            return res.status(404).json({ success: false, message: 'Fixture not found.' });
        }

        // Broadcast to all connected clients (spectators, customers, umpires)
        const io = getIo();
        if (io) {
            const payload = {
                matchId: updated.id,
                teamAScore: updated.teamAScore,
                teamBScore: updated.teamBScore,
                teamAName: updated.teamA?.teamName,
                teamBName: updated.teamB?.teamName,
                status: updated.status,
                matchSummary: updated.matchSummary,
                tournament: updated.tournament?.title
            };
            io.emit('live:score-update', payload);
            if (updated.tournament?.branchId) {
                emitToBranch(updated.tournament.branchId, 'tournament:match-updated', payload);
            }
        }

        return res.status(200).json({ success: true, message: `Match state saved successfully for ${matchId}.`, data: updated });
    } catch (error) {
        console.error('Save live match score error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/** Public endpoint — returns all currently LIVE matches. No auth required. */
const getLiveMatches = async (req, res) => {
    try {
        const rows = await prisma.fixture.findMany({
            where: { status: 'LIVE' },
            include: {
                teamA: true,
                teamB: true,
                tournament: {
                    select: {
                        title: true, branchId: true, turfCourtName: true,
                        branch: { select: { branchName: true, city: true } }
                    }
                }
            },
            orderBy: { matchDate: 'desc' }
        });
        return res.status(200).json({ success: true, data: rows });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getTournaments, getTournamentById, createTournament, updateTournament,
    approveTournament, rejectTournament, suspendTournament, deleteTournament,
    getCategories, createCategory, updateCategory, deleteCategory,
    registerTeam, createRazorpayOrder, verifyRazorpayPayment, getTeams, updateTeamStatus,
    generateFixtures, getFixtures, updateMatchScore, getLeaderboard, getGlobalLeaderboard,
    getSponsors, createSponsor, updateSponsor, deleteSponsor,
    getTournamentPayments, getTournamentReports, getSettings, updateSettings,
    getAllTournamentMatches, saveLiveMatchScore, getLiveMatches
};
