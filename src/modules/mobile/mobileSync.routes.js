const express = require('express');
const router = express.Router();

// In-Memory store for Mobile Controller Sessions & Action Queues
const sessions = new Map();

/**
 * Mobile device pushes an action or connection notification
 * POST /api/v1/mobile-sync/push
 */
router.post('/push', (req, res) => {
    const { sessionId, type, actionType, payload, deviceInfo } = req.body;

    if (!sessionId) {
        return res.status(400).json({ success: false, message: 'sessionId is required' });
    }

    if (!sessions.has(sessionId)) {
        sessions.set(sessionId, {
            status: 'waiting',
            deviceInfo: null,
            events: [],
            lastActivity: Date.now()
        });
    }

    const sess = sessions.get(sessionId);
    sess.lastActivity = Date.now();

    if (type === 'MOBILE_CONNECTED') {
        sess.status = 'connected';
        if (deviceInfo) sess.deviceInfo = deviceInfo;
    } else if (type === 'MOBILE_DISCONNECT') {
        sess.status = 'disconnected';
    }

    // Append event for desktop to read
    const eventObj = {
        id: Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        type,
        actionType,
        payload,
        deviceInfo,
        timestamp: Date.now()
    };

    sess.events.push(eventObj);

    // Keep queue small (max 50 events)
    if (sess.events.length > 50) {
        sess.events = sess.events.slice(-50);
    }

    return res.status(200).json({
        success: true,
        message: 'Action synced successfully',
        status: sess.status
    });
});

/**
 * Desktop Console polls for updates on session
 * GET /api/v1/mobile-sync/poll/:sessionId?since=timestamp
 */
router.get('/poll/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const since = parseInt(req.query.since || '0', 10);

    if (!sessions.has(sessionId)) {
        return res.status(200).json({
            success: true,
            status: 'waiting',
            events: [],
            deviceInfo: null
        });
    }

    const sess = sessions.get(sessionId);
    const newEvents = sess.events.filter(e => e.timestamp > since);

    return res.status(200).json({
        success: true,
        status: sess.status,
        deviceInfo: sess.deviceInfo,
        events: newEvents,
        serverTime: Date.now()
    });
});

/**
 * Cleanup expired sessions older than 30 mins
 */
setInterval(() => {
    const now = Date.now();
    for (const [id, sess] of sessions.entries()) {
        if (now - sess.lastActivity > 1800000) {
            sessions.delete(id);
        }
    }
}, 300000);

module.exports = router;
