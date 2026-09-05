const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'turf_db'
};

async function debugBranchRevenue() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);

        // Check exact query that getBranches uses
        const [rows] = await connection.query(`
            SELECT b.id, b.branch_name, b.subscription_plan_id,
                   COALESCE(o.full_name, u.name, 'Turf Owner') as owner_full_name,
                   COALESCE(p.plan_name, 'Starter Plan') as plan_name,
                   COALESCE(p.monthly_price, 0) as plan_price,
                   (SELECT COALESCE(SUM(amount), 0) FROM bookings WHERE branch_id = b.id AND status IN ('CONFIRMED', 'COMPLETED')) as booking_revenue
            FROM branches b
            LEFT JOIN owners o ON (b.owner_id = o.id OR b.owner_id = o.user_id)
            LEFT JOIN users u ON (b.owner_id = u.id)
            LEFT JOIN subscription_plans p ON b.subscription_plan_id = p.id
            WHERE 1=1
            ORDER BY b.created_at DESC
        `);

        console.log('\n--- BRANCH REVENUE DEBUG ---');
        rows.forEach(r => {
            console.log(`Branch: ${r.branch_name}`);
            console.log(`  subscription_plan_id: ${r.subscription_plan_id}`);
            console.log(`  plan_name: ${r.plan_name}`);
            console.log(`  plan_price (raw): ${r.plan_price}`);
            console.log(`  booking_revenue: ${r.booking_revenue}`);
            console.log(`  computedRevenue: ${Number(r.plan_price || 0) + Number(r.booking_revenue || 0)}`);
            console.log('');
        });

        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

debugBranchRevenue();
