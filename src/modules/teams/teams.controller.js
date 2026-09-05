const prisma = require('../../config/prisma');

const genId = () => `tm_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

const formatTeam = (t, currentUserId = null) => {
    // Determine user status if memberships exist
    let userStatus = null;
    if (currentUserId && Array.isArray(t.joinRequests)) {
        const req = t.joinRequests.find(r => r.userId === currentUserId);
        if (req) {
            userStatus = req.status; // 'ACCEPTED' | 'PENDING' | 'REJECTED'
        }
    }

    const acceptedCount = Array.isArray(t.joinRequests)
        ? t.joinRequests.filter(r => r.status === 'ACCEPTED').length
        : (t.rosterCount || 1);

    return {
        id: t.id,
        _id: t.id,
        branchId: t.branchId,
        name: t.teamName,
        teamName: t.teamName,
        sport: t.sport,
        rosterCount: acceptedCount || t.rosterCount || 1,
        captain_name: t.captainName || 'Team Captain',
        captainName: t.captainName || 'Team Captain',
        tournament_title: `${t.sport || 'Sports'} Championship`,
        players: Array(acceptedCount || 1).fill(1),
        rank: t.rank || '#1 Regional',
        wins: t.wins || 0,
        losses: t.losses || 0,
        draws: t.draws || 0,
        userStatus: userStatus, // 'ACCEPTED', 'PENDING', 'REJECTED', or null
        isCaptain: userStatus === 'ACCEPTED' && t.captainName?.includes('(You)'),
        createdAt: t.createdAt
    };
};

/**
 * Public/Discovery listing of teams
 */
const getTeams = async (req, res) => {
    try {
        const { branchId, search } = req.query;
        const currentUserId = req.user?.id || null;

        const where = {};
        if (branchId) where.branchId = branchId;
        if (search) {
            where.teamName = { contains: search };
        }

        const rows = await prisma.clubTeam.findMany({
            where,
            include: {
                joinRequests: currentUserId ? { where: { userId: currentUserId } } : false
            },
            orderBy: { createdAt: 'desc' }
        });

        return res.status(200).json({
            success: true,
            data: rows.map(t => formatTeam(t, currentUserId))
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Fetch authenticated customer's own joined/created teams
 */
const getMyTeams = async (req, res) => {
    try {
        const userId = req.user.id;

        // Fetch team membership requests where status = ACCEPTED
        const memberships = await prisma.teamMembershipRequest.findMany({
            where: { userId, status: 'ACCEPTED' },
            include: {
                team: {
                    include: {
                        joinRequests: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const teams = memberships.map(m => formatTeam(m.team, userId));
        return res.status(200).json({ success: true, data: teams });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Create a new team and automatically make creator an ACCEPTED member & captain
 */
const createTeam = async (req, res) => {
    const { branchId, name, teamName, sport, membersCount, captainName } = req.body;
    const resolvedName = teamName || name;
    if (!resolvedName) {
        return res.status(400).json({ success: false, message: 'Team name is required.' });
    }

    try {
        const creatorId = req.user.id;
        const creatorName = captainName || req.user?.name || 'Team Captain';

        const result = await prisma.$transaction(async (tx) => {
            // 1. Create ClubTeam
            const team = await tx.clubTeam.create({
                data: {
                    id: genId(),
                    branchId: branchId || null,
                    teamName: resolvedName,
                    sport: sport || 'Cricket',
                    rosterCount: Number(membersCount || 1),
                    rank: '#1 Hub'
                }
            });

            // 2. Persist Creator Membership in TeamMembershipRequest with ACCEPTED status
            await tx.teamMembershipRequest.create({
                data: {
                    teamId: team.id,
                    userId: creatorId,
                    status: 'ACCEPTED',
                    requestMessage: 'Team Creator / Captain'
                }
            });

            // 3. Create ClubPlayer entry
            await tx.clubPlayer.create({
                data: {
                    teamId: team.id,
                    playerName: `${creatorName} (C)`,
                    sport: sport || 'Cricket',
                    skillClass: 'Advanced',
                    status: 'Active'
                }
            });

            return team;
        });

        return res.status(201).json({
            success: true,
            message: 'Team created successfully! You are assigned as captain.',
            data: formatTeam(result, creatorId)
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Request to join a team -> Creates PENDING TeamMembershipRequest
 */
const joinTeam = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    try {
        const team = await prisma.clubTeam.findUnique({ where: { id } });
        if (!team) {
            return res.status(404).json({ success: false, message: 'Team not found.' });
        }

        // Check for existing request/membership
        const existingReq = await prisma.teamMembershipRequest.findUnique({
            where: {
                teamId_userId: {
                    teamId: id,
                    userId: userId
                }
            }
        });

        if (existingReq) {
            if (existingReq.status === 'ACCEPTED') {
                return res.status(409).json({ success: false, message: 'You are already a confirmed member of this team.' });
            }
            if (existingReq.status === 'PENDING') {
                return res.status(409).json({ success: false, message: 'Your join request for this team is already pending captain approval.' });
            }
            if (existingReq.status === 'REJECTED') {
                // Reset rejected request back to PENDING for resubmission
                const updated = await prisma.teamMembershipRequest.update({
                    where: { id: existingReq.id },
                    data: { status: 'PENDING', createdAt: new Date() }
                });
                return res.status(200).json({
                    success: true,
                    message: `Join request resubmitted to ${team.teamName}! Waiting for captain approval.`,
                    data: updated
                });
            }
        }

        // Create new TeamMembershipRequest with PENDING status
        const newReq = await prisma.teamMembershipRequest.create({
            data: {
                teamId: id,
                userId: userId,
                status: 'PENDING',
                requestMessage: 'Player requested to join squad'
            }
        });

        return res.status(201).json({
            success: true,
            message: `Join request sent to ${team.teamName}! Waiting for captain sign-off.`,
            data: newReq
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get pending join requests for a team (Captain Auth Required)
 */
const getJoinRequests = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    try {
        // Verify user is an ACCEPTED member/captain of this team
        const captainMembership = await prisma.teamMembershipRequest.findFirst({
            where: { teamId: id, userId: userId, status: 'ACCEPTED' }
        });

        if (!captainMembership) {
            return res.status(403).json({ success: false, message: 'Access denied: Only team captains/accepted members can view join requests.' });
        }

        const requests = await prisma.teamMembershipRequest.findMany({
            where: { teamId: id, status: 'PENDING' },
            include: {
                user: {
                    select: { id: true, name: true, email: true, mobile: true, avatar: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return res.status(200).json({ success: true, data: requests });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Approve join request (Captain Auth Required)
 */
const approveJoinRequest = async (req, res) => {
    const { teamId, requestId } = req.params;
    const userId = req.user.id;

    try {
        // Authorization check: Must be accepted captain/member
        const captainCheck = await prisma.teamMembershipRequest.findFirst({
            where: { teamId: teamId, userId: userId, status: 'ACCEPTED' }
        });

        if (!captainCheck) {
            return res.status(403).json({ success: false, message: 'Forbidden: Only team captains can approve join requests.' });
        }

        const request = await prisma.teamMembershipRequest.findUnique({
            where: { id: requestId },
            include: { user: true, team: true }
        });

        if (!request || request.teamId !== teamId) {
            return res.status(404).json({ success: false, message: 'Join request not found.' });
        }

        if (request.status === 'ACCEPTED') {
            return res.status(400).json({ success: false, message: 'This join request is already approved.' });
        }

        await prisma.$transaction(async (tx) => {
            // 1. Mark request as ACCEPTED
            await tx.teamMembershipRequest.update({
                where: { id: requestId },
                data: { status: 'ACCEPTED' }
            });

            // 2. Add player entry in ClubPlayer table
            await tx.clubPlayer.create({
                data: {
                    teamId: teamId,
                    playerName: request.user.name || 'Player',
                    sport: request.team.sport || 'Cricket',
                    skillClass: 'Advanced',
                    status: 'Active'
                }
            });

            // 3. Update rosterCount in ClubTeam
            const totalAccepted = await tx.teamMembershipRequest.count({
                where: { teamId: teamId, status: 'ACCEPTED' }
            });

            await tx.clubTeam.update({
                where: { id: teamId },
                data: { rosterCount: totalAccepted }
            });
        });

        return res.status(200).json({
            success: true,
            message: `Approved ${request.user.name} into the squad!`
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Reject join request (Captain Auth Required)
 */
const rejectJoinRequest = async (req, res) => {
    const { teamId, requestId } = req.params;
    const userId = req.user.id;

    try {
        const captainCheck = await prisma.teamMembershipRequest.findFirst({
            where: { teamId: teamId, userId: userId, status: 'ACCEPTED' }
        });

        if (!captainCheck) {
            return res.status(403).json({ success: false, message: 'Forbidden: Only team captains can reject join requests.' });
        }

        const request = await prisma.teamMembershipRequest.findUnique({ where: { id: requestId } });
        if (!request || request.teamId !== teamId) {
            return res.status(404).json({ success: false, message: 'Join request not found.' });
        }

        await prisma.teamMembershipRequest.update({
            where: { id: requestId },
            data: { status: 'REJECTED' }
        });

        return res.status(200).json({ success: true, message: 'Join request rejected.' });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getTeams,
    getMyTeams,
    createTeam,
    joinTeam,
    getJoinRequests,
    approveJoinRequest,
    rejectJoinRequest
};
