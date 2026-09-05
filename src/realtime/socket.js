/**
 * Real-time push layer (Socket.IO). Rooms are scoped by role/branch/user so
 * each dashboard only receives events relevant to it:
 *   - `role:SUPER_ADMIN`            -- platform-wide events
 *   - `branch:{branchId}`           -- Owner + Staff of that branch
 *   - `user:{userId}`               -- Customer/Umpire's own events
 * Auth reuses the same JWT the REST API already trusts -- no separate auth
 * scheme, no fabricated identity.
 */
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'sportmatrix_jwt_secret_key_2026';

let io = null;

function initSocket(httpServer) {
    io = new Server(httpServer, {
        cors: { origin: '*', methods: ['GET', 'POST'] }
    });

    io.use((socket, next) => {
        const token = socket.handshake.auth?.token || socket.handshake.query?.token;
        if (token) {
            try {
                socket.user = jwt.verify(token, JWT_SECRET);
            } catch (e) {
                socket.user = { id: 'guest', role: 'GUEST' };
            }
        } else {
            socket.user = { id: 'guest', role: 'GUEST' };
        }
        return next();
    });

    io.on('connection', (socket) => {
        const user = socket.user || {};
        if (user.id && user.id !== 'guest') socket.join(`user:${user.id}`);
        if (user.role === 'SUPER_ADMIN') socket.join('role:SUPER_ADMIN');
        if (user.branchId) socket.join(`branch:${user.branchId}`);

        // Owner/Staff/Guest join every branch they're scoped to
        socket.on('join-branch', (branchId) => {
            if (branchId) {
                socket.join(`branch:${branchId}`);
            }
        });
    });

    return io;
}

function getIo() {
    return io;
}

/** Emit to everyone scoped to a branch (its Owner + Staff). */
function emitToBranch(branchId, event, payload) {
    if (io && branchId) io.to(`branch:${branchId}`).emit(event, payload);
}

/** Emit to a specific user (Customer/Umpire's own dashboard). */
function emitToUser(userId, event, payload) {
    if (io && userId) io.to(`user:${userId}`).emit(event, payload);
}

/** Emit to every connected Super Admin. */
function emitToSuperAdmins(event, payload) {
    if (io) io.to('role:SUPER_ADMIN').emit(event, payload);
}

module.exports = { initSocket, getIo, emitToBranch, emitToUser, emitToSuperAdmins };
