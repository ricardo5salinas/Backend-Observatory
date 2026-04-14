import { pool } from '../db.js';

async function run() {
  try {
    const r = await pool.query('SELECT id, email FROM public."User" ORDER BY id DESC LIMIT 20');
    console.log('Found', r.rows.length, 'users');
    console.log(r.rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();
