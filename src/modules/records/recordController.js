const { pool } = require('../../config/db');
const { canReadRecord, canUpdateRecord, canDeleteRecord } = require('../../policies/recordPolicy');
const { logAction } = require('../audit/auditService');

const createRecord = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { amount, type, category, date, notes } = req.body;

    await client.query('BEGIN');

    const newRecord = await client.query(
      `INSERT INTO records (user_id, amount, type, category, date, notes) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.user.id, amount, type, category, date, notes]
    );

    await client.query(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id)
       VALUES ($1, $2, $3, $4)`,
      [req.user.id, 'CREATE', 'record', newRecord.rows[0].id]
    );

    await client.query('COMMIT');
    client.release();

    res.status(201).json(newRecord.rows[0]);
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

const getRecords = async (req, res, next) => {
  try {
    const { search, category, type, startDate, endDate, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    let queryArgs = [limit, offset];
    let queryConditions = ['is_deleted = false'];
    
    if (req.user.role === 'viewer') {
      queryConditions.push(`user_id = $${queryArgs.length + 1}`);
      queryArgs.push(req.user.id);
    } // Admins and analysts see all

    if (search) {
      queryConditions.push(`(category ILIKE $${queryArgs.length + 1} OR notes ILIKE $${queryArgs.length + 1})`);
      queryArgs.push(`%${search}%`);
    }

    if (category) {
      queryConditions.push(`category = $${queryArgs.length + 1}`);
      queryArgs.push(category);
    }

    if (type) {
      queryConditions.push(`type = $${queryArgs.length + 1}`);
      queryArgs.push(type);
    }

    if (startDate && endDate) {
      queryConditions.push(`date >= $${queryArgs.length + 1} AND date <= $${queryArgs.length + 2}`);
      queryArgs.push(startDate, endDate);
    }

    const whereClause = queryConditions.length > 0 ? `WHERE ${queryConditions.join(' AND ')}` : '';

    const recordsQuery = await pool.query(
      `SELECT * FROM records ${whereClause} ORDER BY date DESC LIMIT $1 OFFSET $2`,
      queryArgs
    );

    const countQueryArgs = [...queryArgs].slice(2);
    const countQueryConditions = [...queryConditions];
    
    // adjust positional params since we removed limit and offset
    const adjustedCountConditions = countQueryConditions.map(cond => {
      let condMod = cond;
      for (let i = queryArgs.length; i >= 3; i--) {
         condMod = condMod.replace(`$${i}`, `$${i-2}`);
      }
      return condMod;
    });

    const countClause = adjustedCountConditions.length > 0 ? `WHERE ${adjustedCountConditions.join(' AND ')}` : '';
    
    const countQuery = await pool.query(`SELECT COUNT(*) FROM records ${countClause}`, countQueryArgs);

    res.status(200).json({
      data: recordsQuery.rows,
      meta: {
        total: parseInt(countQuery.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit),
      }
    });

  } catch (error) {
    next(error);
  }
};

const getRecordById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const record = await pool.query('SELECT * FROM records WHERE id = $1 AND is_deleted = false', [id]);
    
    if (record.rows.length === 0) {
      return res.status(404).json({ error: 'Not Found', message: 'Record not found' });
    }

    if (!canReadRecord(req.user, record.rows[0])) {
      return res.status(403).json({ error: 'Forbidden', message: 'You do not have permission to access this record' });
    }

    res.status(200).json(record.rows[0]);
  } catch (error) {
    next(error);
  }
};

const updateRecord = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { amount, type, category, date, notes } = req.body;

    await client.query('BEGIN');

    const record = await client.query('SELECT * FROM records WHERE id = $1 AND is_deleted = false', [id]);

    if (record.rows.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(404).json({ error: 'Not Found', message: 'Record not found' });
    }

    if (!canUpdateRecord(req.user, record.rows[0])) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(403).json({ error: 'Forbidden', message: 'You do not have permission to update this record' });
    }

    const updatedRecord = await client.query(
      `UPDATE records
       SET amount = COALESCE($1, amount),
           type = COALESCE($2, type),
           category = COALESCE($3, category),
           date = COALESCE($4, date),
           notes = COALESCE($5, notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 RETURNING *`,
      [amount ?? null, type ?? null, category ?? null, date ?? null, notes ?? null, id]
    );

    await client.query(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id)
       VALUES ($1, $2, $3, $4)`,
      [req.user.id, 'UPDATE', 'record', id]
    );

    await client.query('COMMIT');
    client.release();

    res.status(200).json(updatedRecord.rows[0]);
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

const deleteRecord = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    await client.query('BEGIN');

    const record = await client.query('SELECT * FROM records WHERE id = $1 AND is_deleted = false', [id]);

    if (record.rows.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(404).json({ error: 'Not Found', message: 'Record not found' });
    }

    if (!canDeleteRecord(req.user, record.rows[0])) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(403).json({ error: 'Forbidden', message: 'You do not have permission to delete this record' });
    }

    await client.query(
      `UPDATE records SET is_deleted = true, deleted_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );

    await client.query(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id)
       VALUES ($1, $2, $3, $4)`,
      [req.user.id, 'DELETE', 'record', id]
    );

    await client.query('COMMIT');
    client.release();

    res.status(200).json({ message: 'Record soft-deleted successfully' });
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
  createRecord,
  getRecords,
  getRecordById,
  updateRecord,
  deleteRecord,
};
