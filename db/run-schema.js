const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/db');

async function runSchema() {
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('Running schema.sql...');
    await pool.query(sql);
    console.log('Schema applied successfully.');
    
    process.exit(0);
  } catch (error) {
    console.error('Error running schema:', error);
    process.exit(1);
  }
}

runSchema();
