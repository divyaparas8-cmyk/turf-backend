const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'turf_db'
};

async function cleanTestData() {
    let connection;
    try {
        console.log('Connecting to MySQL database for cleanup...');
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected successfully.');

        await connection.query('SET FOREIGN_KEY_CHECKS = 0;');

        // Clean test transaction tables
        console.log('Cleaning payments table...');
        await connection.query('TRUNCATE TABLE payments;');

        console.log('Cleaning bookings table...');
        await connection.query('TRUNCATE TABLE bookings;');

        console.log('Cleaning owner_subscriptions table...');
        await connection.query('TRUNCATE TABLE owner_subscriptions;');

        console.log('Cleaning slots table...');
        await connection.query('TRUNCATE TABLE slots;');

        console.log('Cleaning branch_sports table...');
        await connection.query('TRUNCATE TABLE branch_sports;');

        await connection.query('SET FOREIGN_KEY_CHECKS = 1;');

        console.log('\n✅ Database test data cleaned successfully!');
        console.log('Tables payments, bookings, owner_subscriptions, slots, branch_sports reset to empty.');
        process.exit(0);
    } catch (error) {
        console.error('Error cleaning database:', error.message);
        process.exit(1);
    }
}

cleanTestData();
