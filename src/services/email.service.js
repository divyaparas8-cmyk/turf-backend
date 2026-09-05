const https = require('https');
require('dotenv').config();

/**
 * Core Brevo API Email Dispatcher
 */
const sendBrevoEmail = async ({ to, subject, htmlContent }) => {
    const apiKey = process.env.BREVO_API_KEY || process.env.BREVO_SMTP_KEY;
    const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.SUPPORT_EMAIL || 'support@kiaantechnology.com';
    const senderName = process.env.BREVO_SENDER_NAME || 'Kiaantechnology SportMatrix Support';

    if (!apiKey) {
        console.log(`[EMAIL PLUGIN] BREVO_API_KEY is not defined in .env. Email to ${to[0]?.email} logged to console only.`);
        console.log(`[EMAIL PREVIEW] Subject: ${subject}\nTo: ${to[0]?.email}`);
        return { success: false, skipped: true, reason: 'BREVO_API_KEY missing in environment' };
    }

    const postData = JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: to,
        subject: subject,
        htmlContent: htmlContent
    });

    return new Promise((resolve) => {
        const req = https.request({
            hostname: 'api.brevo.com',
            port: 443,
            path: '/v3/smtp/email',
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': apiKey,
                'content-type': 'application/json',
                'content-length': Buffer.byteLength(postData)
            }
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    console.log(`[EMAIL SENT SUCCESS] Subject: "${subject}" -> ${to[0]?.email}`);
                    resolve({ success: true, response: body });
                } else {
                    console.error(`[EMAIL ERROR] Brevo HTTP ${res.statusCode}:`, body);
                    resolve({ success: false, error: body });
                }
            });
        });

        req.on('error', (e) => {
            console.error('[EMAIL ERROR] Connection failure:', e);
            resolve({ success: false, error: e.message });
        });

        req.write(postData);
        req.end();
    });
};

/**
 * 1. Turf Admin Welcome / Membership Onboarding Email
 */
const sendTurfAdminCredentialsEmail = async ({ recipientEmail, recipientName, password, businessName, planName, planPrice }) => {
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; color: #374151; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08); border: 1px solid #e5e7eb; }
            .header { background: #111827; color: #ffffff; padding: 32px; text-align: center; }
            .badge { background: rgba(34, 197, 94, 0.2); color: #22c55e; font-size: 11px; font-weight: 800; padding: 4px 14px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.05em; display: inline-block; }
            .header h1 { margin: 12px 0 0 0; font-size: 24px; font-weight: 900; letter-spacing: -0.5px; }
            .content { padding: 32px; font-size: 14px; line-height: 1.6; }
            .creds-box { background: #0f172a; color: #ffffff; padding: 20px 24px; border-radius: 14px; font-family: 'Courier New', monospace; font-size: 13px; margin: 24px 0; border: 1px solid #1e293b; }
            .creds-row { padding: 10px 0; border-bottom: 1px solid #1e293b; }
            .creds-label { color: #94a3b8; font-size: 12px; }
            .creds-val { color: #c8ff2e; font-weight: bold; font-size: 14px; }
            .btn-wrapper { text-align: center; margin-top: 28px; }
            .btn { display: inline-block; background: #16a34a; color: #ffffff !important; font-weight: 800; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; box-shadow: 0 4px 14px rgba(22, 163, 74, 0.3); }
            .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <span class="badge">TURF ADMIN ONBOARDING</span>
                <h1>Welcome to SportMatrix!</h1>
            </div>
            <div class="content">
                <p>Hello <strong>${recipientName}</strong>,</p>
                <p>Your Turf Admin account for <strong>${businessName || 'SportMatrix Arena'}</strong> is now successfully registered and live!</p>
                
                <div class="creds-box">
                    <div class="creds-row">
                        <div class="creds-label">Turf Business Name:</div>
                        <div class="creds-val" style="color: #ffffff;">${businessName || 'Turf Arena'}</div>
                    </div>
                    <div class="creds-row">
                        <div class="creds-label">Membership Plan Selected:</div>
                        <div class="creds-val" style="color: #22c55e;">${planName || 'Starter Plan'} ${planPrice ? `(${planPrice})` : ''}</div>
                    </div>
                    <div class="creds-row">
                        <div class="creds-label">Admin Login Email ID:</div>
                        <div class="creds-val" style="color: #ffffff;">${recipientEmail}</div>
                    </div>
                    <div class="creds-row" style="border-bottom: none;">
                        <div class="creds-label">Admin Password:</div>
                        <div class="creds-val">${password}</div>
                    </div>
                </div>

                <p>You can log in to your dashboard to manage slots, court pricing, staff, and view bookings.</p>
                <div class="btn-wrapper">
                    <a href="http://localhost:5173/login" class="btn">Login to Owner Admin Dashboard &rarr;</a>
                </div>
            </div>
            <div class="footer">
                &copy; 2026 Kiaantechnology SportMatrix Platform · All rights reserved.<br/>
                Need Help? Contact <a href="mailto:support@kiaantechnology.com" style="color: #16a34a;">support@kiaantechnology.com</a>
            </div>
        </div>
    </body>
    </html>
    `;

    return sendBrevoEmail({
        to: [{ email: recipientEmail, name: recipientName }],
        subject: `🏆 Welcome to SportMatrix! Credentials for ${businessName || 'Turf Arena'}`,
        htmlContent
    });
};

/**
 * 2. Forgot Password Email Notification
 */
const sendForgotPasswordEmail = async ({ recipientEmail, recipientName, temporaryPassword }) => {
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; color: #374151; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08); border: 1px solid #e5e7eb; }
            .header { background: #0f172a; color: #ffffff; padding: 28px; text-align: center; }
            .badge { background: rgba(234, 179, 8, 0.2); color: #eab308; font-size: 11px; font-weight: 800; padding: 4px 14px; border-radius: 20px; text-transform: uppercase; }
            .content { padding: 32px; font-size: 14px; line-height: 1.6; }
            .pass-box { background: #f8fafc; border: 2px dashed #cbd5e1; padding: 18px; text-align: center; border-radius: 12px; margin: 20px 0; }
            .pass-val { font-family: 'Courier New', monospace; font-size: 22px; font-weight: 900; color: #16a34a; letter-spacing: 2px; }
            .btn { display: inline-block; background: #16a34a; color: #ffffff !important; font-weight: 800; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-size: 13px; text-transform: uppercase; }
            .footer { background: #f8fafc; padding: 18px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <span class="badge">PASSWORD RESET REQUEST</span>
                <h2 style="margin: 10px 0 0 0;">SportMatrix Account Access</h2>
            </div>
            <div class="content">
                <p>Hello <strong>${recipientName || 'User'}</strong>,</p>
                <p>We received a request to reset your password for account <strong>${recipientEmail}</strong>.</p>
                
                <div class="pass-box">
                    <div style="font-size: 12px; color: #64748b; margin-bottom: 6px; font-weight: 700; text-transform: uppercase;">Your New Temporary Password:</div>
                    <div class="pass-val">${temporaryPassword}</div>
                </div>

                <p>Please log in using this temporary password and update your password from your profile settings.</p>
                <div style="text-align: center; margin-top: 24px;">
                    <a href="http://localhost:5173/login" class="btn">Log In Now &rarr;</a>
                </div>
            </div>
            <div class="footer">
                &copy; 2026 Kiaantechnology SportMatrix · Support: <a href="mailto:support@kiaantechnology.com" style="color: #16a34a;">support@kiaantechnology.com</a>
            </div>
        </div>
    </body>
    </html>
    `;

    return sendBrevoEmail({
        to: [{ email: recipientEmail, name: recipientName || 'User' }],
        subject: `🔑 Password Reset Request - SportMatrix`,
        htmlContent
    });
};

/**
 * 3. Contact Us Inquiry Email (Sent to support@kiaantechnology.com + Confirmation to User)
 */
const sendContactInquiryEmail = async ({ name, email, subject, message, ticketId }) => {
    const supportEmail = process.env.SUPPORT_EMAIL || 'support@kiaantechnology.com';

    // Email 1: Notification sent TO Support Team (support@kiaantechnology.com)
    const adminNotificationHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: 'Segoe UI', Roboto, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; color: #1e293b; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 24px; border: 1px solid #e2e8f0; }
            .header { border-bottom: 2px solid #16a34a; padding-bottom: 12px; margin-bottom: 20px; }
            .field { margin-bottom: 14px; }
            .label { font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; }
            .value { font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 2px; }
            .msg-box { background: #f8fafc; border: 1px solid #cbd5e1; padding: 16px; border-radius: 10px; font-size: 13px; color: #334155; margin-top: 8px; line-height: 1.5; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <span style="font-size: 11px; font-weight: 900; color: #16a34a; text-transform: uppercase; background: #dcfce7; padding: 4px 10px; border-radius: 12px;">NEW WEBSITE CONTACT INQUIRY</span>
                <h2 style="margin: 8px 0 0 0; font-size: 18px;">Ticket [${ticketId || 'TKT-NEW'}]</h2>
            </div>
            
            <div class="field">
                <div class="label">Full Name:</div>
                <div class="value">${name}</div>
            </div>
            <div class="field">
                <div class="label">Email Address:</div>
                <div class="value"><a href="mailto:${email}" style="color: #16a34a;">${email}</a></div>
            </div>
            <div class="field">
                <div class="label">Subject:</div>
                <div class="value">${subject || 'General Inquiry'}</div>
            </div>
            <div class="field">
                <div class="label">Message Details:</div>
                <div class="msg-box">${(message || 'No message provided.').replace(/\n/g, '<br/>')}</div>
            </div>
        </div>
    </body>
    </html>
    `;

    // Dispatch to support@kiaantechnology.com
    await sendBrevoEmail({
        to: [{ email: supportEmail, name: 'Kiaantechnology Support Team' }],
        subject: `📩 [Contact Inquiry] ${subject || 'New Message'} - from ${name}`,
        htmlContent: adminNotificationHtml
    });

    // Email 2: Automatic Confirmation sent to User
    const userConfirmationHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: 'Segoe UI', Roboto, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; color: #334155; }
            .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 28px; border: 1px solid #e2e8f0; }
            .btn { display: inline-block; background: #16a34a; color: #ffffff !important; font-weight: 800; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-size: 13px; }
        </style>
    </head>
    <body>
        <div class="container">
            <h3 style="color: #16a34a; margin-top: 0;">Message Received!</h3>
            <p>Hello <strong>${name}</strong>,</p>
            <p>Thank you for contacting <strong>SportMatrix by Kiaantechnology</strong>! We have received your inquiry ticket <strong>#${ticketId}</strong>.</p>
            <p>Our team will review your message and get back to you within 24 business hours at <strong>${email}</strong>.</p>
            
            <div style="background: #f8fafc; padding: 14px; border-radius: 10px; font-size: 13px; margin: 18px 0;">
                <strong>Subject:</strong> ${subject || 'General Inquiry'}<br/>
                <strong>Message:</strong> ${message}
            </div>

            <p style="font-size: 12px; color: #94a3b8;">If you need urgent assistance, write to us directly at <a href="mailto:support@kiaantechnology.com" style="color: #16a34a;">support@kiaantechnology.com</a>.</p>
        </div>
    </body>
    </html>
    `;

    return sendBrevoEmail({
        to: [{ email, name }],
        subject: `✅ We received your inquiry [${ticketId}] - SportMatrix Support`,
        htmlContent: userConfirmationHtml
    });
};

module.exports = {
    sendBrevoEmail,
    sendTurfAdminCredentialsEmail,
    sendForgotPasswordEmail,
    sendContactInquiryEmail
};
