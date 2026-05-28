const pool = require('./db');
async function run() {
  try {
    const [rows] = await pool.query('SELECT * FROM estrus_cycles');
    console.log('Estrus Cycles:', rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
