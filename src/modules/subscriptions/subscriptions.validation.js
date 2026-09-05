/**
 * Validation Middleware for Subscriptions Module
 */

const validateCreatePlan = (req, res, next) => {
    const { planName, monthlyPricing, yearlyPricing, status } = req.body;
    const errors = [];

    if (!planName || typeof planName !== 'string' || !planName.trim()) {
        errors.push('Plan Name is required and must be a non-empty string.');
    }

    if (status && !['active', 'inactive', 'draft'].includes(status.toLowerCase())) {
        errors.push('Status must be one of: active, inactive, draft.');
    }

    if (monthlyPricing && monthlyPricing.price < 0) {
        errors.push('Monthly price must be a non-negative number.');
    }

    if (yearlyPricing && yearlyPricing.price < 0) {
        errors.push('Yearly price must be a non-negative number.');
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors
        });
    }

    next();
};

const validateUpdatePlan = (req, res, next) => {
    const { planName, monthlyPricing, yearlyPricing, status } = req.body;
    const errors = [];

    if (planName !== undefined && (!planName || typeof planName !== 'string' || !planName.trim())) {
        errors.push('Plan Name must be a non-empty string.');
    }

    if (status !== undefined && !['active', 'inactive', 'draft'].includes(status.toLowerCase())) {
        errors.push('Status must be one of: active, inactive, draft.');
    }

    if (monthlyPricing && monthlyPricing.price !== undefined && monthlyPricing.price < 0) {
        errors.push('Monthly price must be a non-negative number.');
    }

    if (yearlyPricing && yearlyPricing.price !== undefined && yearlyPricing.price < 0) {
        errors.push('Yearly price must be a non-negative number.');
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors
        });
    }

    next();
};

module.exports = {
    validateCreatePlan,
    validateUpdatePlan
};
