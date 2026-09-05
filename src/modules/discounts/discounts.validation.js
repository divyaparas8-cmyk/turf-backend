/**
 * Validation Middleware for Discount Offers Module
 */
const validateDiscountOffer = (req, res, next) => {
    const {
        title,
        turfId,
        branchId,
        discountType,
        discountValue,
        startDate,
        endDate,
        maximumDiscountAmount,
        usageLimit
    } = req.body;

    const errors = [];

    // Title validation
    if (!title || !title.trim()) {
        errors.push('Offer Title is required.');
    }

    // Turf validation
    if (!(turfId || branchId)) {
        errors.push('Target Turf is required.');
    }

    // Discount Type validation -- matches the real DiscountType enum (PERCENTAGE | FLAT_AMOUNT)
    const validTypes = ['PERCENTAGE', 'FLAT_AMOUNT'];
    const normalizedType = (discountType || '').toUpperCase().replace(/\s+/g, '_');
    if (!discountType || !validTypes.includes(normalizedType)) {
        errors.push(`Discount Type must be one of: ${validTypes.join(', ')}`);
    }

    // Discount Value validation -- strictly numeric (rs or % only)
    const val = Number(discountValue);
    if (discountValue === undefined || discountValue === null || isNaN(val) || val <= 0) {
        errors.push('Discount Value must be a valid numeric number (e.g. 20 for 20% or 300 for ₹300). Text like "free" is not allowed.');
    } else if (normalizedType === 'PERCENTAGE' && val > 100) {
        errors.push('Percentage discount cannot exceed 100%.');
    }

    // Flat Discount check against maximum discount
    if (normalizedType === 'FLAT_AMOUNT' && maximumDiscountAmount) {
        const maxVal = Number(maximumDiscountAmount);
        if (!isNaN(maxVal) && maxVal > 0 && val > maxVal) {
            errors.push('Flat discount value cannot exceed Maximum Discount Amount.');
        }
    }

    // Dates validation
    if (!startDate) {
        errors.push('Start Date is required.');
    }
    if (!endDate) {
        errors.push('End Date is required.');
    }
    if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (end < start) {
            errors.push('End Date cannot be before Start Date.');
        }
    }

    // Usage limit validation
    if (usageLimit !== undefined && usageLimit !== null && usageLimit !== '') {
        const limitNum = Number(usageLimit);
        if (isNaN(limitNum) || limitNum <= 0) {
            errors.push('Usage Limit must be greater than 0.');
        }
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            message: errors[0],
            errors
        });
    }

    next();
};

module.exports = {
    validateDiscountOffer
};
