const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function inspect() {
  const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';");
  console.log("TABLES:", tables.rows);

  const usersInfo = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users';");
  console.log("USERS COLUMNS:", usersInfo.rows);

  const countsInfo = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'jaap_counts';");
  console.log("JAAP_COUNTS COLUMNS:", countsInfo.rows);

  process.exit(0);
}
inspect();
