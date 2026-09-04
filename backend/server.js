const express = require('express');
const cors = require('cors');
require('dotenv').config();

const pool = require('./db');
const initDb = require('./init_db');

const authRoutes = require('./routes/auth');
const cowsRoutes = require('./routes/cows');
const milkRoutes = require('./routes/milk');
const healthRoutes = require('./routes/health');
const expensesRoutes = require('./routes/expenses');
const cyclesRoutes = require('./routes/cycles');
const notificationsRoutes = require('./routes/notifications');
const teamRoutes = require('./routes/team');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Public health check
app.get('/api/health-check', (req, res) => {
  res.json({ status: 'ok', message: 'AgroHerd Backend API is running' });
});

// Diagnostic DB check
app.get('/api/test-db', async (req, res) => {
  try {
    const [rows] = await pool.query('SHOW TABLES');
    res.json({ success: true, tables: rows });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
      code: err.code,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      database: process.env.DB_NAME,
      ssl: process.env.DB_SSL
    });
  }
});

// List all accounts across the entire platform
app.get('/api/all-accounts', async (req, res) => {
  try {
    const [users] = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.is_active, u.is_verified, u.created_at, f.name as farm_name, f.code as farm_code 
       FROM users u 
       LEFT JOIN farms f ON u.farm_id = f.id 
       ORDER BY u.created_at DESC`
    );
    res.json({ total: users.length, accounts: users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete any unwanted account by email
app.delete('/api/all-accounts/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const [result] = await pool.query('DELETE FROM users WHERE email = ?', [email]);
    res.json({ success: true, message: `Account ${email} deleted successfully.`, affectedRows: result.affectedRows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Diagnostic route to test email sending live
app.get('/api/test-email', async (req, res) => {
  const to = req.query.to || 'siddheshhinge099@gmail.com';
  const { sendOtpEmail } = require('./lib/email');
  try {
    const result = await sendOtpEmail(to, '999888', 'AgroHerd Diagnostic');
    res.json({
      success: true,
      result,
      target: to,
      env: {
        SMTP_USER: process.env.SMTP_USER ? `${process.env.SMTP_USER.slice(0, 4)}***` : 'NOT SET',
        SMTP_PASS: process.env.SMTP_PASS ? `SET (${process.env.SMTP_PASS.length} chars)` : 'NOT SET',
        RESEND_API_KEY: process.env.RESEND_API_KEY ? 'SET' : 'NOT SET',
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
      target: to,
      env: {
        SMTP_USER: process.env.SMTP_USER ? `${process.env.SMTP_USER.slice(0, 4)}***` : 'NOT SET',
        SMTP_PASS: process.env.SMTP_PASS ? `SET (${process.env.SMTP_PASS.length} chars)` : 'NOT SET',
        RESEND_API_KEY: process.env.RESEND_API_KEY ? 'SET' : 'NOT SET',
      }
    });
  }
});

// Trigger schema initialization on demand
app.get('/api/init-db', async (req, res) => {
  const result = await initDb();
  res.json(result);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/cows', cowsRoutes);
app.use('/api/milk', milkRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/cycles', cyclesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/team', teamRoutes);

app.listen(port, async () => {
  console.log(`Server listening on port ${port}`);
  await initDb();
});
