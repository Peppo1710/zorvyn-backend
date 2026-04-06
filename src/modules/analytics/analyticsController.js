const { pool } = require('../../config/db');
const { generateInsight } = require('../../services/insightService');

const getDashboardStats = async (req, res, next) => {
  try {
    let queryArgs = [];
    let queryConditions = ['is_deleted = false'];

    // If viewer, only get their own data. Analyst/admin can see full system data (or perhaps need filter by user).
    // For this implementation, viewer sees own, others see all, but this can be adjusted.
    if (req.user.role === 'viewer') {
      queryConditions.push(`user_id = $1`);
      queryArgs.push(req.user.id);
    }

    const whereClause = `WHERE ${queryConditions.join(' AND ')}`;

    // Get Total Income and Expenses
    const summaryQuery = await pool.query(
      `SELECT type, SUM(amount) as total FROM records ${whereClause} GROUP BY type`,
      queryArgs
    );

    let totalIncome = 0;
    let totalExpenses = 0;

    summaryQuery.rows.forEach(row => {
      if (row.type === 'income') totalIncome += parseFloat(row.total);
      if (row.type === 'expense') totalExpenses += parseFloat(row.total);
    });

    const netBalance = totalIncome - totalExpenses;

    // Get Category Breakdown
    const categoryQuery = await pool.query(
      `SELECT category, SUM(amount) as total FROM records ${whereClause} GROUP BY category`,
      queryArgs
    );
    const categoryBreakdown = categoryQuery.rows.map(r => ({
      category: r.category,
      total: parseFloat(r.total)
    }));

    // Monthly trends (for the current year, for simplicity grouped by YYYY-MM)
    const trendsQuery = await pool.query(
      `SELECT to_char(date, 'YYYY-MM') as month, type, SUM(amount) as total 
       FROM records ${whereClause} 
       GROUP BY 1, 2 ORDER BY 1 ASC`,
      queryArgs
    );
    
    // Process trends
    const monthlyTrends = {};
    trendsQuery.rows.forEach(row => {
      if (!monthlyTrends[row.month]) {
        monthlyTrends[row.month] = { income: 0, expense: 0 };
      }
      if (row.type === 'income') monthlyTrends[row.month].income += parseFloat(row.total);
      if (row.type === 'expense') monthlyTrends[row.month].expense += parseFloat(row.total);
    });

    res.status(200).json({
      summary: {
        totalIncome,
        totalExpenses,
        netBalance,
      },
      categoryBreakdown,
      monthlyTrends
    });
  } catch (error) {
    next(error);
  }
};

const getInsights = async (req, res, next) => {
  try {
    let queryArgs = [];
    let queryConditions = ['is_deleted = false'];
    if (req.user.role === 'viewer') {
      queryConditions.push(`user_id = $1`);
      queryArgs.push(req.user.id);
    }

    const whereClause = `WHERE ${queryConditions.join(' AND ')}`;

    // Quick fetch for summary
    const summaryQuery = await pool.query(
      `SELECT type, SUM(amount) as total FROM records ${whereClause} GROUP BY type`,
      queryArgs
    );

    let totalIncome = 0;
    let totalExpenses = 0;
    summaryQuery.rows.forEach(row => {
      if (row.type === 'income') totalIncome += parseFloat(row.total);
      if (row.type === 'expense') totalExpenses += parseFloat(row.total);
    });

    const categoryQuery = await pool.query(
      `SELECT category, SUM(amount) as total FROM records ${whereClause} GROUP BY category`,
      queryArgs
    );

    const financialData = {
      summary: {
        totalIncome,
        totalExpenses,
        netBalance: totalIncome - totalExpenses
      },
      categoryBreakdown: categoryQuery.rows.map(r => ({ category: r.category, total: parseFloat(r.total) }))
    };

    const insightStr = await generateInsight(financialData);

    res.status(200).json({ insights: insightStr });
  } catch (error) {
    // Return the specific error message from the insight service
    res.status(500).json({
      error: 'Error',
      message: error.message || 'Unable to generate insights at this time.',
    });
  }
};

module.exports = {
  getDashboardStats,
  getInsights
};
