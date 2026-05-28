const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');

// Get milk records
router.get('/', verifyToken, async (req, res) => {
  try {
    const { cow_id, session, from, to, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let selectQuery = 'SELECT m.*, c.tag_number, c.name FROM milk_records m LEFT JOIN cows c ON m.cow_id = c.id';
    let countQuery = 'SELECT COUNT(*) as total FROM milk_records m';
    const conditions = [];
    const params = [];

    if (cow_id) {
      conditions.push('m.cow_id = ?');
      params.push(cow_id);
    } else {
      conditions.push('m.cow_id IS NULL');
    }

    if (session) {
      conditions.push('m.session = ?');
      params.push(session);
    }

    if (from) {
      conditions.push('m.record_date >= ?');
      params.push(from);
    }

    if (to) {
      conditions.push('m.record_date <= ?');
      params.push(to);
    }

    if (conditions.length > 0) {
      const whereClause = ' WHERE ' + conditions.join(' AND ');
      selectQuery += whereClause;
      countQuery += whereClause;
    }

    selectQuery += ' ORDER BY m.record_date DESC, m.created_at DESC LIMIT ? OFFSET ?';
    const selectParams = [...params, Number(limit), Number(offset)];

    const [data] = await pool.query(selectQuery, selectParams);
    const [countResult] = await pool.query(countQuery, params);

    res.json({
      data,
      count: countResult[0].total
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create milk record
router.post('/', verifyToken, async (req, res) => {
  try {
    const records = Array.isArray(req.body) ? req.body : [req.body];
    
    for (const record of records) {
      const recordId = crypto.randomUUID();
      const {
        cow_id,
        record_date,
        session,
        quantity_liters,
        price_per_liter,
        quality_grade,
        fat_percentage,
        notes
      } = record;

      const finalCowId = (cow_id && cow_id.trim() !== '') ? cow_id : null;
      const finalPrice = (price_per_liter !== undefined && price_per_liter !== null && String(price_per_liter).trim() !== '') ? parseFloat(price_per_liter) : null;

      await pool.query(
        `INSERT INTO milk_records (id, cow_id, record_date, session, quantity_liters, price_per_liter, quality_grade, fat_percentage, notes, recorded_by) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          recordId,
          finalCowId,
          record_date,
          session || 'morning',
          parseFloat(quantity_liters),
          finalPrice,
          quality_grade || 'A',
          fat_percentage ? parseFloat(fat_percentage) : null,
          notes || null,
          req.user.id
        ]
      );
    }

    res.json({ data: { success: true } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Delete milk record
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM milk_records WHERE id = ?', [id]);
    res.json({ data: { success: true } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

module.exports = router;
