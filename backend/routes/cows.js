const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');

// Get all cows for current farm
router.get('/', verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, breed, health_status, is_milking } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM cows WHERE farm_id = ?';
    const params = [req.user.farm_id];

    if (search) {
      query += ' AND (tag_number LIKE ? OR name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (breed) {
      query += ' AND breed = ?';
      params.push(breed);
    }
    if (health_status) {
      query += ' AND health_status = ?';
      params.push(health_status);
    }
    if (is_milking !== undefined && is_milking !== '') {
      query += ' AND is_milking = ?';
      params.push(is_milking === 'true' ? 1 : 0);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const [data] = await pool.query(query, params);
    
    // Count total
    let countQuery = 'SELECT COUNT(*) as total FROM cows WHERE farm_id = ?';
    const countParams = [req.user.farm_id];
    if (search) { countQuery += ' AND (tag_number LIKE ? OR name LIKE ?)'; countParams.push(`%${search}%`, `%${search}%`); }
    if (breed) { countQuery += ' AND breed = ?'; countParams.push(breed); }
    if (health_status) { countQuery += ' AND health_status = ?'; countParams.push(health_status); }
    if (is_milking !== undefined && is_milking !== '') { countQuery += ' AND is_milking = ?'; countParams.push(is_milking === 'true' ? 1 : 0); }

    const [countResult] = await pool.query(countQuery, countParams);

    res.json({ data, count: countResult[0].total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single cow
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const [cows] = await pool.query('SELECT * FROM cows WHERE id = ? AND farm_id = ?', [req.params.id, req.user.farm_id]);
    if (cows.length === 0) return res.status(404).json({ error: 'Cow not found' });
    res.json({ data: cows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create cow (Admin only)
router.post('/', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the Farm Admin can add cows.' });
    }

    const cowId = crypto.randomUUID();
    const {
      tag_number, name, breed, date_of_birth, weight_kg, color,
      health_status, is_milking, purchase_date, purchase_price, notes
    } = req.body;

    await pool.query(
      `INSERT INTO cows (id, farm_id, tag_number, name, breed, date_of_birth, weight_kg, color, health_status, is_milking, purchase_date, purchase_price, notes, added_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [cowId, req.user.farm_id, tag_number, name, breed, date_of_birth, weight_kg, color, health_status, is_milking, purchase_date, purchase_price, notes, req.user.id]
    );

    const [newCow] = await pool.query('SELECT * FROM cows WHERE id = ? AND farm_id = ?', [cowId, req.user.farm_id]);
    res.json({ data: newCow[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Update cow
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const fields = [];
    const params = [];

    const allowedFields = ['tag_number', 'name', 'breed', 'date_of_birth', 'weight_kg', 'color', 'health_status', 'is_milking', 'purchase_date', 'purchase_price', 'notes', 'pregnancy_date'];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        fields.push(`${field} = ?`);
        params.push(req.body[field]);
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(req.params.id, req.user.farm_id);

    const [result] = await pool.query(
      `UPDATE cows SET ${fields.join(', ')} WHERE id = ? AND farm_id = ?`,
      params
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Cow not found' });
    }

    res.json({ message: 'Updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete cow (Admin only)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the Farm Admin can delete cows.' });
    }

    const [result] = await pool.query('DELETE FROM cows WHERE id = ? AND farm_id = ?', [req.params.id, req.user.farm_id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Cow not found' });
    }
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
