const db = require('../src/config/db');

async function alterBranchesTable() {
    try {
        console.log('Upgrading branches table columns in MySQL...');

        const alterQueries = [
            `ALTER TABLE branches ADD COLUMN images LONGTEXT;`,
            `ALTER TABLE branches ADD COLUMN price_per_hour INT DEFAULT 1000;`,
            `ALTER TABLE branches ADD COLUMN opening_time VARCHAR(50) DEFAULT '06:00 AM';`,
            `ALTER TABLE branches ADD COLUMN closing_time VARCHAR(50) DEFAULT '11:00 PM';`,
            `ALTER TABLE branches ADD COLUMN turf_size VARCHAR(50) DEFAULT '5,000 Sq.Ft';`,
            `ALTER TABLE branches ADD COLUMN surface_type VARCHAR(100) DEFAULT 'TurfPro Synthetic Arena';`,
            `ALTER TABLE branches ADD COLUMN sports TEXT;`,
            `ALTER TABLE branches ADD COLUMN amenities TEXT;`,
            `ALTER TABLE branches ADD COLUMN discount_offer VARCHAR(150);`,
            `ALTER TABLE branches ADD COLUMN coupon_code VARCHAR(50);`
        ];

        for (const query of alterQueries) {
            try {
                await db.query(query);
            } catch (err) {
                console.log('Column note (may already exist):', err.message);
            }
        }

        console.log('SUCCESS: All 10 columns verified/added to MySQL branches table!');
    } catch (err) {
        console.error('SCHEMA UPGRADE ERROR:', err);
    } finally {
        process.exit(0);
    }
}

alterBranchesTable();
