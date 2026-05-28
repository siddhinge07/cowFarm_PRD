const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');

// Get estrus cycles
router.get('/', verifyToken, async (req, res) => {
  try {
    const { cow_id, limit = 50 } = req.query;
    let query = 'SELECT ec.*, c.tag_number, c.name FROM estrus_cycles ec LEFT JOIN cows c ON ec.cow_id = c.id';
    const params = [];

    if (cow_id) {
      query += ' WHERE ec.cow_id = ?';
      params.push(cow_id);
    }
    query += ' ORDER BY ec.last_cycle_date DESC LIMIT ?';
    params.push(Number(limit));

    const [data] = await pool.query(query, params);
    res.json({ data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create cycle
router.post('/', verifyToken, async (req, res) => {
  try {
    const cycleId = crypto.randomUUID();
    const { cow_id, last_cycle_date, cycle_status, notes } = req.body;

    await pool.query(
      `INSERT INTO estrus_cycles (id, cow_id, last_cycle_date, cycle_status, notes, recorded_by) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [cycleId, cow_id, last_cycle_date, cycle_status, notes, req.user.id]
    );

    res.json({ data: { id: cycleId } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Get latest cycle per cow (for dashboard alerts)
router.get('/summary', verifyToken, async (req, res) => {
  try {
    const [data] = await pool.query(`
      SELECT ec.*, c.tag_number, c.name AS cow_name
      FROM estrus_cycles ec
      INNER JOIN (
        SELECT cow_id, MAX(created_at) AS max_created
        FROM estrus_cycles
        GROUP BY cow_id
      ) latest ON ec.cow_id = latest.cow_id AND ec.created_at = latest.max_created
      LEFT JOIN cows c ON ec.cow_id = c.id
      ORDER BY ec.last_cycle_date DESC
    `);
    res.json({ data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete cycle
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM estrus_cycles WHERE id = ?', [req.params.id]);
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
