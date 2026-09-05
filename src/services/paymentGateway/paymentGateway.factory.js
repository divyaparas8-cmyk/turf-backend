const prisma = require('../../config/prisma');
const ManualGatewayProvider = require('./ManualGatewayProvider');
const RazorpayRouteProvider = require('./RazorpayRouteProvider');

const GATEWAY_CONFIG_ID = 'global_gateway';

async function getGatewayConfig() {
    let config = await prisma.paymentGatewayConfig.findUnique({ where: { id: GATEWAY_CONFIG_ID } });
    const envKeyId = process.env.RAZORPAY_KEY_ID;
    const envKeySecret = process.env.RAZORPAY_KEY_SECRET;
    const envWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!config) {
        config = {
            id: GATEWAY_CONFIG_ID,
            activeProvider: process.env.PAYMENT_GATEWAY_PROVIDER || 'MANUAL',
            isLiveMode: false,
            razorpayKeyId: envKeyId || null,
            razorpayKeySecret: envKeySecret || null,
            razorpayWebhookSecret: envWebhookSecret || null
        };
    } else {
        if (envKeyId && !envKeyId.includes('PASTE_YOUR_KEY_ID')) {
            config.razorpayKeyId = envKeyId;
        }
        if (envKeySecret && !envKeySecret.includes('PASTE_YOUR_KEY_SECRET')) {
            config.razorpayKeySecret = envKeySecret;
        }
        if (envWebhookSecret && !envWebhookSecret.includes('PASTE_YOUR_WEBHOOK')) {
            config.razorpayWebhookSecret = envWebhookSecret;
        }
    }
    return config;
}

/** Returns the currently-active PaymentGatewayProvider instance. Manual (no live gateway) unless a Super Admin has switched it. */
async function getActiveProvider() {
    const config = await getGatewayConfig();
    switch (config.activeProvider) {
        case 'RAZORPAY_ROUTE':
            return new RazorpayRouteProvider(config);
        case 'MANUAL':
        default:
            return new ManualGatewayProvider();
    }
}

module.exports = { getGatewayConfig, getActiveProvider, GATEWAY_CONFIG_ID };
