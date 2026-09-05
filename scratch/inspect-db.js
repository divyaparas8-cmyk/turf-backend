const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'turf_db'
};

async function inspectDb() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('=== MYSQL DB INSPECTION ===');

        const [users] = await connection.query('SELECT id, name, email, role FROM users');
        console.log('\n--- USERS ---', users);

        const [owners] = await connection.query('SELECT id, full_name, email, business_name FROM owners');
        console.log('\n--- OWNERS ---', owners);

        const [branches] = await connection.query('SELECT id, branch_name, branch_code, owner_id, subscription_plan_id, status FROM branches');
        console.log('\n--- BRANCHES ---', branches);

        const [plans] = await connection.query('SELECT id, plan_name, monthly_price FROM subscription_plans');
        console.log('\n--- SUBSCRIPTION PLANS ---', plans);

        const [subscriptions] = await connection.query('SELECT * FROM owner_subscriptions');
        console.log('\n--- OWNER SUBSCRIPTIONS ---', subscriptions);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

inspectDb();
