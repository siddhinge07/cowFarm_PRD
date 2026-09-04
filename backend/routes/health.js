const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');

// Get health records for current farm
router.get('/', verifyToken, async (req, res) => {
  try {
    const { cow_id, limit = 50 } = req.query;
    let query = 'SELECT hr.*, c.tag_number, c.name FROM health_records hr LEFT JOIN cows c ON hr.cow_id = c.id WHERE hr.farm_id = ?';
    const params = [req.user.farm_id];

    if (cow_id) {
      query += ' AND hr.cow_id = ?';
      params.push(cow_id);
    }
    query += ' ORDER BY hr.record_date DESC LIMIT ?';
    params.push(Number(limit));

    const [data] = await pool.query(query, params);
    res.json({ data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create health record
router.post('/', verifyToken, async (req, res) => {
  try {
    const healthId = crypto.randomUUID();
    const { cow_id, record_date, record_type, diagnosis, treatment, medication, dosage, vet_name, vet_contact, follow_up_date, cost, notes } = req.body;

    await pool.query(
      `INSERT INTO health_records (id, farm_id, cow_id, record_date, record_type, diagnosis, treatment, medication, dosage, vet_name, vet_contact, follow_up_date, cost, notes, recorded_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [healthId, req.user.farm_id, cow_id, record_date, record_type, diagnosis, treatment, medication, dosage, vet_name, vet_contact, follow_up_date || null, cost || null, notes, req.user.id]
    );

    res.json({ data: { id: healthId } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Delete health record
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM health_records WHERE id = ? AND farm_id = ?', [req.params.id, req.user.farm_id]);
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
