const prisma = require('../../config/prisma');
const { GATEWAY_CONFIG_ID, getGatewayConfig } = require('../../services/paymentGateway/paymentGateway.factory');

const maskSecret = (value) => (value ? `${'•'.repeat(Math.max(0, value.length - 4))}${value.slice(-4)}` : null);

/** GET /api/v1/settings/payment-gateway -- Super Admin only. Secrets are masked, never returned in full. */
const getPaymentGatewaySettings = async (req, res) => {
    try {
        const config = await getGatewayConfig();
        return res.status(200).json({
            success: true,
            data: {
                activeProvider: config.activeProvider,
                isLiveMode: config.isLiveMode,
                razorpayKeyId: config.razorpayKeyId,
                razorpayKeySecret: maskSecret(config.razorpayKeySecret),
                razorpayWebhookSecret: maskSecret(config.razorpayWebhookSecret),
                stripeSecretKey: maskSecret(config.stripeSecretKey),
                stripeWebhookSecret: maskSecret(config.stripeWebhookSecret),
                hasRazorpayKeys: !!(config.razorpayKeyId && config.razorpayKeySecret),
                hasStripeKeys: !!config.stripeSecretKey
            }
        });
    } catch (error) {
        console.error('Fetch payment gateway settings error:', error);
        return res.status(500).json({ success: false, message: 'Error fetching payment gateway settings: ' + error.message });
    }
};

/**
 * PUT /api/v1/settings/payment-gateway -- Super Admin only. Switching
 * activeProvider away from MANUAL is the entire "plug-and-play" activation
 * step; keys are only stored when explicitly provided (blank fields leave the
 * existing stored key untouched rather than wiping it).
 */
const updatePaymentGatewaySettings = async (req, res) => {
    const { activeProvider, isLiveMode, razorpayKeyId, razorpayKeySecret, razorpayWebhookSecret, stripeSecretKey, stripeWebhookSecret } = req.body;

    if (activeProvider && !['MANUAL', 'RAZORPAY_ROUTE', 'STRIPE_CONNECT'].includes(activeProvider)) {
        return res.status(400).json({ success: false, message: 'activeProvider must be MANUAL, RAZORPAY_ROUTE, or STRIPE_CONNECT.' });
    }

    try {
        const config = await prisma.paymentGatewayConfig.upsert({
            where: { id: GATEWAY_CONFIG_ID },
            update: {
                activeProvider: activeProvider ?? undefined,
                isLiveMode: isLiveMode !== undefined ? !!isLiveMode : undefined,
                razorpayKeyId: razorpayKeyId || undefined,
                razorpayKeySecret: razorpayKeySecret || undefined,
                razorpayWebhookSecret: razorpayWebhookSecret || undefined,
                stripeSecretKey: stripeSecretKey || undefined,
                stripeWebhookSecret: stripeWebhookSecret || undefined,
                updatedBy: req.user?.id || null
            },
            create: {
                id: GATEWAY_CONFIG_ID,
                activeProvider: activeProvider || 'MANUAL',
                isLiveMode: !!isLiveMode,
                razorpayKeyId: razorpayKeyId || null,
                razorpayKeySecret: razorpayKeySecret || null,
                razorpayWebhookSecret: razorpayWebhookSecret || null,
                stripeSecretKey: stripeSecretKey || null,
                stripeWebhookSecret: stripeWebhookSecret || null,
                updatedBy: req.user?.id || null
            }
        });

        return res.status(200).json({
            success: true,
            message: `Payment gateway is now set to ${config.activeProvider}.`,
            data: { activeProvider: config.activeProvider, isLiveMode: config.isLiveMode }
        });
    } catch (error) {
        console.error('Update payment gateway settings error:', error);
        return res.status(500).json({ success: false, message: 'Error updating payment gateway settings: ' + error.message });
    }
};

const getCommissionSettings = async (req, res) => {
    try {
        let settings = await prisma.systemSetting.findUnique({ where: { id: 'global_commission' } });
        if (!settings) {
            settings = await prisma.systemSetting.create({
                data: { id: 'global_commission', sportsRates: { Football: 5.0, Cricket: 5.0, Badminton: 4.0, Tennis: 4.5 } }
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                defaultRate: Number(settings.defaultRate),
                maxRate: Number(settings.maxRate),
                status: settings.status,
                sportsRates: settings.sportsRates || {}
            }
        });
    } catch (error) {
        console.error('Fetch commission settings error:', error);
        return res.status(500).json({ success: false, message: 'Error fetching commission settings: ' + error.message });
    }
};

const updateCommissionSettings = async (req, res) => {
    const { defaultRate, maxRate, sportsRates } = req.body;
    const defRate = Number(defaultRate);
    const mRate = Number(maxRate);

    if (isNaN(defRate) || defRate < 0 || defRate > 100) {
        return res.status(400).json({ success: false, message: 'Default Rate must be between 0 and 100.' });
    }
    if (isNaN(mRate) || mRate < 0 || mRate > 100) {
        return res.status(400).json({ success: false, message: 'Max Rate must be between 0 and 100.' });
    }

    try {
        const settings = await prisma.systemSetting.upsert({
            where: { id: 'global_commission' },
            update: { defaultRate: defRate, maxRate: mRate, sportsRates: sportsRates || {} },
            create: { id: 'global_commission', defaultRate: defRate, maxRate: mRate, sportsRates: sportsRates || {} }
        });

        return res.status(200).json({
            success: true,
            message: 'Commission settings updated successfully',
            data: { defaultRate: Number(settings.defaultRate), maxRate: Number(settings.maxRate), status: settings.status, sportsRates: settings.sportsRates }
        });
    } catch (error) {
        console.error('Update commission settings error:', error);
        return res.status(500).json({ success: false, message: 'Error updating commission settings: ' + error.message });
    }
};

/** GET /api/v1/settings/contact-info -- Public / Website & Super Admin */
const getContactSettings = async (req, res) => {
    try {
        let settings = await prisma.systemSetting.findUnique({ where: { id: 'contact_info_config' } });
        const defaultContact = {
            addressLine1: '2341/E, Sudama Nagar',
            cityStateCountry: 'Indore, M.P., India',
            email: 'info@kiaantechnology.com',
            phone: '+91 97521 00980',
            weekdayHours: 'MON-FRI: 09:00 AM - 07:00 PM IST',
            weekendHours: 'SAT: 10:00 AM - 04:00 PM IST',
            poweredBy: 'Powered by Kiaan Technology'
        };
        return res.status(200).json({
            success: true,
            data: settings?.sportsRates || defaultContact
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching contact settings: ' + error.message });
    }
};

/** PUT /api/v1/settings/contact-info -- Super Admin only */
const updateContactSettings = async (req, res) => {
    try {
        const { addressLine1, cityStateCountry, email, phone, weekdayHours, weekendHours, poweredBy } = req.body;
        const contactData = {
            addressLine1: addressLine1 || '2341/E, Sudama Nagar',
            cityStateCountry: cityStateCountry || 'Indore, M.P., India',
            email: email || 'info@kiaantechnology.com',
            phone: phone || '+91 97521 00980',
            weekdayHours: weekdayHours || 'MON-FRI: 09:00 AM - 07:00 PM IST',
            weekendHours: weekendHours || 'SAT: 10:00 AM - 04:00 PM IST',
            poweredBy: poweredBy || 'Powered by Kiaan Technology'
        };

        const settings = await prisma.systemSetting.upsert({
            where: { id: 'contact_info_config' },
            update: { sportsRates: contactData },
            create: { id: 'contact_info_config', sportsRates: contactData }
        });

        return res.status(200).json({
            success: true,
            message: 'Contact info settings updated successfully.',
            data: settings.sportsRates
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error updating contact info settings: ' + error.message });
    }
};

module.exports = {
    getCommissionSettings,
    updateCommissionSettings,
    getPaymentGatewaySettings,
    updatePaymentGatewaySettings,
    getContactSettings,
    updateContactSettings
};
