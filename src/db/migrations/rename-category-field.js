const { db } = require('../db');

async function migrateColumnName() {
    try {
        await db.query('ALTER TABLE categories RENAME COLUMN categoryid TO "categoryId"');
        console.log('Successfully renamed column from categoryid to categoryId');
    } catch (error) {
        console.error('Error during migration:', error);
    } finally {
        await db.close();
    }
}

migrateColumnName();