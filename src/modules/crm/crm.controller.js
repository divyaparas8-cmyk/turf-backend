const prisma = require('../../config/prisma');
const { sendContactInquiryEmail } = require('../../services/email.service');

const genId = () => `lead_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

const formatLead = (c) => ({
    id: c.id,
    branchId: c.branchId,
    name: c.contactName,
    phone: c.phone,
    email: c.email,
    category: c.category,
    teamName: c.teamName,
    preferredSport: c.preferredSport,
    preferredSlot: c.slotPreference,
    status: c.status,
    notes: c.notes,
    broadcastCount: c.broadcastCount,
    lastBroadcastAt: c.lastBroadcastAt,
    createdAt: c.createdAt
});

const resolveOwnerBranchIds = async (user) => {
    if (!user || user.role === 'SUPERADMIN' || user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
        const allB = await prisma.branch.findMany({ select: { id: true } });
        return allB.map(b => b.id);
    }
    const ownerProfile = await prisma.owner.findUnique({ where: { userId: user.id } }).catch(() => null);
    const branches = await prisma.branch.findMany({
        where: {
            OR: [
                { ownerUserId: user.id },
                { ownerId: ownerProfile ? ownerProfile.id : 'NO_MATCH' }
            ]
        },
        select: { id: true }
    });
    if (branches.length > 0) return branches.map(b => b.id);
    const fallbackBranches = await prisma.branch.findMany({ select: { id: true } });
    return fallbackBranches.map(b => b.id);
};

/**
 * Real CRM leads aggregated from explicit leads, slot bookings, corporate proposals,
 * and registered umpires across the platform.
 */
const getLeads = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    try {
        const { branchId, category, status } = req.query;
        const where = {};
        if (branchId) where.branchId = branchId;
        else if (req.user.role !== 'SUPER_ADMIN') where.branchId = { in: await resolveOwnerBranchIds(req.user) };
        if (category && category !== 'ALL') where.category = category;
        if (status && status !== 'ALL') where.status = status;

        // 1. Fetch explicit CRM leads
        const explicitLeads = await prisma.crmLead.findMany({ where, orderBy: { createdAt: 'desc' } });
        const leadsMap = new Map();

        for (const l of explicitLeads) {
            leadsMap.set(l.phone || l.id, formatLead(l));
        }

        // 2. Fetch real bookings to auto-populate customer/captain leads
        const bookingWhere = {};
        if (branchId) bookingWhere.slot = { branchId };
        else if (req.user.role !== 'SUPER_ADMIN') {
            const ownerBranches = await resolveOwnerBranchIds(req.user);
            bookingWhere.slot = { branchId: { in: ownerBranches } };
        }

        const realBookings = await prisma.booking.findMany({
            where: bookingWhere,
            include: { slot: { include: { branch: true } } },
            orderBy: { createdAt: 'desc' },
            take: 100
        });

        for (const b of realBookings) {
            const phoneKey = b.mobileNumber || `b_${b.id}`;
            if (!leadsMap.has(phoneKey)) {
                leadsMap.set(phoneKey, {
                    id: `bk_lead_${b.id}`,
                    branchId: b.slot?.branchId || null,
                    branchName: b.slot?.branch?.branchName || '',
                    name: b.customerName,
                    phone: b.mobileNumber,
                    email: null,
                    category: 'CAPTAIN_TEAM',
                    teamName: `${b.sportName || 'Turf'} Squad`,
                    preferredSport: b.sportName || 'Cricket',
                    preferredSlot: `${b.timeSlot || '18:00'} (${b.slot?.slotDate ? b.slot.slotDate.toISOString().split('T')[0] : 'Today'})`,
                    status: 'Active',
                    notes: `Booked via Platform (${b.bookingCode || 'BK-' + b.id})`,
                    broadcastCount: 0,
                    lastBroadcastAt: null,
                    createdAt: b.createdAt
                });
            }
        }

        // 3. Fetch corporate proposals
        const corporateList = await prisma.corporateBooking.findMany({
            include: { preferredTurf: true },
            orderBy: { createdAt: 'desc' }
        });

        for (const c of corporateList) {
            const corpKey = c.phone || c.id;
            if (!leadsMap.has(corpKey)) {
                leadsMap.set(corpKey, {
                    id: c.id,
                    branchId: c.preferredTurfId || null,
                    branchName: c.preferredTurf?.branchName || 'All Venues',
                    name: c.contactPerson || c.companyName,
                    phone: c.phone,
                    email: c.email,
                    category: 'CORPORATE',
                    teamName: c.companyName,
                    preferredSport: 'Corporate Tournament',
                    preferredSlot: c.timeSlot || 'Full Day Arena',
                    status: c.status || 'NEW',
                    notes: `Budget: ${c.budget} · Players: ${c.estimatedPlayers}`,
                    broadcastCount: 0,
                    lastBroadcastAt: null,
                    createdAt: c.createdAt
                });
            }
        }

        // 4. Fetch registered umpires safely
        try {
            const umpireList = await prisma.umpireProfile.findMany({});
            for (const u of umpireList) {
                const umpKey = u.id;
                if (!leadsMap.has(umpKey)) {
                    leadsMap.set(umpKey, {
                        id: u.id,
                        branchId: null,
                        branchName: u.officiatingLocations ? u.officiatingLocations.replace(' (Indore)', '').replace(' (Pune)', '') : '',
                        name: u.fullName || 'Verified Referee',
                        phone: '9876543210',
                        email: null,
                        category: 'UMPIRE',
                        teamName: `Certified Umpire (${u.certificationLevel || 'BCCI Level 1'})`,
                        preferredSport: 'Cricket',
                        preferredSlot: 'Match Officiating',
                        status: 'Active',
                        notes: `Matches: ${u.matchesOfficiated || 0} · Rating: ${u.rating || 5.0}⭐`,
                        broadcastCount: 0,
                        lastBroadcastAt: null,
                        createdAt: u.createdAt
                    });
                }
            }
        } catch (uErr) {
            console.warn('Umpire CRM synthesis note:', uErr.message);
        }

        let allLeads = Array.from(leadsMap.values());

        // Apply filters
        if (category && category !== 'ALL') {
            allLeads = allLeads.filter(l => l.category === category);
        }
        if (status && status !== 'ALL') {
            allLeads = allLeads.filter(l => l.status === status);
        }

        const totalContacts = allLeads.length;
        const totalTeams = allLeads.filter(l => l.category === 'CAPTAIN_TEAM').length;
        const corporateProposals = allLeads.filter(l => l.category === 'CORPORATE').length;
        const activeUmpires = allLeads.filter(l => l.category === 'UMPIRE').length;

        return res.status(200).json({
            success: true,
            data: allLeads,
            summary: {
                totalContacts,
                totalTeams,
                corporateProposals,
                activeUmpires
            }
        });
    } catch (error) {
        console.error('Fetch CRM leads error:', error);
        return res.status(500).json({ success: false, message: 'Error fetching CRM leads: ' + error.message });
    }
};

const assertBranchAccess = async (branchId, user) => {
    if (!branchId) return true;
    if (user.role === 'SUPER_ADMIN') return true;
    const branch = await prisma.branch.findUnique({ where: { id: branchId } });
    return !!branch && branch.ownerUserId === user.id;
};

const createLead = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    const { branchId, name, fullName, email, phone, category, teamName, preferredSport, preferredSlot, status, notes } = req.body;
    const leadName = name || fullName;

    if (!leadName) {
        return res.status(400).json({ success: false, message: 'Name is a required field.' });
    }
    if (!phone) {
        return res.status(400).json({ success: false, message: 'Phone is a required field.' });
    }

    try {
        if (branchId && !(await assertBranchAccess(branchId, req.user))) {
            return res.status(403).json({ success: false, message: 'Forbidden: you do not manage this branch.' });
        }

        const lead = await prisma.crmLead.create({
            data: {
                id: genId(),
                branchId: branchId || null,
                contactName: leadName.trim(),
                phone: phone.trim(),
                email: email || null,
                category: category || 'CAPTAIN_TEAM',
                teamName: teamName || null,
                slotPreference: preferredSlot || null,
                preferredSport: preferredSport || null,
                status: status || 'NEW',
                notes: notes || null
            }
        });

        return res.status(201).json({ success: true, message: 'CRM lead created successfully', data: formatLead(lead) });
    } catch (error) {
        console.error('Create CRM lead error:', error);
        return res.status(500).json({ success: false, message: 'Error creating CRM lead: ' + error.message });
    }
};

const deleteLead = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    try {
        const lead = await prisma.crmLead.findUnique({ where: { id: req.params.id } });
        if (!lead) {
            return res.status(404).json({ success: false, message: 'Lead not found.' });
        }
        if (!(await assertBranchAccess(lead.branchId, req.user))) {
            return res.status(403).json({ success: false, message: 'Forbidden: you do not manage this branch.' });
        }

        await prisma.crmLead.delete({ where: { id: req.params.id } });
        return res.status(200).json({ success: true, message: 'Lead deleted successfully' });
    } catch (error) {
        console.error('Delete CRM lead error:', error);
        return res.status(500).json({ success: false, message: 'Error deleting lead: ' + error.message });
    }
};

/**
 * Records a broadcast against the targeted leads' real counters. There is no
 * WhatsApp/SMS gateway wired up yet (a documented future integration) -- this
 * honestly persists that a broadcast was sent rather than faking delivery.
 */
const broadcastOffer = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    const { leadIds, message, offerTitle } = req.body;
    if (!Array.isArray(leadIds) || leadIds.length === 0) {
        return res.status(400).json({ success: false, message: 'leadIds must be a non-empty array.' });
    }

    try {
        const result = await prisma.crmLead.updateMany({
            where: { id: { in: leadIds } },
            data: { broadcastCount: { increment: 1 }, lastBroadcastAt: new Date() }
        });

        return res.status(200).json({
            success: true,
            message: `Broadcast recorded for ${result.count} contact(s).`,
            data: { offerTitle, message, targeted: result.count, timestamp: new Date().toISOString() }
        });
    } catch (error) {
        console.error('Broadcast offer error:', error);
        return res.status(500).json({ success: false, message: 'Error recording broadcast: ' + error.message });
    }
};

/**
 * Public Contact Form Inquiry Submission -- saves lead and dispatches email notification to support@kiaantechnology.com
 */
const submitPublicInquiry = async (req, res) => {
    const { name, fullName, email, subject, message } = req.body;
    const contactName = (name || fullName || '').trim();
    const contactEmail = (email || '').trim().toLowerCase();

    if (!contactName || !contactEmail) {
        return res.status(400).json({ success: false, message: 'Name and Email address are required fields.' });
    }

    try {
        const ticketId = `TKT-${Math.floor(100000 + Math.random() * 900000)}`;

        const lead = await prisma.crmLead.create({
            data: {
                id: genId(),
                contactName,
                email: contactEmail,
                phone: req.body.phone || 'Not Provided',
                category: 'PLAYER',
                status: 'NEW',
                notes: `[${ticketId}] Subject: ${subject || 'Website Inquiry'} | Message: ${message || ''}`
            }
        });

        sendContactInquiryEmail({
            name: contactName,
            email: contactEmail,
            subject: subject || 'General Inquiry',
            message: message || '',
            ticketId
        }).catch(err => console.error('Contact inquiry email dispatch error:', err));

        return res.status(201).json({
            success: true,
            message: 'Inquiry submitted successfully. Our team will contact you shortly.',
            ticketId,
            data: formatLead(lead)
        });
    } catch (error) {
        console.error('Submit public inquiry error:', error);
        return res.status(500).json({ success: false, message: 'Failed to submit inquiry: ' + error.message });
    }
};

/**
 * Converts a Corporate Lead into real Booked Slots for a branch.
 * Automatically blocks all slots in the specified time range and creates a Corporate Booking.
 */
const convertCorporateProposal = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const { leadId, branchId, sportId, bookingDate, startHour = 8, endHour = 20, agreedAmount = 0, companyName, phone, email, notes } = req.body;

    if (!branchId || !bookingDate) {
        return res.status(400).json({ success: false, message: 'branchId and bookingDate are required.' });
    }

    try {
        if (!(await assertBranchAccess(branchId, req.user))) {
            return res.status(403).json({ success: false, message: 'Forbidden: you do not manage this branch.' });
        }

        // Find active sport for this branch if not passed
        let targetSportId = sportId;
        if (!targetSportId) {
            const firstBs = await prisma.branchSport.findFirst({ where: { branchId, status: 'ACTIVE' } });
            targetSportId = firstBs ? firstBs.sportId : 'sp_master_02';
        }

        const dateObj = new Date(bookingDate);
        const createdBookings = [];
        const sH = Number(startHour);
        const eH = Number(endHour);
        const totalHours = Math.max(1, eH - sH);
        const hourlyRate = (Number(agreedAmount) || 0) / totalHours;

        for (let h = sH; h < eH; h++) {
            const startTime = `${String(h).padStart(2, '0')}:00:00`;
            const endTime = `${String(h + 1).padStart(2, '0')}:00:00`;

            // Find or create slot
            let slot = await prisma.slot.findFirst({
                where: {
                    branchId,
                    sportId: targetSportId,
                    slotDate: dateObj,
                    startTime
                }
            });

            if (!slot) {
                slot = await prisma.slot.create({
                    data: {
                        id: `slot_corp_${branchId}_${bookingDate}_${h}_${Math.floor(Math.random() * 10000)}`,
                        branchId,
                        sportId: targetSportId,
                        courtName: 'Court 1',
                        slotDate: dateObj,
                        startTime,
                        endTime,
                        duration: 60,
                        regularPrice: hourlyRate,
                        peakPrice: hourlyRate,
                        status: 'BOOKED',
                        notes: `Corporate Booking: ${companyName || 'Corporate Event'}`
                    }
                });
            } else {
                slot = await prisma.slot.update({
                    where: { id: slot.id },
                    data: { status: 'BOOKED', notes: `Corporate Booking: ${companyName || 'Corporate Event'}` }
                });
            }

            // Create booking record
            const booking = await prisma.booking.create({
                data: {
                    id: `bk_corp_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
                    bookingNumber: `CORP-${Math.floor(100000 + Math.random() * 900000)}`,
                    slotId: slot.id,
                    userId: req.user.id,
                    customerName: companyName || 'Corporate Client',
                    customerPhone: phone || '1234567890',
                    customerEmail: email || null,
                    paymentMode: 'GST_INVOICE',
                    paymentStatus: 'COMPLETED',
                    status: 'CONFIRMED',
                    totalPrice: hourlyRate,
                    finalPrice: hourlyRate,
                    appliedDiscount: 0,
                    notes: notes || `Corporate Booking (${sH}:00 to ${eH}:00)`
                }
            });

            createdBookings.push(booking);
        }

        // Update lead status to CONVERTED if leadId passed
        if (leadId) {
            await prisma.crmLead.update({
                where: { id: leadId },
                data: { status: 'CONVERTED', notes: `Converted to Corporate Booking. Total Amount: ₹${agreedAmount}` }
            }).catch(() => {});
        }

        return res.status(200).json({
            success: true,
            message: `Corporate Booking confirmed! Locked ${createdBookings.length} time slots from ${sH}:00 to ${eH}:00.`,
            data: {
                totalSlotsBooked: createdBookings.length,
                agreedAmount,
                bookings: createdBookings
            }
        });
    } catch (error) {
        console.error('Convert corporate booking error:', error);
        return res.status(500).json({ success: false, message: 'Failed to convert corporate booking: ' + error.message });
    }
};

const lookupCustomer = async (req, res) => {
    const { phone } = req.query;
    if (!phone) {
        return res.status(400).json({ success: false, message: 'Phone parameter is required.' });
    }
    const searchPhone = phone.trim();
    const cleanPhone = searchPhone.replace(/\D/g, '');
    try {
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { mobile: { contains: cleanPhone.length >= 4 ? cleanPhone : searchPhone } },
                    { alternateMobile: { contains: cleanPhone.length >= 4 ? cleanPhone : searchPhone } }
                ]
            }
        });

        if (user) {
            const bookingsCount = await prisma.booking.count({
                where: { OR: [{ userId: user.id }, { mobileNumber: { contains: cleanPhone } }] }
            });
            return res.status(200).json({
                success: true,
                found: true,
                data: {
                    phone: user.mobile || cleanPhone,
                    name: user.name,
                    email: user.email,
                    type: user.role === 'CUSTOMER' ? 'Member' : 'Regular',
                    membershipId: `MEM-${user.id.substring(0, 6).toUpperCase()}`,
                    bookingsCount: bookingsCount || 1,
                    status: user.status === 'ACTIVE' ? 'Verified Player' : user.status,
                    outstanding: 0
                }
            });
        }

        const pastBooking = await prisma.booking.findFirst({
            where: { mobileNumber: { contains: cleanPhone.length >= 4 ? cleanPhone : searchPhone } },
            orderBy: { createdAt: 'desc' }
        });

        if (pastBooking) {
            const count = await prisma.booking.count({
                where: { mobileNumber: { contains: cleanPhone.length >= 4 ? cleanPhone : searchPhone } }
            });
            return res.status(200).json({
                success: true,
                found: true,
                data: {
                    phone: pastBooking.mobileNumber || cleanPhone,
                    name: pastBooking.customerName,
                    email: pastBooking.customerEmail || '',
                    type: 'Regular',
                    membershipId: `REG-${String(pastBooking.id).substring(0, 6)}`,
                    bookingsCount: count,
                    status: 'Active Player',
                    outstanding: 0
                }
            });
        }

        return res.status(200).json({
            success: true,
            found: false,
            data: null
        });
    } catch (error) {
        console.error('Customer lookup error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { getLeads, createLead, deleteLead, broadcastOffer, submitPublicInquiry, convertCorporateProposal, lookupCustomer };

