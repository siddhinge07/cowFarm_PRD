const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');

// Get health records
router.get('/', verifyToken, async (req, res) => {
  try {
    const { cow_id, limit = 50 } = req.query;
    let query = 'SELECT * FROM health_records';
    const params = [];

    if (cow_id) {
      query += ' WHERE cow_id = ?';
      params.push(cow_id);
    }
    query += ' ORDER BY record_date DESC LIMIT ?';
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
      `INSERT INTO health_records (id, cow_id, record_date, record_type, diagnosis, treatment, medication, dosage, vet_name, vet_contact, follow_up_date, cost, notes, recorded_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [healthId, cow_id, record_date, record_type, diagnosis, treatment, medication, dosage, vet_name, vet_contact, follow_up_date || null, cost || null, notes, req.user.id]
    );

    res.json({ data: { id: healthId } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

module.exports = router;
