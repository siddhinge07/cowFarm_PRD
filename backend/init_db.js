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
      multipleStatements: true,
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
    await connection.query(schemaSql);
    console.log('Database schema verified/initialized successfully!');
  } catch (error) {
    console.error('Database init notice:', error.message);
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
