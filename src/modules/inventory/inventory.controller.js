const prisma = require('../../config/prisma');

const genId = () => `item_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

const formatItem = (r) => {
    const stock = r.stockQuantity;
    const threshold = r.minThreshold;
    const totalValue = stock * Number(r.unitPrice);
    let status = 'In Stock';
    if (stock <= 0) status = 'Out of Stock';
    else if (stock < threshold) status = 'Low Stock';

    return {
        id: r.id, _id: r.id, branchId: r.branchId,
        name: r.itemName, category: r.category,
        stock, threshold, price: Number(r.unitPrice),
        value: `₹${totalValue.toLocaleString()}`, status
    };
};

const resolveBranchScopeForUser = async (user, branchId) => {
    if (user.role === 'SUPER_ADMIN') {
        return branchId ? { branchId } : {};
    }
    if (user.role === 'STAFF') {
        const staffUser = await prisma.user.findUnique({ where: { id: user.id }, select: { staffBranchId: true } });
        if (staffUser?.staffBranchId) return { branchId: staffUser.staffBranchId };
    }
    if (branchId) return { branchId };
    const branches = await prisma.branch.findMany({ where: { ownerUserId: user.id }, select: { id: true } });
    if (branches.length > 0) return { branchId: { in: branches.map(b => b.id) } };
    return {};
};

const getInventory = async (req, res) => {
    const { branchId } = req.query;
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    try {
        const where = await resolveBranchScopeForUser(req.user, branchId);
        const rows = await prisma.inventory.findMany({ where, orderBy: { itemName: 'asc' } });
        return res.status(200).json({ success: true, data: rows.map(formatItem) });
    } catch (error) {
        console.error('Fetch inventory error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error fetching inventory.' });
    }
};

const assertBranchAccess = async (branchId, user) => {
    if (user.role === 'SUPER_ADMIN') return true;
    const branch = await prisma.branch.findUnique({ where: { id: branchId } });
    return !!branch && branch.ownerUserId === user.id;
};

const createInventoryItem = async (req, res) => {
    const { branchId, name, category, stock, price, threshold } = req.body;
    if (!branchId || !name || !price) {
        return res.status(400).json({ success: false, message: 'branchId, name, and price are required fields.' });
    }

    try {
        if (!(await assertBranchAccess(branchId, req.user))) {
            return res.status(403).json({ success: false, message: 'Forbidden: you do not manage this branch.' });
        }

        const item = await prisma.inventory.create({
            data: {
                id: genId(), branchId, itemName: name, category: category || 'Equipment',
                stockQuantity: stock || 0, minThreshold: threshold || 5, unitPrice: price,
                assetValue: (stock || 0) * Number(price)
            }
        });

        return res.status(201).json({ success: true, message: 'Inventory item added successfully.', data: formatItem(item) });
    } catch (error) {
        console.error('Create inventory item error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error creating item.' });
    }
};

const updateInventoryItem = async (req, res) => {
    const { id } = req.params;
    const { name, category, price, threshold } = req.body;

    try {
        const existing = await prisma.inventory.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Inventory item not found.' });
        }
        if (!(await assertBranchAccess(existing.branchId, req.user))) {
            return res.status(403).json({ success: false, message: 'Forbidden: you do not manage this branch.' });
        }

        const updated = await prisma.inventory.update({
            where: { id },
            data: { itemName: name ?? undefined, category: category ?? undefined, unitPrice: price ?? undefined, minThreshold: threshold ?? undefined }
        });

        return res.status(200).json({ success: true, message: 'Inventory item updated successfully.', data: formatItem(updated) });
    } catch (error) {
        console.error('Update inventory item error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error updating item.' });
    }
};

const deleteInventoryItem = async (req, res) => {
    const { id } = req.params;
    try {
        const existing = await prisma.inventory.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Inventory item not found.' });
        }
        if (!(await assertBranchAccess(existing.branchId, req.user))) {
            return res.status(403).json({ success: false, message: 'Forbidden: you do not manage this branch.' });
        }

        await prisma.inventory.delete({ where: { id } });
        return res.status(200).json({ success: true, message: 'Inventory item deleted successfully.' });
    } catch (error) {
        console.error('Delete inventory item error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error deleting item.' });
    }
};

const restockItem = async (req, res) => {
    const { id } = req.params;
    const { quantity, cost, supplier } = req.body;

    if (!quantity || Number(quantity) <= 0 || !cost) {
        return res.status(400).json({ success: false, message: 'quantity (greater than zero) and cost are required fields.' });
    }

    try {
        const item = await prisma.inventory.findUnique({ where: { id } });
        if (!item) {
            return res.status(404).json({ success: false, message: 'Inventory item not found.' });
        }
        if (!(await assertBranchAccess(item.branchId, req.user))) {
            return res.status(403).json({ success: false, message: 'Forbidden: you do not manage this branch.' });
        }

        const newQty = item.stockQuantity + Number(quantity);
        const result = await prisma.$transaction(async (tx) => {
            const updated = await tx.inventory.update({ where: { id }, data: { stockQuantity: newQty } });
            await tx.purchaseEntry.create({ data: { inventoryId: id, quantity: Number(quantity), purchaseCost: cost, supplier: supplier || 'General Distributor' } });
            return updated;
        });

        return res.status(200).json({ success: true, message: 'Restocking purchase entry logged successfully.', data: { newStockQuantity: result.stockQuantity } });
    } catch (error) {
        console.error('Restocking transaction error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error processing restock.' });
    }
};

module.exports = { getInventory, createInventoryItem, updateInventoryItem, deleteInventoryItem, restockItem };
