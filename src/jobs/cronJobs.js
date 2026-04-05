const cron = require('node-cron');
const { pool } = require('../config/db');

// Run everyday at midnight
cron.schedule('0 0 * * *', async () => {
  console.log('[CRON] Running daily cleanup job...');
  try {
    // Delete records that were soft-deleted more than 30 days ago
    const result = await pool.query(`
      DELETE FROM records 
      WHERE is_deleted = true 
      AND deleted_at < NOW() - INTERVAL '30 days'
    `);
    console.log(`[CRON] Cleanup complete. Removed ${result.rowCount} old deleted records.`);
  } catch (error) {
    console.error('[CRON] Cleanup job failed:', error);
  }
});
