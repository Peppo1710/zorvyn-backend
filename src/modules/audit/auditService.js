const { pool } = require('../../config/db');

const logAction = async (userId, action, resourceType, resourceId) => {
  try {
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id) 
       VALUES ($1, $2, $3, $4)`,
      [userId, action, resourceType, resourceId]
    );
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
};

module.exports = {
  logAction,
};
