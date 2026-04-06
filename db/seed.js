/**
 * Seed Script — Populates the database with demo users and realistic financial records.
 *
 * Usage:  node db/seed.js
 *
 * Creates:
 *   • 3 users  — admin, analyst, viewer (password: "password123" for all)
 *   • 30 financial records spanning Jan–Apr 2026 across 8 categories
 *   • Audit log entries for every created record
 */

require('dns').setDefaultResultOrder('ipv4first');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const path = require('path');

// Load env from project root
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env'), quiet: true });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// ─── Demo Users Configuration ─────────────────────────────────────────
const coreUsers = [
  { email: 'admin@zorvyn.com', password: 'password123', role: 'admin' },
  { email: 'analyst@zorvyn.com', password: 'password123', role: 'analyst' },
  { email: 'viewer@zorvyn.com', password: 'password123', role: 'viewer' },
];

const TARGET_EXTRA_USERS = 50;
const MONTHS_OF_DATA = 24;

// ─── Procedurally Generated Realistic Data ──────────────────
function generateUserRecords(userId, today) {
  const generated = [];
  
  for (let monthOffset = MONTHS_OF_DATA; monthOffset >= 0; monthOffset--) {
      const currentMonth = new Date(today.getFullYear(), today.getMonth() - monthOffset, 1);
      const y = currentMonth.getFullYear();
      const m = String(currentMonth.getMonth() + 1).padStart(2, '0');
      
      // Fixed Income
      generated.push({ user_id: userId, amount: 5000.00, type: 'income', category: 'Salary', date: `${y}-${m}-01`, notes: 'Monthly fixed salary' });
      
      // Variable Income (Freelance/Gig work)
      if (Math.random() > 0.6) {
         generated.push({ user_id: userId, amount: Math.floor(Math.random()*800 + 200), type: 'income', category: 'Freelance', date: `${y}-${m}-15`, notes: 'Freelance development project' });
      }
      
      // Fixed Expenses
      generated.push({ user_id: userId, amount: 1200.00, type: 'expense', category: 'Rent', date: `${y}-${m}-02`, notes: 'Apartment rent' });
      generated.push({ user_id: userId, amount: Math.floor(Math.random()*50 + 100), type: 'expense', category: 'Utilities', date: `${y}-${m}-05`, notes: 'Electricity & Water bill' });
      generated.push({ user_id: userId, amount: Math.floor(Math.random()*30 + 50), type: 'expense', category: 'Utilities', date: `${y}-${m}-10`, notes: 'Broadband Internet bill' });
      
      // Variable Expenses: Groceries
      const numGroceries = Math.floor(Math.random() * 4) + 2; 
      for (let i=0; i<numGroceries; i++) {
         const day = String(Math.floor(Math.random() * 25) + 3).padStart(2, '0');
         generated.push({ user_id: userId, amount: Math.floor(Math.random()*80 + 40), type: 'expense', category: 'Groceries', date: `${y}-${m}-${day}`, notes: 'Weekly groceries' });
      }
      
      // Variable Expenses: Dining/Food
      const foodPlaces = ['Starbucks', 'Local Diner', 'UberEats', 'Zomato', 'Pizza Delivery'];
      const numFood = Math.floor(Math.random() * 6) + 4; 
      for (let i=0; i<numFood; i++) {
         const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
         const place = foodPlaces[Math.floor(Math.random() * foodPlaces.length)];
         generated.push({ user_id: userId, amount: Math.floor(Math.random()*40 + 15), type: 'expense', category: 'Food', date: `${y}-${m}-${day}`, notes: `Dining out / ${place}` });
      }

      // Variable Expenses: Transportation
      const numTransport = Math.floor(Math.random() * 12) + 6; 
      for (let i=0; i<numTransport; i++) {
         const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
         generated.push({ user_id: userId, amount: Math.floor(Math.random()*20 + 8), type: 'expense', category: 'Transportation', date: `${y}-${m}-${day}`, notes: 'Uber / Cab ride' });
      }
      
      // Occasional Expenses: Entertainment
      if (Math.random() > 0.3) {
          const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
          generated.push({ user_id: userId, amount: Math.floor(Math.random()*100 + 20), type: 'expense', category: 'Entertainment', date: `${y}-${m}-${day}`, notes: 'Netflix / Movies / Steam games' });
      }

      // Occasional Expenses: Healthcare
      if (Math.random() > 0.8) {
           const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
           generated.push({ user_id: userId, amount: Math.floor(Math.random()*200 + 50), type: 'expense', category: 'Healthcare', date: `${y}-${m}-${day}`, notes: 'Pharmacy / Health checkup' });
      }
  }
  return generated;
}

function chunkArray(array, size) {
  const chunks = [];
  for(let i=0; i<array.length; i+=size) chunks.push(array.slice(i, i+size));
  return chunks;
}

const format = require('pg-format');

async function seed() {
  const client = await pool.connect();
  const today = new Date();

  try {
    await client.query('BEGIN');

    console.log('🌱 Generating and Seeding users...');
    
    // Hash password once to save huge amounts of time
    const passwordHash = await bcrypt.hash('password123', 10);
    const createdUsers = [];

    // Setup array of users to seed
    const usersToProcess = [...coreUsers];
    for(let i = 1; i <= TARGET_EXTRA_USERS; i++) {
       usersToProcess.push({
           email: `user_${i}@zorvyn.com`,
           password: passwordHash,
           role: Math.random() > 0.5 ? 'analyst' : 'viewer',
           isPreHashed: true
       });
    }

    // Insert users safely
    for (const u of usersToProcess) {
      const exists = await client.query('SELECT id FROM users WHERE email = $1', [u.email]);
      if (exists.rows.length > 0) {
        createdUsers.push({ id: exists.rows[0].id, ...u });
        continue;
      }

      const hashToUse = u.isPreHashed ? u.password : await bcrypt.hash(u.password, 10);
      const result = await client.query(
        'INSERT INTO users (email, password, role) VALUES ($1, $2, $3) RETURNING id',
        [u.email, hashToUse, u.role]
      );
      createdUsers.push({ id: result.rows[0].id, ...u });
    }

    console.log(`   ✅ Synced ${createdUsers.length} users into the database.`);

    console.log(`\n📊 Generating ${MONTHS_OF_DATA} months of financial records for all ${createdUsers.length} users...`);
    
    const allRecords = [];
    for (const user of createdUsers) {
       allRecords.push(...generateUserRecords(user.id, today));
    }
    
    // Calculate total summary before insert
    const totalRecords = allRecords.length;
    const totalIncome = allRecords.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0);
    const totalExpenses = allRecords.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0);

    console.log(`   ⏳ Batch inserting ${totalRecords.toLocaleString()} financial records (this might take a moment)...`);

    // We must batch inserts to prevent exceeding Postgres query parameter limits (usually ~65,535 limits)
    const BATCH_SIZE = 2000;
    const recordChunks = chunkArray(allRecords, BATCH_SIZE);
    
    let insertedRecordCount = 0;
    
    for (const chunk of recordChunks) {
       const recordRows = chunk.map(r => [r.user_id, r.amount, r.type, r.category, r.date, r.notes]);
       const insertRecordsQuery = format(
          `INSERT INTO records (user_id, amount, type, category, date, notes) VALUES %L RETURNING id, user_id`, 
          recordRows
       );
       const result = await client.query(insertRecordsQuery);
       
       const auditRows = result.rows.map(row => [row.user_id, 'CREATE', 'record', row.id]);
       const insertAuditsQuery = format(
          `INSERT INTO audit_logs (user_id, action, resource_type, resource_id) VALUES %L`, 
          auditRows
       );
       await client.query(insertAuditsQuery);
       
       insertedRecordCount += chunk.length;
       process.stdout.write(`\r   Progress: ${insertedRecordCount} / ${totalRecords} records saved ✨`);
    }
    process.stdout.write('\n');

    await client.query('COMMIT');

    console.log('\n──────────────────────────────────────────────────────');
    console.log('🎉 Super Seed Complete!');
    console.log('──────────────────────────────────────────────────────');
    console.log(`   Total Users:      ${createdUsers.length}`);
    console.log(`   Total Records:    ${totalRecords.toLocaleString()}`);
    console.log(`   Total Volume:     $${(totalIncome + totalExpenses).toLocaleString(undefined, {minimumFractionDigits: 2})}`);
    console.log(`   Gross Income:     $${totalIncome.toLocaleString(undefined, {minimumFractionDigits: 2})}`);
    console.log(`   Gross Expenses:   $${totalExpenses.toLocaleString(undefined, {minimumFractionDigits: 2})}`);
    console.log('──────────────────────────────────────────────────────');
    console.log('\n🔑 Login credentials (all passwords: password123):');
    console.log('   admin@zorvyn.com    → role: admin');
    console.log('   analyst@zorvyn.com  → role: analyst');
    console.log('   viewer@zorvyn.com   → role: viewer');
    console.log(`   ... plus user_1@zorvyn.com through user_${TARGET_EXTRA_USERS}@zorvyn.com (random roles)`);
    console.log('');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Seed failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
