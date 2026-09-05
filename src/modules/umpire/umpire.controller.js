const prisma = require('../../config/prisma');
const { getIo, emitToBranch } = require('../../realtime/socket');

const genId = (prefix) => `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

const formatProfile = (p) => ({
    id: p.id, _id: p.id, userId: p.userId,
    full_name: p.fullName, license_no: p.licenseNumber,
    certification_level: p.certificationLevel, officiating_grounds: p.officiatingLocations,
    upi_id: p.upiId, qr_image: p.qrImageUrl, match_fee: Number(p.dutyFeePerMatch),
    on_duty_status: p.isOnDuty, rating: Number(p.rating),
    total_matches_officiated: p.totalMatchesOfficiated
});

const formatDuty = (d) => {
    const teamAObj = d.match?.matchTeams?.find(t => t.teamSide === 'TEAM_A');
    const teamBObj = d.match?.matchTeams?.find(t => t.teamSide === 'TEAM_B');

    let totalOvers = 6;
    if (d.ballByBallFeed) {
        try {
            const parsed = typeof d.ballByBallFeed === 'string' ? JSON.parse(d.ballByBallFeed) : d.ballByBallFeed;
            if (parsed?.engine?.config?.totalOvers) {
                totalOvers = Number(parsed.engine.config.totalOvers);
            }
        } catch (e) {}
    }

    return {
        id: d.id, matchId: d.matchId, branchId: d.branchId,
        dutyFee: Number(d.dutyFee), feePaymentStatus: d.feePaymentStatus,
        tossWinnerTeam: d.tossWinnerTeam, tossElected: d.tossElected,
        ballByBallFeed: d.ballByBallFeed, currentScoreSummary: d.currentScoreSummary,
        dutyStatus: d.dutyStatus, certifiedAt: d.certifiedAt,
        createdAt: d.createdAt || d.match?.createdAt,
        matchCreatedAt: d.match?.createdAt || d.createdAt,
        totalOvers: totalOvers,
        topBatsmanName: d.topBatsmanName, topBatsmanRuns: d.topBatsmanRuns,
        topBowlerName: d.topBowlerName, topBowlerWickets: d.topBowlerWickets,
        match: d.match ? {
            id: d.match.id,
            teamAName: d.match.teamAName,
            teamBName: d.match.teamBName,
            matchStatus: d.match.matchStatus,
            turfName: d.match.branch?.branchName || 'Spike Cricket Turf',
            turfLocation: d.match.branch?.city || d.match.branch?.area || 'Indore',
            teamA: {
                name: d.match.teamAName,
                captain: teamAObj?.captainName || 'Captain A',
                phone: teamAObj?.captainPhone || ''
            },
            teamB: {
                name: d.match.teamBName,
                captain: teamBObj?.captainName || 'Captain B',
                phone: teamBObj?.captainPhone || ''
            }
        } : null
    };
};

/** Get (or create-on-first-access) the requesting user's real umpire profile. */
const getUmpireProfile = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    try {
        let profile = await prisma.umpireProfile.findUnique({ where: { userId: req.user.id } });
        if (!profile) {
            profile = await prisma.umpireProfile.create({
                data: {
                    id: genId('ump'),
                    userId: req.user.id,
                    licenseNumber: `UMP-${req.user.id.slice(-8).toUpperCase()}`,
                    fullName: req.user.name || 'Umpire',
                    totalMatchesOfficiated: 0,
                    totalCertifiedScorecards: 0
                }
            });
        }
        return res.status(200).json({ success: true, data: formatProfile(profile) });
    } catch (error) {
        console.error('Error fetching umpire profile:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

const updateUmpireProfile = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    try {
        const { full_name, upi_id, custom_qr_image, on_duty_status } = req.body;
        const profile = await prisma.umpireProfile.update({
            where: { userId: req.user.id },
            data: {
                fullName: full_name ?? undefined,
                upiId: upi_id ?? undefined,
                qrImageUrl: custom_qr_image ?? undefined,
                isOnDuty: on_duty_status ?? undefined
            }
        }).catch(() => null);

        if (!profile) {
            return res.status(404).json({ success: false, message: 'Umpire profile not found. Call GET /umpire/profile first to create it.' });
        }
        return res.status(200).json({ success: true, message: 'Umpire profile updated successfully', data: formatProfile(profile) });
    } catch (error) {
        console.error('Error updating umpire profile:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

const getUmpireMatches = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    try {
        let profile = await prisma.umpireProfile.findUnique({ where: { userId: req.user.id } });
        if (!profile) {
            profile = await prisma.umpireProfile.create({
                data: {
                    id: genId('ump'),
                    userId: req.user.id,
                    licenseNumber: `UMP-${req.user.id.slice(-8).toUpperCase()}`,
                    fullName: req.user.name || 'Umpire'
                }
            });
        }
        let duties = await prisma.umpireDutyAssignment.findMany({
            where: { umpireProfileId: profile.id },
            include: { match: { include: { branch: true, sport: true, matchTeams: true } } },
            orderBy: { createdAt: 'desc' }
        });

        // Fallback: If no duties linked directly to profile, return active ground duties
        if (duties.length === 0) {
            duties = await prisma.umpireDutyAssignment.findMany({
                where: {
                    dutyStatus: { not: 'CERTIFIED_COMPLETED' }
                },
                include: { match: { include: { branch: true, sport: true, matchTeams: true } } },
                orderBy: { createdAt: 'desc' },
                take: 10
            });
        }

        return res.status(200).json({ success: true, data: duties.map(formatDuty) });
    } catch (error) {
        console.error('Error fetching umpire matches:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

const findMyDuty = async (req, matchId) => {
    if (!req.user) return null;
    let profile = await prisma.umpireProfile.findUnique({ where: { userId: req.user.id } });
    if (!profile) {
        profile = await prisma.umpireProfile.findFirst();
    }
    if (!profile) return null;

    return prisma.umpireDutyAssignment.findFirst({
        where: {
            OR: [
                { matchId: matchId },
                { id: matchId }
            ]
        }
    });
};

/** Register existing match OR create new walk-in ground match with branch tenant validation. */
const registerGroundMatch = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    try {
        const { matchId, isNew, teamAName, teamACaptain, teamAPhone, teamBName, teamBCaptain, teamBPhone, totalOvers, branchId: reqBranchId } = req.body;
        const umpireBranchId = req.user.staffBranchId;

        let profile = await prisma.umpireProfile.findUnique({ where: { userId: req.user.id } });
        if (!profile) {
            profile = await prisma.umpireProfile.create({
                data: { id: genId('ump'), userId: req.user.id, licenseNumber: `UMP-${req.user.id.slice(-8).toUpperCase()}`, fullName: req.user.name || 'Umpire' }
            });
        }

        // Scenario A: Self-assigning to existing match
        if (matchId && !isNew) {
            const match = await prisma.match.findUnique({ where: { id: matchId } });
            if (!match) {
                return res.status(404).json({ success: false, message: 'Match not found.' });
            }
            if (match.hasUmpireAssigned) {
                return res.status(409).json({ success: false, message: 'This match already has an umpire assigned.' });
            }
            // Branch Authorization check
            if (req.user.role !== 'SUPER_ADMIN' && match.branchId && umpireBranchId && match.branchId !== umpireBranchId) {
                return res.status(403).json({ success: false, message: 'Umpire is not authorized for this branch.' });
            }

            const duty = await prisma.$transaction(async (tx) => {
                const created = await tx.umpireDutyAssignment.create({
                    data: {
                        id: genId('duty'),
                        matchId: match.id,
                        branchId: match.branchId || umpireBranchId || 'br_001',
                        umpireProfileId: profile.id,
                        dutyFee: profile.dutyFeePerMatch,
                        dutyStatus: 'SCHEDULED',
                        ballByBallFeed: JSON.stringify({
                            version: 1,
                            engine: { config: { totalOvers: Number(totalOvers || 6), ballsPerOver: 6, maxWickets: 10 } },
                            deliveries: []
                        })
                    }
                });
                await tx.match.update({ where: { id: match.id }, data: { hasUmpireAssigned: true, umpireAddonFee: profile.dutyFeePerMatch } });
                return created;
            });

            const fullDuty = await prisma.umpireDutyAssignment.findUnique({
                where: { id: duty.id },
                include: { match: { include: { branch: true, matchTeams: true } } }
            });
            return res.status(201).json({ success: true, message: 'Assigned to match successfully', data: formatDuty(fullDuty) });
        }

        // Scenario B: Creating a NEW Walk-In Ground Match atomically in $transaction
        let targetBranch = null;
        if (reqBranchId) targetBranch = await prisma.branch.findUnique({ where: { id: reqBranchId } });
        if (!targetBranch && umpireBranchId) targetBranch = await prisma.branch.findUnique({ where: { id: umpireBranchId } });
        if (!targetBranch) targetBranch = await prisma.branch.findFirst({ where: { status: 'ACTIVE' } }) || await prisma.branch.findFirst();
        
        if (!targetBranch) {
            return res.status(400).json({ success: false, message: 'No active turf branch available to assign ground match.' });
        }
        const targetBranchId = targetBranch.id;

        const createdDuty = await prisma.$transaction(async (tx) => {
            const newMatchId = genId('mtc');
            await tx.match.create({
                data: {
                    id: newMatchId,
                    branchId: targetBranchId,
                    captainAId: null,
                    captainBId: null,
                    teamAName: teamAName || 'Team A',
                    teamBName: teamBName || 'Team B',
                    matchStatus: 'IN_PROGRESS',
                    hasUmpireAssigned: true,
                    umpireAddonFee: profile.dutyFeePerMatch,
                    totalAmount: 0.00
                }
            });

            await tx.matchTeam.create({
                data: {
                    id: genId('tm'),
                    matchId: newMatchId,
                    teamSide: 'TEAM_A',
                    teamName: teamAName || 'Team A',
                    captainName: teamACaptain || null,
                    captainPhone: teamAPhone || null
                }
            });

            await tx.matchTeam.create({
                data: {
                    id: genId('tm'),
                    matchId: newMatchId,
                    teamSide: 'TEAM_B',
                    teamName: teamBName || 'Team B',
                    captainName: teamBCaptain || null,
                    captainPhone: teamBPhone || null
                }
            });

            return tx.umpireDutyAssignment.create({
                data: {
                    id: genId('duty'),
                    matchId: newMatchId,
                    branchId: targetBranchId,
                    umpireProfileId: profile.id,
                    dutyFee: profile.dutyFeePerMatch,
                    dutyStatus: 'LIVE_NOW',
                    ballByBallFeed: JSON.stringify({
                        version: 1,
                        engine: { config: { totalOvers: Number(totalOvers || 6), ballsPerOver: 6, maxWickets: 10 } },
                        deliveries: []
                    })
                }
            });
        });

        const fullDuty = await prisma.umpireDutyAssignment.findUnique({
            where: { id: createdDuty.id },
            include: { match: { include: { branch: true, matchTeams: true } } }
        });

        try {
            const io = getIo();
            if (io) {
                io.emit('umpire:duty-assigned', { matchId: createdDuty.matchId, branchId: targetBranchId });
                if (targetBranchId) emitToBranch(targetBranchId, 'umpire:duty-assigned', { matchId: createdDuty.matchId });
            }
        } catch (sErr) {}

        return res.status(201).json({ success: true, message: 'New Ground Match registered successfully', data: formatDuty(fullDuty) });
    } catch (error) {
        console.error('Error registering ground match:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

const recordToss = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    try {
        const { matchId, tossWinner, tossDecision } = req.body;
        if (!matchId || !tossWinner || !tossDecision) {
            return res.status(400).json({ success: false, message: 'matchId, tossWinner and tossDecision are required' });
        }

        const duty = await findMyDuty(req, matchId);
        if (!duty) {
            return res.status(404).json({ success: false, message: 'You are not assigned to this match.' });
        }

        await prisma.umpireDutyAssignment.update({ where: { id: duty.id }, data: { tossWinnerTeam: tossWinner, tossElected: tossDecision, dutyStatus: 'LIVE_NOW' } });
        
        try {
            const io = getIo();
            if (io) {
                io.emit('umpire:toss-recorded', { matchId, tossWinner, tossDecision });
                if (duty.branchId) emitToBranch(duty.branchId, 'umpire:toss-recorded', { matchId, tossWinner, tossDecision });
            }
        } catch (sErr) {}

        return res.status(200).json({ success: true, message: 'Toss recorded successfully' });
    } catch (error) {
        console.error('Error recording toss:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

const updateMatchScore = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    try {
        const { matchId, currentScoreSummary, ballByBallFeed, topBatsmanName, topBatsmanRuns, topBowlerName, topBowlerWickets, teamAName, teamACaptain, teamAPhone, teamBName, teamBCaptain, teamBPhone } = req.body;
        if (!matchId) {
            return res.status(400).json({ success: false, message: 'matchId is required' });
        }

        const duty = await findMyDuty(req, matchId);
        if (!duty) {
            return res.status(404).json({ success: false, message: 'You are not assigned to this match.' });
        }

        if (duty.dutyStatus === 'CERTIFIED_COMPLETED') {
            return res.status(403).json({ success: false, message: 'Cannot edit a certified match.' });
        }

        await prisma.$transaction(async (tx) => {
            await tx.umpireDutyAssignment.update({
                where: { id: duty.id },
                data: {
                    currentScoreSummary: currentScoreSummary ?? undefined,
                    ballByBallFeed: ballByBallFeed ?? undefined,
                    topBatsmanName: topBatsmanName ?? undefined,
                    topBatsmanRuns: topBatsmanRuns ?? undefined,
                    topBowlerName: topBowlerName ?? undefined,
                    topBowlerWickets: topBowlerWickets ?? undefined
                }
            });

            // Update Match team names if provided
            if (teamAName || teamBName) {
                await tx.match.update({
                    where: { id: matchId },
                    data: {
                        teamAName: teamAName ?? undefined,
                        teamBName: teamBName ?? undefined
                    }
                });
            }

            // Upsert MatchTeam records for Team A & Team B captain details
            if (teamAName || teamACaptain || teamAPhone) {
                const teamA = await tx.matchTeam.findFirst({ where: { matchId, teamSide: 'TEAM_A' } });
                if (teamA) {
                    await tx.matchTeam.update({
                        where: { id: teamA.id },
                        data: {
                            teamName: teamAName || teamA.teamName,
                            captainName: teamACaptain ?? undefined,
                            captainPhone: teamAPhone ?? undefined
                        }
                    });
                } else {
                    await tx.matchTeam.create({
                        data: {
                            id: genId('tm'),
                            matchId,
                            teamSide: 'TEAM_A',
                            teamName: teamAName || 'Team A',
                            captainName: teamACaptain || null,
                            captainPhone: teamAPhone || null
                        }
                    });
                }
            }

            if (teamBName || teamBCaptain || teamBPhone) {
                const teamB = await tx.matchTeam.findFirst({ where: { matchId, teamSide: 'TEAM_B' } });
                if (teamB) {
                    await tx.matchTeam.update({
                        where: { id: teamB.id },
                        data: {
                            teamName: teamBName || teamB.teamName,
                            captainName: teamBCaptain ?? undefined,
                            captainPhone: teamBPhone ?? undefined
                        }
                    });
                } else {
                    await tx.matchTeam.create({
                        data: {
                            id: genId('tm'),
                            matchId,
                            teamSide: 'TEAM_B',
                            teamName: teamBName || 'Team B',
                            captainName: teamBCaptain || null,
                            captainPhone: teamBPhone || null
                        }
                    });
                }
            }
        });

        // E2E Realtime socket broadcast for live score update
        try {
            const io = getIo();
            if (io) {
                const scorePayload = { matchId, currentScoreSummary, ballByBallFeed, topBatsmanName, topBatsmanRuns, topBowlerName, topBowlerWickets };
                io.emit('live:score-update', scorePayload);
                if (duty.branchId) emitToBranch(duty.branchId, 'live:score-update', scorePayload);
            }
        } catch (sockErr) {
            console.warn('Socket score update broadcast note:', sockErr.message);
        }

        return res.status(200).json({ success: true, message: 'Match score and captain details updated successfully' });
    } catch (error) {
        console.error('Error updating match score:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

const completeMatch = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    try {
        const { matchId, winnerTeamSide } = req.body;
        if (!matchId) {
            return res.status(400).json({ success: false, message: 'matchId is required' });
        }

        let duty = await findMyDuty(req, matchId);
        
        if (duty) {
            await prisma.$transaction(async (tx) => {
                await tx.umpireDutyAssignment.update({
                    where: { id: duty.id },
                    data: { dutyStatus: 'CERTIFIED_COMPLETED', certifiedAt: new Date() }
                });
                if (duty.matchId) {
                    await tx.match.update({
                        where: { id: duty.matchId },
                        data: { matchStatus: 'COMPLETED', winnerTeamSide: winnerTeamSide ?? undefined }
                    });
                }
                if (duty.umpireProfileId) {
                    await tx.umpireProfile.update({
                        where: { id: duty.umpireProfileId },
                        data: { totalMatchesOfficiated: { increment: 1 } }
                    }).catch(e => console.warn('Umpire profile count increment note:', e.message));
                }
            });
        } else {
            const directMatch = await prisma.match.findUnique({ where: { id: matchId } });
            if (directMatch) {
                await prisma.$transaction(async (tx) => {
                    await tx.match.update({
                        where: { id: matchId },
                        data: { matchStatus: 'COMPLETED', winnerTeamSide: winnerTeamSide ?? undefined }
                    });
                    await tx.umpireDutyAssignment.updateMany({
                        where: { matchId: matchId },
                        data: { dutyStatus: 'CERTIFIED_COMPLETED', certifiedAt: new Date() }
                    });
                });
            }
        }

        try {
            const io = getIo();
            if (io) {
                io.emit('live:match-completed', { matchId, winnerTeamSide });
                if (duty?.branchId) emitToBranch(duty.branchId, 'live:match-completed', { matchId, winnerTeamSide });
            }
        } catch (sErr) {}

        return res.status(200).json({ success: true, message: 'Match completed and certified successfully' });
    } catch (error) {
        console.error('Error completing match:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

const updatePaymentStatus = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    try {
        const { matchId, paymentStatus } = req.body;
        if (!matchId) {
            return res.status(400).json({ success: false, message: 'matchId is required' });
        }

        const duty = await findMyDuty(req, matchId);
        if (duty) {
            await prisma.umpireDutyAssignment.update({
                where: { id: duty.id },
                data: { feePaymentStatus: (paymentStatus === 'RECEIVED' || paymentStatus === 'Payment Received') ? 'RECEIVED' : 'PENDING' }
            }).catch(() => null);
        }

        try {
            const io = getIo();
            if (io) {
                io.emit('umpire:payment-updated', { matchId, paymentStatus });
                if (duty?.branchId) emitToBranch(duty.branchId, 'umpire:payment-updated', { matchId, paymentStatus });
            }
        } catch (sErr) {}

        return res.status(200).json({ success: true, message: 'Payment status updated successfully' });
    } catch (error) {
        console.error('Error updating payment status:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getUmpireProfile, updateUmpireProfile, getUmpireMatches,
    updateMatchScore, recordToss, completeMatch, updatePaymentStatus, registerGroundMatch
};
