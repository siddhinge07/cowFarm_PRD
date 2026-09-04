const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');

// Get estrus cycles for current farm
router.get('/', verifyToken, async (req, res) => {
  try {
    const { cow_id, limit = 100 } = req.query;
    let query = 'SELECT ec.*, c.tag_number, c.name FROM estrus_cycles ec LEFT JOIN cows c ON ec.cow_id = c.id WHERE ec.farm_id = ?';
    const params = [req.user.farm_id];

    if (cow_id) {
      query += ' AND ec.cow_id = ?';
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

// Create cycle record
router.post('/', verifyToken, async (req, res) => {
  try {
    const cycleId = crypto.randomUUID();
    const { cow_id, last_cycle_date, cycle_status, notes } = req.body;

    await pool.query(
      `INSERT INTO estrus_cycles (id, farm_id, cow_id, last_cycle_date, cycle_status, notes, recorded_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [cycleId, req.user.farm_id, cow_id, last_cycle_date, cycle_status || 'pending', notes || null, req.user.id]
    );

    res.json({ data: { id: cycleId, cow_id, last_cycle_date, cycle_status } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Delete cycle record
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM estrus_cycles WHERE id = ? AND farm_id = ?', [req.params.id, req.user.farm_id]);
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Cycles summary for dashboard
router.get('/summary', verifyToken, async (req, res) => {
  try {
    const [cows] = await pool.query('SELECT COUNT(*) as total_cows FROM cows WHERE farm_id = ?', [req.user.farm_id]);
    const [milking] = await pool.query('SELECT COUNT(*) as milking_cows FROM cows WHERE farm_id = ? AND is_milking = TRUE', [req.user.farm_id]);
    const [pregnant] = await pool.query('SELECT COUNT(*) as pregnant_cows FROM cows WHERE farm_id = ? AND health_status = "pregnant"', [req.user.farm_id]);
    const [sick] = await pool.query('SELECT COUNT(*) as sick_cows FROM cows WHERE farm_id = ? AND health_status = "sick"', [req.user.farm_id]);

    res.json({
      data: {
        total_cows: cows[0].total_cows,
        milking_cows: milking[0].milking_cows,
        pregnant_cows: pregnant[0].pregnant_cows,
        sick_cows: sick[0].sick_cows,
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
