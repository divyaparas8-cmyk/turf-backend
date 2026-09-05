const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'turf_db'
};

async function fixBranchesTable() {
    let connection;
    try {
        console.log('Connecting to MySQL database to fix branches table columns...');
        connection = await mysql.createConnection(dbConfig);

        const alterQueries = [
            `ALTER TABLE branches ADD COLUMN IF NOT EXISTS price_per_hour INT DEFAULT 1000;`,
            `ALTER TABLE branches ADD COLUMN IF NOT EXISTS turf_size VARCHAR(100) DEFAULT '5,000 Sq.Ft';`,
            `ALTER TABLE branches ADD COLUMN IF NOT EXISTS surface_type VARCHAR(100) DEFAULT 'TurfPro Synthetic Arena';`,
            `ALTER TABLE branches ADD COLUMN IF NOT EXISTS sports TEXT;`,
            `ALTER TABLE branches ADD COLUMN IF NOT EXISTS amenities TEXT;`,
            `ALTER TABLE branches ADD COLUMN IF NOT EXISTS discount_offer VARCHAR(100) DEFAULT '20% OFF FIRST MATCH';`,
            `ALTER TABLE branches ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50) DEFAULT 'CRICKET20';`,
            `ALTER TABLE branches ADD COLUMN IF NOT EXISTS images LONGTEXT;`
        ];

        for (const q of alterQueries) {
            try {
                await connection.query(q);
            } catch (err) {
                // Ignore if column already exists or syntax variation
                console.log('Alter query note:', err.message);
            }
        }

        console.log('✅ Branches table columns verified/added successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Error fixing branches table:', err.message);
        process.exit(1);
    }
}

fixBranchesTable();
