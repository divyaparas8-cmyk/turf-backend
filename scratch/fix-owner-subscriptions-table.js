const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'turf_db'
};

async function fixOwnerSubscriptionsTable() {
    let connection;
    try {
        console.log('Connecting to MySQL database to fix owner_subscriptions columns...');
        connection = await mysql.createConnection(dbConfig);

        const alterQueries = [
            `ALTER TABLE owner_subscriptions ADD COLUMN IF NOT EXISTS plan_name VARCHAR(100) DEFAULT 'Starter Plan';`,
            `ALTER TABLE owner_subscriptions ADD COLUMN IF NOT EXISTS amount DECIMAL(10,2) DEFAULT 1000.00;`,
            `ALTER TABLE owner_subscriptions ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'COMPLETED';`,
            `ALTER TABLE owner_subscriptions ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'ONLINE';`,
            `ALTER TABLE owner_subscriptions ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(100);`
        ];

        for (const q of alterQueries) {
            try {
                await connection.query(q);
            } catch (err) {
                console.log('Note:', err.message);
            }
        }

        console.log('✅ owner_subscriptions table columns verified/added successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Error fixing owner_subscriptions table:', err.message);
        process.exit(1);
    }
}

fixOwnerSubscriptionsTable();
