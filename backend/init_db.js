const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

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

    console.log(`Connected to database [${dbName}]. Initializing tables...`);
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
      await connection.query(stmt);
    }

    const [tables] = await connection.query('SHOW TABLES');
    console.log('Database tables verified/initialized:', tables);
    return { success: true, tables };
  } catch (error) {
    console.error('Database init notice:', error);
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
