const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');

// All expense routes require valid token and admin role
router.use(verifyToken);
router.use((req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Workers cannot view or manage expenses.' });
  }
  next();
});

// Get expenses for current farm
router.get('/', async (req, res) => {
  try {
    const { cow_id, from, to, category, limit = 50 } = req.query;
    let query = 'SELECT e.*, c.tag_number, c.name FROM expenses e LEFT JOIN cows c ON e.cow_id = c.id WHERE e.farm_id = ?';
    const params = [req.user.farm_id];

    if (cow_id) {
      query += ' AND e.cow_id = ?';
      params.push(cow_id);
    }
    if (from) {
      query += ' AND e.expense_date >= ?';
      params.push(from);
    }
    if (to) {
      query += ' AND e.expense_date <= ?';
      params.push(to);
    }
    if (category) {
      query += ' AND e.category = ?';
      params.push(category);
    }

    query += ' ORDER BY e.expense_date DESC LIMIT ?';
    params.push(Number(limit));

    const [data] = await pool.query(query, params);
    res.json({ data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create expense
router.post('/', async (req, res) => {
  try {
    const expenseId = crypto.randomUUID();
    const { cow_id, category, sub_category, amount, expense_date, vendor, receipt_url, notes } = req.body;

    await pool.query(
      `INSERT INTO expenses (id, farm_id, cow_id, category, sub_category, amount, expense_date, vendor, receipt_url, notes, added_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [expenseId, req.user.farm_id, cow_id || null, category, sub_category, amount, expense_date, vendor, receipt_url, notes, req.user.id]
    );

    res.json({ data: { id: expenseId } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Delete expense
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM expenses WHERE id = ? AND farm_id = ?', [req.params.id, req.user.farm_id]);
    res.json({ success: true, message: 'Expense deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
