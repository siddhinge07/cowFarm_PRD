const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_agroherd';

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, data } = req.body;
    const name = data?.name || email.split('@')[0];
    const role = data?.role || 'worker';
    const phone = data?.phone || null;

    // Check if user exists
    const [existing] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: { message: 'User already exists' } });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    const userId = crypto.randomUUID();

    await pool.query(
      'INSERT INTO users (id, name, email, password_hash, role, phone) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, name, email, password_hash, role, phone]
    );

    const token = jwt.sign({ id: userId, email, role }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({
      data: {
        user: { id: userId, email, role },
        session: { access_token: token, user: { id: userId, email, role } }
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { message: 'Server error during registration' } });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).json({ error: { message: 'Invalid credentials' } });
    }

    const user = users[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!validPassword) {
      return res.status(401).json({ error: { message: 'Invalid credentials' } });
    }

    await pool.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      data: {
        user: { id: user.id, email: user.email, role: user.role, name: user.name, phone: user.phone },
        session: { access_token: token, user: { id: user.id, email: user.email, role: user.role } }
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { message: 'Server error during login' } });
  }
});

// Get User Profile
router.get('/me', verifyToken, async (req, res) => {
  try {
    const [users] = await pool.query('SELECT id, name, email, role, phone, profile_pic, is_active FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ data: users[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update User Profile
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { name, phone } = req.body;
    await pool.query('UPDATE users SET name = ?, phone = ? WHERE id = ?', [name, phone, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error updating profile' });
  }
});

// Change Password
router.put('/password', verifyToken, async (req, res) => {
  try {
    const { password } = req.body;
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error changing password' });
  }
});

module.exports = router;
