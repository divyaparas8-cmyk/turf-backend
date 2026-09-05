const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'turf_db'
};

async function insertSub() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        await connection.query(`
            INSERT INTO owner_subscriptions (
                id, owner_id, plan_id, plan_name, amount, billing_cycle,
                status, payment_status, payment_method, transaction_id, start_date, end_date
            ) VALUES (
                ?, 'own_1787307283568_547', 'plan_starter', 'Starter Plan', 1000.00, 'MONTHLY',
                'ACTIVE', 'COMPLETED', 'ONLINE', 'TXN_STARTER_01', NOW(), DATE_ADD(NOW(), INTERVAL 1 MONTH)
            )
        `, [`sub_${Date.now()}`]);
        console.log('✅ Subscription inserted!');
        process.exit(0);
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
}
insertSub();
