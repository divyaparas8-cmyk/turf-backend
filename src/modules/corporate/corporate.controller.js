const prisma = require('../../config/prisma');

const genId = () => `CORP-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
const VALID_STATUSES = ['NEW', 'CONTACTED', 'PROPOSAL_SENT', 'NEGOTIATING', 'CONFIRMED', 'REJECTED', 'COMPLETED'];

exports.createCorporateProposal = async (req, res) => {
    try {
        const { companyName, contactPerson, phone, email, eventType, city, estimatedPlayers, budget, eventDate, timeSlot, notes } = req.body;

        if (!companyName || !companyName.trim()) {
            return res.status(400).json({ success: false, message: 'Company / Organization Name is required.' });
        }
        if (!phone || !phone.trim()) {
            return res.status(400).json({ success: false, message: 'Mobile Number is required.' });
        }

        const proposal = await prisma.corporateBooking.create({
            data: {
                id: genId(),
                companyName: companyName.trim(),
                contactPerson: contactPerson ? contactPerson.trim() : null,
                phone: phone.trim(),
                email: email ? email.trim() : null,
                eventType: eventType || undefined,
                city: city || undefined,
                estimatedPlayers: estimatedPlayers || undefined,
                budget: budget || undefined,
                eventDate: eventDate ? new Date(eventDate) : null,
                timeSlot: timeSlot || undefined,
                status: 'NEW',
                notes: notes ? notes.trim() : null
            }
        });

        return res.status(201).json({
            success: true,
            message: 'Corporate proposal request submitted successfully! An Event Manager will reach out shortly.',
            data: proposal
        });
    } catch (error) {
        console.error('Error creating corporate proposal:', error);
        return res.status(500).json({ success: false, message: 'Failed to submit corporate proposal. Please try again.', error: error.message });
    }
};

exports.getAllCorporateProposals = async (req, res) => {
    try {
        const { status, city, search } = req.query;
        const where = {};
        if (status && status !== 'ALL') where.status = status;
        if (city && city !== 'ALL') where.city = city;
        if (search) {
            where.OR = [
                { companyName: { contains: search } },
                { contactPerson: { contains: search } },
                { phone: { contains: search } },
                { email: { contains: search } }
            ];
        }

        const proposals = await prisma.corporateBooking.findMany({ where, orderBy: { createdAt: 'desc' } });
        return res.status(200).json({ success: true, count: proposals.length, data: proposals });
    } catch (error) {
        console.error('Error fetching corporate proposals:', error);
        return res.status(500).json({ success: false, message: 'Failed to retrieve corporate proposals.', error: error.message });
    }
};

exports.getCorporateProposalById = async (req, res) => {
    try {
        const proposal = await prisma.corporateBooking.findUnique({ where: { id: req.params.id } });
        if (!proposal) {
            return res.status(404).json({ success: false, message: `Corporate proposal with ID "${req.params.id}" not found.` });
        }
        return res.status(200).json({ success: true, data: proposal });
    } catch (error) {
        console.error('Error fetching corporate proposal by ID:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch corporate proposal details.', error: error.message });
    }
};

exports.updateProposalStatus = async (req, res) => {
    try {
        const { status, notes } = req.body;
        if (status && !VALID_STATUSES.includes(status)) {
            return res.status(400).json({ success: false, message: `Invalid status. Allowed values: ${VALID_STATUSES.join(', ')}` });
        }

        const updated = await prisma.corporateBooking.update({
            where: { id: req.params.id },
            data: { status: status ?? undefined, notes: notes !== undefined ? notes : undefined }
        }).catch(() => null);

        if (!updated) {
            return res.status(404).json({ success: false, message: `Corporate proposal with ID "${req.params.id}" not found.` });
        }

        return res.status(200).json({ success: true, message: 'Corporate proposal status updated successfully.', data: updated });
    } catch (error) {
        console.error('Error updating corporate proposal status:', error);
        return res.status(500).json({ success: false, message: 'Failed to update proposal status.', error: error.message });
    }
};

/** Submits an official admin price quote, stored in the real quoteData JSON field (not string-mangled into notes). */
exports.updateCorporateQuote = async (req, res) => {
    try {
        const { quotedPrice, discountAmount, gstAmount, finalTotal, depositRequired, addons, adminNotes, status = 'PROPOSAL_SENT' } = req.body;

        if (!VALID_STATUSES.includes(status)) {
            return res.status(400).json({ success: false, message: `Invalid status. Allowed values: ${VALID_STATUSES.join(', ')}` });
        }

        const updated = await prisma.corporateBooking.update({
            where: { id: req.params.id },
            data: {
                status,
                quotedPrice: finalTotal || quotedPrice,
                quoteData: { quotedPrice, discountAmount, gstAmount, finalTotal, depositRequired, addons, adminNotes }
            }
        }).catch(() => null);

        if (!updated) {
            return res.status(404).json({ success: false, message: `Corporate proposal with ID "${req.params.id}" not found.` });
        }

        return res.status(200).json({ success: true, message: 'Official corporate quotation dispatched and saved successfully.', data: updated });
    } catch (error) {
        console.error('Error updating corporate quote:', error);
        return res.status(500).json({ success: false, message: 'Failed to update corporate quote.', error: error.message });
    }
};

exports.deleteCorporateProposal = async (req, res) => {
    try {
        await prisma.corporateBooking.delete({ where: { id: req.params.id } });
        return res.status(200).json({ success: true, message: 'Corporate proposal deleted successfully.' });
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ success: false, message: `Corporate proposal with ID "${req.params.id}" not found.` });
        }
        console.error('Error deleting corporate proposal:', error);
        return res.status(500).json({ success: false, message: 'Failed to delete corporate proposal.', error: error.message });
    }
};
