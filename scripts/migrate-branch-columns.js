const db = require('../src/config/db');

async function migrateBranchColumns() {
  try {
    const columns = [
      "ADD COLUMN price_per_hour INT DEFAULT 1000",
      "ADD COLUMN opening_time VARCHAR(50) DEFAULT '06:00 AM'",
      "ADD COLUMN closing_time VARCHAR(50) DEFAULT '11:00 PM'",
      "ADD COLUMN turf_size VARCHAR(100) DEFAULT '5,000 Sq.Ft'",
      "ADD COLUMN surface_type VARCHAR(150) DEFAULT 'TurfPro Synthetic Arena'",
      "ADD COLUMN sports TEXT",
      "ADD COLUMN amenities TEXT",
      "ADD COLUMN discount_offer VARCHAR(100) DEFAULT '20% OFF FIRST MATCH'",
      "ADD COLUMN coupon_code VARCHAR(50) DEFAULT 'CRICKET20'"
    ];

    for (const col of columns) {
      try {
        await db.query(`ALTER TABLE branches ${col}`);
        console.log(`✅ Applied migration: ${col}`);
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
          console.log(`ℹ️ Column already exists, skipping: ${col.split(' ')[2]}`);
        } else {
          console.warn(`⚠️ Migration notice:`, err.message);
        }
      }
    }

    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

migrateBranchColumns();
