const cron = require('node-cron');
const { pool } = require('../config/db');
const logger = require('../utils/logger');

async function runCleanup() {
  logger.info('[CRON] Running daily cleanup job...');
  const result = await pool.query(`
    DELETE FROM records
    WHERE is_deleted = true
    AND deleted_at < NOW() - INTERVAL '30 days'
  `);
  logger.info(`[CRON] Cleanup complete. Removed ${result.rowCount} old deleted records.`);
}

async function runAnalyticsSnapshot() {
  logger.info('[CRON] Running analytics snapshot job...');
  const summary = await pool.query(`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0)::numeric(14,2) AS total_income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)::numeric(14,2) AS total_expenses,
      COUNT(*)::int AS record_count
    FROM records
    WHERE is_deleted = false
  `);

  const row = summary.rows[0];
  const totalIncome = parseFloat(row.total_income);
  const totalExpenses = parseFloat(row.total_expenses);
  const netBalance = totalIncome - totalExpenses;

  const categories = await pool.query(`
    SELECT category, SUM(amount)::numeric(14,2) AS total
    FROM records
    WHERE is_deleted = false
    GROUP BY category
  `);

  const payload = {
    categoryBreakdown: categories.rows.map((r) => ({
      category: r.category,
      total: parseFloat(r.total),
    })),
  };

  const today = new Date().toISOString().slice(0, 10);

  await pool.query(
    `INSERT INTO analytics_snapshots
      (snapshot_date, total_income, total_expenses, net_balance, record_count, payload)
     VALUES ($1::date, $2, $3, $4, $5, $6::jsonb)
     ON CONFLICT (snapshot_date) DO UPDATE SET
       total_income = EXCLUDED.total_income,
       total_expenses = EXCLUDED.total_expenses,
       net_balance = EXCLUDED.net_balance,
       record_count = EXCLUDED.record_count,
       payload = EXCLUDED.payload,
       created_at = CURRENT_TIMESTAMP`,
    [today, totalIncome, totalExpenses, netBalance, row.record_count, JSON.stringify(payload)]
  );

  logger.info('[CRON] Analytics snapshot stored for ' + today);
}

async function runKeepAlive() {
  logger.info('[CRON] Running Supabase DB keep-alive ping...');
  await pool.query('SELECT 1');
  logger.info('[CRON] Supabase DB keep-alive ping complete.');
}

// Daily at midnight UTC: cleanup then analytics
cron.schedule('0 0 * * *', async () => {
  try {
    await runCleanup();
  } catch (error) {
    logger.error('[CRON] Cleanup job failed:', error);
  }
  try {
    await runAnalyticsSnapshot();
  } catch (error) {
    logger.error('[CRON] Analytics snapshot job failed:', error);
  }
});

// Keep-alive for Supabase DB (runs every 12 hours to prevent pausing)
cron.schedule('0 */12 * * *', async () => {
  try {
    await runKeepAlive();
  } catch (error) {
    logger.error('[CRON] Keep-alive job failed:', error);
  }
});

module.exports = {
  runCleanup,
  runAnalyticsSnapshot,
  runKeepAlive,
};
