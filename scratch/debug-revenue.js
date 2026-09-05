const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'turf_db'
};

async function debugRevenue() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);

        // Test 1: Check branches and their plan IDs
        const [branches] = await connection.query(`
            SELECT b.id, b.branch_name, b.subscription_plan_id, b.status FROM branches b
        `);
        console.log('\n--- BRANCHES ---');
        branches.forEach(b => console.log(b.branch_name, '| plan_id:', b.subscription_plan_id, '| status:', b.status));

        // Test 2: Check subscription_plans
        const [plans] = await connection.query(`SELECT id, plan_name, monthly_price FROM subscription_plans`);
        console.log('\n--- PLANS ---');
        plans.forEach(p => console.log(p.id, '|', p.plan_name, '| price:', p.monthly_price));

        // Test 3: The exact dashboard revenue query
        const [result] = await connection.query(`
            SELECT 
                COALESCE(SUM(sp.monthly_price), 0) as total,
                COUNT(b.id) as count
            FROM branches b
            LEFT JOIN subscription_plans sp ON b.subscription_plan_id = sp.id
            WHERE b.status = 'ACTIVE'
        `);
        console.log('\n--- REVENUE QUERY RESULT ---');
        console.log('Total Revenue:', result[0].total);
        console.log('Active Count:', result[0].count);

        // Test 4: Check the JOIN is working
        const [joinCheck] = await connection.query(`
            SELECT b.branch_name, b.subscription_plan_id, sp.plan_name, sp.monthly_price
            FROM branches b
            LEFT JOIN subscription_plans sp ON b.subscription_plan_id = sp.id
            WHERE b.status = 'ACTIVE'
        `);
        console.log('\n--- JOIN CHECK ---');
        joinCheck.forEach(r => console.log(r.branch_name, '|', r.subscription_plan_id, '->', r.plan_name, '|', r.monthly_price));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

debugRevenue();
