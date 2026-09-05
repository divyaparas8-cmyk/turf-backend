const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'turf_db'
};

async function testBranch() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Inserting test branch into MySQL DB...');

        const branchId = `br_${Date.now()}`;
        const ownerId = 'own_1787307283568_547'; // Aman chouhan

        await connection.query(`
            INSERT INTO branches (
                id, branch_name, branch_code, description, owner_id, subscription_plan_id,
                city, full_address, email, mobile, price_per_hour, status
            ) VALUES (
                ?, 'Indore Strikers Arena', 'GA-IND-01', 'Premier synthetic turf venue in Vijay Nagar',
                ?, 'plan_starter', 'Indore', 'Vijay Nagar, Indore', 'aman@gmail.com', '2345234566', 1200, 'ACTIVE'
            )
        `, [branchId, ownerId]);

        await connection.query(`
            INSERT INTO owner_subscriptions (
                id, owner_id, plan_id, plan_name, amount, billing_cycle,
                status, payment_status, payment_method, transaction_id, start_date, end_date
            ) VALUES (
                ?, ?, 'plan_starter', 'Starter Plan', 1000.00, 'MONTHLY',
                'ACTIVE', 'COMPLETED', 'ONLINE', 'TXN_TEST_01', NOW(), DATE_ADD(NOW(), INTERVAL 1 MONTH)
            )
        `, [`sub_${Date.now()}`, ownerId]);

        console.log('✅ Test branch and owner subscription inserted successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Error inserting test branch:', err.message);
        process.exit(1);
    }
}

testBranch();
