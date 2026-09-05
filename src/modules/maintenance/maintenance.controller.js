const prisma = require('../../config/prisma');
const { emitToBranch } = require('../../realtime/socket');

const genId = () => `mt_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

const formatTask = (t) => ({
    id: t.id,
    _id: t.id,
    branchId: t.branchId,
    branchName: t.branch?.branchName || t.branch?.name || '',
    issueDescription: t.issueDescription,
    task: t.issueDescription,
    turfArea: t.turfArea,
    area: t.turfArea,
    assignedSpecialist: t.assignedSpecialist,
    assignedTo: t.assignedSpecialist,
    priority: t.priorityLevel,
    priorityLevel: t.priorityLevel,
    targetDeadline: t.targetDeadline,
    due: t.targetDeadline,
    status: t.status,
    notes: t.notes,
    createdAt: t.createdAt
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

const getTickets = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    try {
        const { branchId } = req.query;
        const where = {};
        if (branchId) where.branchId = branchId;
        else if (req.user.role === 'STAFF') {
            const staffUser = await prisma.user.findUnique({ where: { id: req.user.id } });
            const targetBranchId = staffUser?.staffBranchId || req.user.staffBranchId || req.user.branchId;
            if (targetBranchId) {
                where.branchId = targetBranchId;
            }
        }
        else if (req.user.role !== 'SUPER_ADMIN') where.branchId = { in: await resolveOwnerBranchIds(req.user) };

        const rows = await prisma.maintenanceTask.findMany({
            where,
            include: { branch: { select: { id: true, branchName: true, city: true } } },
            orderBy: { createdAt: 'desc' }
        });
        return res.status(200).json({ success: true, data: rows.map(formatTask) });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const assertBranchAccess = async (branchId, user) => {
    if (user.role === 'SUPER_ADMIN' || user.role === 'STAFF') return true;
    const branch = await prisma.branch.findUnique({ where: { id: branchId } });
    return !!branch && branch.ownerUserId === user.id;
};

const createTicket = async (req, res) => {
    const { branchId, issueDescription, turfArea, priority, assignedTo, targetDeadline } = req.body;
    if (!branchId || !issueDescription) {
        return res.status(400).json({ success: false, message: 'branchId and issueDescription are required fields.' });
    }

    try {
        if (!(await assertBranchAccess(branchId, req.user))) {
            return res.status(403).json({ success: false, message: 'Forbidden: you do not manage this branch.' });
        }

        const task = await prisma.maintenanceTask.create({
            data: {
                id: genId(), branchId, issueDescription,
                turfArea: turfArea || undefined,
                priorityLevel: priority || 'MEDIUM',
                assignedSpecialist: assignedTo || undefined,
                targetDeadline: targetDeadline ? new Date(targetDeadline) : null
            }
        });

        emitToBranch(branchId, 'maintenance:updated', { taskId: task.id });
        return res.status(201).json({ success: true, data: formatTask(task) });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/** Updates status and/or any other ticket field (e.g. reassigning assignedSpecialist), not just status. */
const updateTicketStatus = async (req, res) => {
    const { id } = req.params;
    const { status, assignedTo, priority, turfArea, issueDescription, targetDeadline, notes } = req.body;

    try {
        const existing = await prisma.maintenanceTask.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Ticket not found.' });
        }
        if (!(await assertBranchAccess(existing.branchId, req.user))) {
            return res.status(403).json({ success: false, message: 'Forbidden: you do not manage this branch.' });
        }

        const updated = await prisma.maintenanceTask.update({
            where: { id },
            data: {
                status: status ?? undefined,
                assignedSpecialist: assignedTo ?? undefined,
                priorityLevel: priority ?? undefined,
                turfArea: turfArea ?? undefined,
                issueDescription: issueDescription ?? undefined,
                targetDeadline: targetDeadline ? new Date(targetDeadline) : undefined,
                notes: notes ?? undefined
            }
        });
        emitToBranch(updated.branchId, 'maintenance:updated', { taskId: updated.id });
        return res.status(200).json({ success: true, message: 'Ticket updated', data: formatTask(updated) });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const deleteTicket = async (req, res) => {
    const { id } = req.params;
    try {
        const existing = await prisma.maintenanceTask.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Ticket not found.' });
        }
        if (!(await assertBranchAccess(existing.branchId, req.user))) {
            return res.status(403).json({ success: false, message: 'Forbidden: you do not manage this branch.' });
        }

        await prisma.maintenanceTask.delete({ where: { id } });
        emitToBranch(existing.branchId, 'maintenance:updated', { taskId: id, deleted: true });
        return res.status(200).json({ success: true, message: 'Ticket deleted' });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { getTickets, createTicket, updateTicketStatus, deleteTicket };
