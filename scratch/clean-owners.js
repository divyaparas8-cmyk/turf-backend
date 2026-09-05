const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'turf_db'
};

async function cleanOwners() {
    let connection;
    try {
        console.log('Connecting to MySQL database to clean owners...');
        connection = await mysql.createConnection(dbConfig);

        await connection.query('SET FOREIGN_KEY_CHECKS = 0;');

        console.log('Truncating owners table...');
        await connection.query('TRUNCATE TABLE owners;');

        console.log('Cleaning demo non-superadmin users from users table...');
        await connection.query("DELETE FROM users WHERE role != 'SUPER_ADMIN';");

        await connection.query('SET FOREIGN_KEY_CHECKS = 1;');

        console.log('\n✅ Owners database table cleaned successfully!');
        console.log('Only Super Admin account retained for system login.');
        process.exit(0);
    } catch (error) {
        console.error('Error cleaning owners:', error.message);
        process.exit(1);
    }
}

cleanOwners();
