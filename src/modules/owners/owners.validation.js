/**
 * Validation Middleware for Owner Module
 */

const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const isValidMobile = (mobile) => {
    const mobileRegex = /^[0-9+\-\s]{8,20}$/;
    return mobileRegex.test(mobile);
};

/**
 * Validate Owner Creation Payload
 */
const validateCreateOwner = (req, res, next) => {
    // Normalize property aliases for full name and mobile
    if (!req.body.fullName && req.body.name) req.body.fullName = req.body.name;
    if (!req.body.mobile && req.body.phone) req.body.mobile = req.body.phone;
    if (!req.body.mobile && req.body.mobileNumber) req.body.mobile = req.body.mobileNumber;

    const {
        fullName,
        email,
        mobile,
        password,
        status,
        country,
        state,
        city,
        zipCode,
        gstNumber,
        panNumber
    } = req.body;

    const errors = [];

    // Personal Information
    if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
        errors.push('Full Name is required and must be a non-empty string.');
    }

    if (!email || !isValidEmail(email)) {
        errors.push('A valid Email address is required.');
    }

    if (!mobile || !isValidMobile(mobile)) {
        errors.push('A valid Mobile number is required.');
    }

    if (!password) {
        req.body.password = 'Owner@12345';
    } else if (typeof password !== 'string' || password.length < 6) {
        errors.push('Password must be at least 6 characters long.');
    }

    if (status && !['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(status)) {
        errors.push('Status must be one of: ACTIVE, INACTIVE, SUSPENDED.');
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

/**
 * Validate Owner Update Payload
 */
const validateUpdateOwner = (req, res, next) => {
    const {
        fullName,
        email,
        mobile,
        password,
        status
    } = req.body;

    const errors = [];

    if (fullName !== undefined && (!fullName || typeof fullName !== 'string' || !fullName.trim())) {
        errors.push('Full Name must be a non-empty string.');
    }

    if (email !== undefined && !isValidEmail(email)) {
        errors.push('Email must be a valid email address.');
    }

    if (mobile !== undefined && !isValidMobile(mobile)) {
        errors.push('Mobile must be a valid mobile number.');
    }

    if (password !== undefined && (typeof password !== 'string' || password.length < 6)) {
        errors.push('Password must be at least 6 characters long if provided.');
    }

    if (status !== undefined && !['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(status)) {
        errors.push('Status must be one of: ACTIVE, INACTIVE, SUSPENDED.');
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
    validateCreateOwner,
    validateUpdateOwner
};
