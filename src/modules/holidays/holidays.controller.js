const prisma = require('../../config/prisma');

const genId = () => `hol_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

const toDateStr = (d) => {
    const dt = new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};

const formatHoliday = (r) => ({
    id: r.id,
    _id: r.id,
    branchId: r.branchId,
    title: r.title,
    holidayDate: toDateStr(r.holidayDate),
    startDate: toDateStr(r.holidayDate),
    endDate: toDateStr(r.holidayDate),
    reason: r.reason,
    isFullDay: r.isFullDay
});

const getHolidays = async (req, res) => {
    const { branchId } = req.query;
    try {
        const rows = await prisma.holiday.findMany({
            where: branchId ? { branchId } : {},
            orderBy: { holidayDate: 'asc' }
        });
        return res.status(200).json({ success: true, data: rows.map(formatHoliday) });
    } catch (error) {
        console.error('Fetch holidays error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error fetching holidays list.' });
    }
};

const assertBranchAccess = async (branchId, user) => {
    if (user.role === 'SUPER_ADMIN') return true;
    const branch = await prisma.branch.findUnique({ where: { id: branchId } });
    return !!branch && branch.ownerUserId === user.id;
};

const createHoliday = async (req, res) => {
    const { branchId, title, holidayDate, reason, isFullDay } = req.body;
    if (!branchId || !title || !holidayDate) {
        return res.status(400).json({ success: false, message: 'branchId, title, and holidayDate are required fields.' });
    }

    try {
        if (!(await assertBranchAccess(branchId, req.user))) {
            return res.status(403).json({ success: false, message: 'Forbidden: you do not manage this branch.' });
        }

        const holiday = await prisma.holiday.create({
            data: { id: genId(), branchId, title, holidayDate: new Date(holidayDate), reason: reason || null, isFullDay: !!isFullDay }
        });

        return res.status(201).json({ success: true, message: 'Holiday registered successfully.', data: formatHoliday(holiday) });
    } catch (error) {
        console.error('Create holiday error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error registering holiday.' });
    }
};

const deleteHoliday = async (req, res) => {
    try {
        const holiday = await prisma.holiday.findUnique({ where: { id: req.params.id } });
        if (!holiday) {
            return res.status(404).json({ success: false, message: 'Holiday block not found.' });
        }
        if (!(await assertBranchAccess(holiday.branchId, req.user))) {
            return res.status(403).json({ success: false, message: 'Forbidden: you do not manage this branch.' });
        }

        await prisma.holiday.delete({ where: { id: req.params.id } });
        return res.status(200).json({ success: true, message: 'Holiday block deleted successfully.' });
    } catch (error) {
        console.error('Delete holiday error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error deleting holiday.' });
    }
};

module.exports = { getHolidays, createHoliday, deleteHoliday };
