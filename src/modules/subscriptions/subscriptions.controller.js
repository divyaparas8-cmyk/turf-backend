const prisma = require('../../config/prisma');

const genId = (prefix) => `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

const formatPlan = (r) => {
    if (!r) return null;
    return {
        id: r.id,
        _id: r.id,
        planName: r.planName,
        description: r.description || '',
        isPopular: r.isPopular,
        status: r.status,
        monthlyPricing: {
            price: Number(r.monthlyPrice),
            branchLimit: r.monthlyBranchLimit,
            sportsLimit: r.monthlySportsLimit,
            bookingLimit: r.monthlyBookingLimit,
            activeUsersLimit: r.monthlyActiveUsersLimit
        },
        yearlyPricing: {
            price: Number(r.yearlyPrice),
            branchLimit: r.yearlyBranchLimit,
            sportsLimit: r.yearlySportsLimit,
            bookingLimit: r.yearlyBookingLimit,
            activeUsersLimit: r.yearlyActiveUsersLimit
        },
        features: r.features || [],
        createdAt: r.createdAt,
        updatedAt: r.updatedAt
    };
};

const getAllPlans = async (req, res) => {
    try {
        const plans = await prisma.subscriptionPlan.findMany({ orderBy: { createdAt: 'asc' } });
        return res.status(200).json({ success: true, data: plans.map(formatPlan) });
    } catch (error) {
        console.error('Error fetching subscription plans:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch subscription plans', error: error.message });
    }
};

const getPlanById = async (req, res) => {
    try {
        const plan = await prisma.subscriptionPlan.findUnique({ where: { id: req.params.id } });
        if (!plan) {
            return res.status(404).json({ success: false, message: 'Subscription plan not found' });
        }
        return res.status(200).json({ success: true, data: formatPlan(plan) });
    } catch (error) {
        console.error('Error fetching plan by ID:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch plan details', error: error.message });
    }
};

const createPlan = async (req, res) => {
    try {
        const { planName, description, isPopular = false, status = 'ACTIVE', monthlyPricing = {}, yearlyPricing = {}, features = [] } = req.body;

        const plan = await prisma.subscriptionPlan.create({
            data: {
                id: genId('plan'),
                planName: planName.trim(),
                description: description ? description.trim() : null,
                isPopular: !!isPopular,
                status: status.toUpperCase(),
                monthlyPrice: monthlyPricing.price || 0,
                monthlyBranchLimit: monthlyPricing.branchLimit ?? 1,
                monthlySportsLimit: monthlyPricing.sportsLimit ?? 2,
                monthlyBookingLimit: monthlyPricing.bookingLimit ?? 200,
                monthlyActiveUsersLimit: monthlyPricing.activeUsersLimit ?? 5,
                yearlyPrice: yearlyPricing.price || 0,
                yearlyBranchLimit: yearlyPricing.branchLimit ?? 1,
                yearlySportsLimit: yearlyPricing.sportsLimit ?? 2,
                yearlyBookingLimit: yearlyPricing.bookingLimit ?? 2500,
                yearlyActiveUsersLimit: yearlyPricing.activeUsersLimit ?? 5,
                features
            }
        });

        return res.status(201).json({ success: true, message: 'Subscription plan created successfully', data: formatPlan(plan) });
    } catch (error) {
        console.error('Error creating subscription plan:', error);
        return res.status(500).json({ success: false, message: 'Failed to create subscription plan', error: error.message });
    }
};

const updatePlan = async (req, res) => {
    try {
        const { id } = req.params;
        const { planName, description, isPopular, status, monthlyPricing, yearlyPricing, features } = req.body;

        const updated = await prisma.subscriptionPlan.update({
            where: { id },
            data: {
                planName: planName !== undefined ? planName.trim() : undefined,
                description: description !== undefined ? description.trim() : undefined,
                isPopular: isPopular !== undefined ? !!isPopular : undefined,
                status: status !== undefined ? status.toUpperCase() : undefined,
                monthlyPrice: monthlyPricing?.price !== undefined && monthlyPricing?.price !== null ? Number(monthlyPricing.price) : undefined,
                monthlyBranchLimit: monthlyPricing?.branchLimit !== undefined && monthlyPricing?.branchLimit !== null ? Number(monthlyPricing.branchLimit) : undefined,
                monthlySportsLimit: monthlyPricing?.sportsLimit !== undefined && monthlyPricing?.sportsLimit !== null ? Number(monthlyPricing.sportsLimit) : undefined,
                monthlyBookingLimit: monthlyPricing?.bookingLimit !== undefined && monthlyPricing?.bookingLimit !== null ? Number(monthlyPricing.bookingLimit) : undefined,
                monthlyActiveUsersLimit: monthlyPricing?.activeUsersLimit !== undefined && monthlyPricing?.activeUsersLimit !== null ? Number(monthlyPricing.activeUsersLimit) : undefined,
                yearlyPrice: yearlyPricing?.price !== undefined && yearlyPricing?.price !== null ? Number(yearlyPricing.price) : undefined,
                yearlyBranchLimit: yearlyPricing?.branchLimit !== undefined && yearlyPricing?.branchLimit !== null ? Number(yearlyPricing.branchLimit) : undefined,
                yearlySportsLimit: yearlyPricing?.sportsLimit !== undefined && yearlyPricing?.sportsLimit !== null ? Number(yearlyPricing.sportsLimit) : undefined,
                yearlyBookingLimit: yearlyPricing?.bookingLimit !== undefined && yearlyPricing?.bookingLimit !== null ? Number(yearlyPricing.bookingLimit) : undefined,
                yearlyActiveUsersLimit: yearlyPricing?.activeUsersLimit !== undefined && yearlyPricing?.activeUsersLimit !== null ? Number(yearlyPricing.activeUsersLimit) : undefined,
                features: features ?? undefined
            }
        });

        return res.status(200).json({ success: true, message: 'Subscription plan updated successfully', data: formatPlan(updated) });
    } catch (error) {
        console.error('Error updating subscription plan:', error);
        return res.status(500).json({ success: false, message: 'Failed to update subscription plan: ' + error.message });
    }
};

const deletePlan = async (req, res) => {
    try {
        await prisma.subscriptionPlan.delete({ where: { id: req.params.id } });
        return res.status(200).json({ success: true, message: 'Subscription plan deleted successfully' });
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ success: false, message: 'Subscription plan not found' });
        }
        console.error('Error deleting subscription plan:', error);
        return res.status(500).json({ success: false, message: 'Failed to delete subscription plan', error: error.message });
    }
};

const toggleStatus = async (req, res) => {
    try {
        const { status } = req.body;
        if (!status || !['ACTIVE', 'INACTIVE'].includes(status.toUpperCase())) {
            return res.status(400).json({ success: false, message: 'Valid status is required (ACTIVE, INACTIVE)' });
        }

        const updated = await prisma.subscriptionPlan.update({ where: { id: req.params.id }, data: { status: status.toUpperCase() } }).catch(() => null);
        if (!updated) {
            return res.status(404).json({ success: false, message: 'Subscription plan not found' });
        }
        return res.status(200).json({ success: true, message: `Status updated to ${status}` });
    } catch (error) {
        console.error('Error toggling plan status:', error);
        return res.status(500).json({ success: false, message: 'Failed to update plan status', error: error.message });
    }
};

const togglePopular = async (req, res) => {
    try {
        const { isPopular } = req.body;
        const updated = await prisma.subscriptionPlan.update({ where: { id: req.params.id }, data: { isPopular: !!isPopular } }).catch(() => null);
        if (!updated) {
            return res.status(404).json({ success: false, message: 'Subscription plan not found' });
        }
        return res.status(200).json({ success: true, message: 'Popular status updated' });
    } catch (error) {
        console.error('Error toggling plan popularity:', error);
        return res.status(500).json({ success: false, message: 'Failed to update plan popularity', error: error.message });
    }
};

/**
 * Purchase a subscription plan for the requesting owner (or a specific owner,
 * for Super Admin-driven purchases). No fake fallback owner id is ever used.
 */
const purchaseSubscription = async (req, res) => {
    try {
        const { ownerId, planId, billingCycle = 'MONTHLY', paymentMethod = 'ONLINE' } = req.body;
        if (!planId) {
            return res.status(400).json({ success: false, message: 'planId is required to purchase subscription' });
        }
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Authentication required.' });
        }

        const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
        if (!plan) {
            return res.status(404).json({ success: false, message: 'Subscription plan not found' });
        }

        let owner;
        if (req.user.role === 'SUPER_ADMIN' && ownerId) {
            owner = await prisma.owner.findUnique({ where: { id: ownerId } });
        } else {
            owner = await prisma.owner.findUnique({ where: { userId: req.user.id } });
        }
        if (!owner) {
            return res.status(404).json({ success: false, message: 'Owner account not found.' });
        }

        const amount = billingCycle === 'YEARLY' ? Number(plan.yearlyPrice) : Number(plan.monthlyPrice);
        const startDate = new Date();
        const endDate = new Date(startDate);
        if (billingCycle === 'YEARLY') endDate.setFullYear(endDate.getFullYear() + 1);
        else endDate.setMonth(endDate.getMonth() + 1);

        const subscription = await prisma.$transaction(async (tx) => {
            const sub = await tx.ownerSubscription.create({
                data: {
                    id: genId('sub'),
                    ownerId: owner.id,
                    planId: plan.id,
                    planName: plan.planName,
                    amount,
                    billingCycle,
                    status: 'ACTIVE',
                    paymentStatus: 'COMPLETED',
                    paymentMethod,
                    transactionId: genId('TXN'),
                    startDate,
                    endDate
                }
            });
            await tx.owner.update({ where: { id: owner.id }, data: { subscriptionPlan: { connect: { id: plan.id } } } });
            await tx.branch.updateMany({
                where: { ownerId: owner.id },
                data: {
                    subscriptionPlanId: plan.id,
                    subscriptionPriceSnapshot: amount,
                    planPrice: amount
                }
            });
            return sub;
        });

        return res.status(201).json({
            success: true,
            message: `Successfully subscribed to ${plan.planName}`,
            data: { id: subscription.id, ownerId: owner.id, planId: plan.id, planName: plan.planName, amount, billingCycle, paymentStatus: 'COMPLETED', transactionId: subscription.transactionId, startDate, endDate }
        });
    } catch (error) {
        console.error('Error purchasing subscription:', error);
        return res.status(500).json({ success: false, message: 'Failed to complete subscription purchase', error: error.message });
    }
};

const getSubscriptionPurchases = async (req, res) => {
    try {
        const rows = await prisma.ownerSubscription.findMany({
            include: { owner: true },
            orderBy: { createdAt: 'desc' }
        });

        return res.status(200).json({
            success: true,
            data: rows.map(r => ({
                id: r.id,
                ownerId: r.ownerId,
                ownerName: r.owner?.fullName || null,
                businessName: r.owner?.businessName || null,
                planId: r.planId,
                planName: r.planName,
                amount: Number(r.amount),
                billingCycle: r.billingCycle,
                status: r.status,
                paymentStatus: r.paymentStatus,
                paymentMethod: r.paymentMethod,
                transactionId: r.transactionId,
                startDate: r.startDate,
                endDate: r.endDate,
                createdAt: r.createdAt
            }))
        });
    } catch (error) {
        console.error('Error fetching subscription purchases:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch subscription purchases', error: error.message });
    }
};

module.exports = {
    getAllPlans, getPlanById, createPlan, updatePlan, deletePlan,
    toggleStatus, togglePopular, purchaseSubscription, getSubscriptionPurchases
};
