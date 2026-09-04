const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');

// Get all staff for current farm (Admin only)
router.get('/', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: { message: 'Only farm admins can view the team list.' } });
    }

    const [team] = await pool.query(
      `SELECT id, name, email, role, phone, is_active, created_at, last_login 
       FROM users 
       WHERE farm_id = ? 
       ORDER BY CASE WHEN role = 'admin' THEN 0 ELSE 1 END, created_at ASC`,
      [req.user.farm_id]
    );

    res.json({ data: team });
  } catch (err) {
    console.error('Fetch team error:', err);
    res.status(500).json({ error: { message: 'Failed to fetch team members' } });
  }
});

// Admin creates a worker account
router.post('/', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: { message: 'Only the Farm Admin can add workers.' } });
    }

    const farmId = req.user.farm_id;
    if (!farmId) {
      return res.status(400).json({ error: { message: 'No Farm associated with this Admin account.' } });
    }

    const { name, email, password, phone } = req.body;
    const workerEmail = (email || '').trim().toLowerCase();
    const workerName = (name || '').trim();

    if (!workerEmail || !password || !workerName) {
      return res.status(400).json({ error: { message: 'Name, email, and password are required.' } });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(workerEmail)) {
      return res.status(400).json({ error: { message: 'Please enter a valid email address.' } });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: { message: 'Password must be at least 6 characters.' } });
    }

    // Check if user already exists
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [workerEmail]);
    if (existing.length > 0) {
      return res.status(400).json({ error: { message: 'An account with this email already exists.' } });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    const workerId = crypto.randomUUID();

    await pool.query(
      `INSERT INTO users (id, farm_id, name, email, password_hash, role, phone, is_active, is_verified) 
       VALUES (?, ?, ?, ?, ?, 'worker', ?, TRUE, TRUE)`,
      [workerId, farmId, workerName, workerEmail, password_hash, phone || null]
    );

    res.json({
      success: true,
      message: 'Worker added successfully',
      data: {
        id: workerId,
        name: workerName,
        email: workerEmail,
        role: 'worker'
      }
    });
  } catch (err) {
    console.error('Add worker error:', err);
    res.status(500).json({ error: { message: err.message || 'Failed to add worker' } });
  }
});

// Admin deletes a worker from the farm
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: { message: 'Only the Farm Admin can remove workers.' } });
    }

    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: { message: 'You cannot remove your own admin account.' } });
    }

    const [result] = await pool.query(
      'DELETE FROM users WHERE id = ? AND farm_id = ? AND role = "worker"',
      [req.params.id, req.user.farm_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: { message: 'Worker not found or cannot be removed.' } });
    }

    res.json({ success: true, message: 'Worker removed successfully.' });
  } catch (err) {
    console.error('Delete worker error:', err);
    res.status(500).json({ error: { message: 'Failed to remove worker' } });
  }
});

module.exports = router;
