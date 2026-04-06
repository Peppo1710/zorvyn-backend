const { pool } = require('../../config/db');

const listAuditLogs = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const offset = (page - 1) * limit;

    const [logs, count] = await Promise.all([
      pool.query(
        `SELECT al.id, al.user_id, al.action, al.resource_type, al.resource_id, al.timestamp,
                u.email AS user_email
         FROM audit_logs al
         LEFT JOIN users u ON u.id = al.user_id
         ORDER BY al.timestamp DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      pool.query('SELECT COUNT(*)::int AS c FROM audit_logs'),
    ]);

    res.status(200).json({
      data: logs.rows,
      meta: {
        total: count.rows[0].c,
        page,
        limit,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listAuditLogs,
};
