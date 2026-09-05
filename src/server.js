require('dotenv').config();
const http = require('http');
const app = require('./app');
const prisma = require('./config/prisma');
const { initSocket } = require('./realtime/socket');

const PORT = process.env.PORT || 5000;

async function startServer() {
    try {
        console.log('--- SportMatrix Server Boot Sequence ---');

        // Verify Prisma can reach the database. Schema changes are applied via
        // `npm run db:push` / `npm run db:migrate`, not on server boot.
        try {
            await prisma.$connect();
            console.log('Database connection verified via Prisma.');
        } catch (dbErr) {
            console.error('\n===============================================================');
            console.error('⚠️  DATABASE CONNECTION FAILED');
            console.error('===============================================================');
            console.error(`Error: ${dbErr.message}`);
            console.error('👉 Please check your MySQL setup:');
            console.error('1. Make sure MySQL service (XAMPP / MySQL Workbench / Service) is RUNNING.');
            console.error('2. Check DATABASE_URL / DB_HOST / DB_PASSWORD in "turf Backend/.env".');
            console.error('3. Run "npm run db:push" to sync the database schema.');
            console.error('===============================================================\n');
            process.exit(1);
        }

        const httpServer = http.createServer(app);
        initSocket(httpServer);

        const server = httpServer.listen(PORT, () => {
            console.log(`Server successfully started listening on port ${PORT}`);
            console.log(`Health check URL: http://localhost:${PORT}/api/v1/health`);
            console.log('Socket.IO real-time layer active.');
            console.log('----------------------------------------');
        });

        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.log(`\n===============================================================`);
                console.log(`ℹ️  Backend server is ALREADY RUNNING and active on port ${PORT}.`);
                console.log(`===============================================================\n`);
                process.exit(0);
            }
        });

        const shutdown = () => {
            server.close(() => {
                prisma.$disconnect().catch(() => {});
                process.exit(0);
            });
        };
        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);
    } catch (error) {
        console.error('Server startup halted due to errors:', error);
        process.exit(1);
    }
}

startServer();
