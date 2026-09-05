const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'turf_db'
};

async function deleteBranches() {
    let connection;
    try {
        console.log('Connecting to MySQL database to clear branches...');
        connection = await mysql.createConnection(dbConfig);

        await connection.query('SET FOREIGN_KEY_CHECKS = 0;');

        console.log('Truncating branches table...');
        await connection.query('TRUNCATE TABLE branches;');

        console.log('Truncating crm_leads, corporate_bookings, advertisements, discounts...');
        await connection.query('TRUNCATE TABLE crm_leads;');
        await connection.query('TRUNCATE TABLE corporate_bookings;');
        await connection.query('TRUNCATE TABLE advertisements;');
        await connection.query('TRUNCATE TABLE discount_offers;');

        await connection.query('SET FOREIGN_KEY_CHECKS = 1;');

        console.log('\n✅ All branch data successfully deleted from MySQL database!');
        console.log('Now Branch Management will start with 0 branches so you can add fresh real branches.');
        process.exit(0);
    } catch (error) {
        console.error('Error deleting branches:', error.message);
        process.exit(1);
    }
}

deleteBranches();
