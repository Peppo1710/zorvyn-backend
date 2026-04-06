const { pool } = require('../../config/db');
const { canViewUserById, canUpdateUser } = require('../../policies/userPolicy');

const getMe = async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, email, role, status, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Not Found', message: 'User not found' });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!canViewUserById(req.user, id)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to view this user',
      });
    }
    const result = await pool.query(
      'SELECT id, email, role, status, created_at FROM users WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Not Found', message: 'User not found' });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

const listUsers = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const [users, count] = await Promise.all([
      pool.query(
        'SELECT id, email, role, status, created_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
        [limit, offset]
      ),
      pool.query('SELECT COUNT(*)::int AS c FROM users'),
    ]);

    res.status(200).json({
      data: users.rows,
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

const updateUser = async (req, res, next) => {
  const client = await pool.connect();
  try {
    if (!canUpdateUser(req.user)) {
      client.release();
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to update users',
      });
    }

    const { id } = req.params;
    const { role, status } = req.body;

    if (!role && !status) {
      client.release();
      return res.status(400).json({
        error: 'Invalid input',
        message: 'At least one of role or status must be provided',
      });
    }

    await client.query('BEGIN');

    const existing = await client.query(
      'SELECT id, email, role, status, created_at FROM users WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(404).json({ error: 'Not Found', message: 'User not found' });
    }

    const updated = await client.query(
      `UPDATE users
       SET role = COALESCE($1, role),
           status = COALESCE($2, status)
       WHERE id = $3
       RETURNING id, email, role, status, created_at`,
      [role ?? null, status ?? null, id]
    );

    await client.query(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id)
       VALUES ($1, $2, $3, $4)`,
      [req.user.id, 'UPDATE', 'user', id]
    );

    await client.query('COMMIT');
    client.release();

    res.status(200).json(updated.rows[0]);
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {
      // ignore rollback error
    }
    client.release();
    next(error);
  }
};

module.exports = {
  getMe,
  getUserById,
  listUsers,
  updateUser,
};
