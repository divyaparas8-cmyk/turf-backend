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
    if (!user || user.role === 'SUPER_ADMIN' || user.role === 'STAFF') return true;
    const branch = await prisma.branch.findUnique({ where: { id: branchId } });
    return !!branch && branch.ownerUserId === user.id;
};

const createInventoryItem = async (req, res) => {
    const { branchId, name, itemName, category, stock, stockQuantity, price, unitPrice, threshold, minThreshold } = req.body;
    const resolvedName = (name || itemName || '').trim();
    const resolvedPrice = Number(unitPrice ?? price ?? 0);
    const resolvedStock = Number(stockQuantity ?? stock ?? 0);
    const resolvedThreshold = Number(minThreshold ?? threshold ?? 5);

    if (!resolvedName) {
        return res.status(400).json({ success: false, message: 'Item name is required.' });
    }

    try {
        let effectiveBranchId = branchId;
        if (!effectiveBranchId) {
            if (req.user?.staffBranchId) {
                effectiveBranchId = req.user.staffBranchId;
            } else {
                const staffUser = await prisma.user.findUnique({ where: { id: req.user.id } }).catch(() => null);
                if (staffUser?.staffBranchId) {
                    effectiveBranchId = staffUser.staffBranchId;
                } else {
                    const firstBranch = await prisma.branch.findFirst({ select: { id: true } });
                    effectiveBranchId = firstBranch?.id || 'br_default';
                }
            }
        }

        const item = await prisma.inventory.create({
            data: {
                id: genId(),
                branchId: effectiveBranchId,
                itemName: resolvedName,
                category: category || 'Sports Gear',
                stockQuantity: resolvedStock,
                minThreshold: resolvedThreshold,
                unitPrice: resolvedPrice,
                assetValue: resolvedStock * resolvedPrice
            }
        });

        return res.status(201).json({ success: true, message: 'Inventory item added successfully.', data: formatItem(item) });
    } catch (error) {
        console.error('Create inventory item error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error creating item: ' + error.message });
    }
};

const updateInventoryItem = async (req, res) => {
    const { id } = req.params;
    const { name, itemName, category, price, unitPrice, threshold, minThreshold, stock, stockQuantity } = req.body;

    try {
        const existing = await prisma.inventory.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Inventory item not found.' });
        }

        const resolvedName = name !== undefined ? name : itemName;
        const resolvedPrice = unitPrice !== undefined ? Number(unitPrice) : price !== undefined ? Number(price) : undefined;
        const resolvedThreshold = minThreshold !== undefined ? Number(minThreshold) : threshold !== undefined ? Number(threshold) : undefined;
        const resolvedStock = stockQuantity !== undefined ? Number(stockQuantity) : stock !== undefined ? Number(stock) : undefined;

        const updateData = {};
        if (resolvedName !== undefined) updateData.itemName = resolvedName.trim();
        if (category !== undefined) updateData.category = category;
        if (resolvedPrice !== undefined) updateData.unitPrice = resolvedPrice;
        if (resolvedThreshold !== undefined) updateData.minThreshold = resolvedThreshold;
        if (resolvedStock !== undefined) {
            updateData.stockQuantity = resolvedStock;
            const currentPrice = resolvedPrice !== undefined ? resolvedPrice : Number(existing.unitPrice);
            updateData.assetValue = resolvedStock * currentPrice;
        }

        const updated = await prisma.inventory.update({
            where: { id },
            data: updateData
        });

        return res.status(200).json({ success: true, message: 'Inventory item updated successfully.', data: formatItem(updated) });
    } catch (error) {
        console.error('Update inventory item error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error updating item: ' + error.message });
    }
};

const deleteInventoryItem = async (req, res) => {
    const { id } = req.params;
    try {
        const existing = await prisma.inventory.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Inventory item not found.' });
        }

        await prisma.inventory.delete({ where: { id } });
        return res.status(200).json({ success: true, message: 'Inventory item deleted successfully.' });
    } catch (error) {
        console.error('Delete inventory item error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error deleting item: ' + error.message });
    }
};

const restockItem = async (req, res) => {
    const { id } = req.params;
    const { quantity, quantityAdded, cost, totalCost, supplier, supplierName } = req.body;

    const resolvedQty = Number(quantityAdded ?? quantity ?? 0);
    const resolvedCost = Number(totalCost ?? cost ?? 0);

    if (resolvedQty <= 0) {
        return res.status(400).json({ success: false, message: 'Quantity added must be greater than zero.' });
    }

    try {
        const item = await prisma.inventory.findUnique({ where: { id } });
        if (!item) {
            return res.status(404).json({ success: false, message: 'Inventory item not found.' });
        }

        const newQty = item.stockQuantity + resolvedQty;
        const newAssetValue = newQty * Number(item.unitPrice);

        const result = await prisma.$transaction(async (tx) => {
            const updated = await tx.inventory.update({
                where: { id },
                data: {
                    stockQuantity: newQty,
                    assetValue: newAssetValue
                }
            });
            await tx.purchaseEntry.create({
                data: {
                    inventoryId: id,
                    quantity: resolvedQty,
                    purchaseCost: resolvedCost,
                    supplier: supplierName || supplier || 'General Distributor'
                }
            });
            return updated;
        });

        return res.status(200).json({ success: true, message: 'Restocking purchase entry logged successfully.', data: { newStockQuantity: result.stockQuantity } });
    } catch (error) {
        console.error('Restocking transaction error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error processing restock: ' + error.message });
    }
};

module.exports = { getInventory, createInventoryItem, updateInventoryItem, deleteInventoryItem, restockItem };
