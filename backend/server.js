const express = require('express');
const cors = require('cors');
require('dotenv').config();

const initDb = require('./init_db');

const authRoutes = require('./routes/auth');
const cowsRoutes = require('./routes/cows');
const milkRoutes = require('./routes/milk');
const healthRoutes = require('./routes/health');
const expensesRoutes = require('./routes/expenses');
const cyclesRoutes = require('./routes/cycles');
const notificationsRoutes = require('./routes/notifications');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Public health check
app.get('/api/health-check', (req, res) => {
  res.json({ status: 'ok', message: 'AgroHerd Backend API is running' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/cows', cowsRoutes);
app.use('/api/milk', milkRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/cycles', cyclesRoutes);
app.use('/api/notifications', notificationsRoutes);

app.listen(port, async () => {
  console.log(`Server listening on port ${port}`);
  await initDb();
});
