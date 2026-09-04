const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function addColumnIfNotExists(connection, table, column, definition) {
  try {
    const [cols] = await connection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [table, column]
    );
    if (cols.length === 0) {
      console.log(`Adding column ${column} to table ${table}...`);
      await connection.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
    }
  } catch (err) {
    console.error(`Notice checking column ${column} in ${table}:`, err.message);
  }
}

async function initDb() {
  let connection;
  try {
    const dbName = process.env.DB_NAME || 'agroherd';
    const config = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    };

    try {
      connection = await mysql.createConnection({ ...config, database: dbName });
    } catch (err) {
      connection = await mysql.createConnection(config);
      await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
      await connection.changeUser({ database: dbName });
    }

    console.log(`Connected to database [${dbName}]. Initializing multi-farm schema...`);
    const schemaSql = fs.readFileSync(path.join(__dirname, 'mysql_schema.sql'), 'utf8');
    
    // Clean and split SQL into individual executable statements
    const cleanedSql = schemaSql
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');

    const statements = cleanedSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const stmt of statements) {
      try {
        await connection.query(stmt);
      } catch (e) {
        // Table or index might already exist
      }
    }

    // Run Migrations for existing databases
    console.log('Running column migrations if needed...');
    const defaultFarmId = 'default-farm-001';
    await connection.query(
      `INSERT IGNORE INTO farms (id, name, code) VALUES (?, 'Default Farm', 'FARM-1001')`,
      [defaultFarmId]
    );

    // Add multi-tenant columns
    await addColumnIfNotExists(connection, 'users', 'farm_id', 'VARCHAR(36) NULL');
    await addColumnIfNotExists(connection, 'users', 'is_verified', 'BOOLEAN DEFAULT FALSE');
    await addColumnIfNotExists(connection, 'users', 'otp_code', 'VARCHAR(6) NULL');
    await addColumnIfNotExists(connection, 'users', 'otp_expires_at', 'TIMESTAMP NULL');

    await addColumnIfNotExists(connection, 'cows', 'farm_id', 'VARCHAR(36) NULL');
    await addColumnIfNotExists(connection, 'estrus_cycles', 'farm_id', 'VARCHAR(36) NULL');
    await addColumnIfNotExists(connection, 'expenses', 'farm_id', 'VARCHAR(36) NULL');
    await addColumnIfNotExists(connection, 'milk_records', 'farm_id', 'VARCHAR(36) NULL');
    await addColumnIfNotExists(connection, 'health_records', 'farm_id', 'VARCHAR(36) NULL');
    await addColumnIfNotExists(connection, 'notifications', 'farm_id', 'VARCHAR(36) NULL');

    // Backfill any existing records to default farm
    await connection.query(`UPDATE users SET farm_id = ?, is_verified = TRUE WHERE farm_id IS NULL`, [defaultFarmId]);
    await connection.query(`UPDATE cows SET farm_id = ? WHERE farm_id IS NULL`, [defaultFarmId]);
    await connection.query(`UPDATE estrus_cycles SET farm_id = ? WHERE farm_id IS NULL`, [defaultFarmId]);
    await connection.query(`UPDATE expenses SET farm_id = ? WHERE farm_id IS NULL`, [defaultFarmId]);
    await connection.query(`UPDATE milk_records SET farm_id = ? WHERE farm_id IS NULL`, [defaultFarmId]);
    await connection.query(`UPDATE health_records SET farm_id = ? WHERE farm_id IS NULL`, [defaultFarmId]);
    await connection.query(`UPDATE notifications SET farm_id = ? WHERE farm_id IS NULL`, [defaultFarmId]);

    const [tables] = await connection.query('SHOW TABLES');
    console.log('Multi-farm schema and migrations verified successfully!');
    return { success: true, tables };
  } catch (error) {
    console.error('Database init error:', error);
    return { success: false, error: error.message };
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

if (require.main === module) {
  initDb().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = initDb;
