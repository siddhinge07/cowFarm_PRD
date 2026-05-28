const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function initDb() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true,
    });

    console.log('Connected to MySQL. Creating database if not exists...');
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'agroherd'}\`;`);
    console.log(`Database created or already exists.`);
    
    await connection.changeUser({ database: process.env.DB_NAME || 'agroherd' });

    console.log('Reading schema file...');
    const schemaSql = fs.readFileSync(path.join(__dirname, 'mysql_schema.sql'), 'utf8');

    console.log('Executing schema...');
    await connection.query(schemaSql);
    
    console.log('Database schema successfully initialized!');
    await connection.end();
  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  }
}

initDb();
