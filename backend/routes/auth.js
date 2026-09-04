const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');
const { sendOtpEmail } = require('../lib/email');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_agroherd';

// Register Farm & Owner
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, farm_name, data } = req.body;
    const userEmail = (email || data?.email || '').trim().toLowerCase();
    const userName = (name || data?.name || userEmail.split('@')[0]).trim();
    const farmName = (farm_name || data?.farm_name || `${userName}'s Farm`).trim();
    const phone = data?.phone || null;

    if (!userEmail || !password) {
      return res.status(400).json({ error: { message: 'Email and password are required' } });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userEmail)) {
      return res.status(400).json({ error: { message: 'Please enter a valid email address' } });
    }

    // Check if user exists
    const [existing] = await pool.query('SELECT * FROM users WHERE email = ?', [userEmail]);
    
    if (existing.length > 0) {
      const user = existing[0];
      if (user.is_verified) {
        return res.status(400).json({ error: { message: 'An account with this email already exists. Please log in.' } });
      }

      // User exists but is unverified: update password and resend OTP
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(password, salt);
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      await pool.query(
        'UPDATE users SET password_hash = ?, otp_code = ?, otp_expires_at = ?, name = ? WHERE id = ?',
        [password_hash, otp, expiresAt, userName, user.id]
      );

      // Get farm name
      const [farmRows] = await pool.query('SELECT name FROM farms WHERE id = ?', [user.farm_id]);
      const activeFarmName = farmRows[0]?.name || farmName;

      const emailResult = await sendOtpEmail(userEmail, otp, activeFarmName);

      return res.json({
        success: true,
        requires_otp: true,
        email: userEmail,
        farm_name: activeFarmName,
        dev_otp: !emailResult?.success ? otp : undefined,
        message: emailResult?.success
          ? 'A 6-digit verification code has been sent to your email.'
          : `Verification code generated! (Sandbox code: ${otp})`
      });
    }

    // Create new Farm
    const farmId = crypto.randomUUID();
    const codePrefix = farmName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase() || 'FARM';
    const farmCode = `${codePrefix}-${Math.floor(1000 + Math.random() * 9000)}`;

    await pool.query(
      'INSERT INTO farms (id, name, code) VALUES (?, ?, ?)',
      [farmId, farmName, farmCode]
    );

    // Create Admin User (Unverified until OTP is confirmed)
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    const userId = crypto.randomUUID();
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await pool.query(
      `INSERT INTO users (id, farm_id, name, email, password_hash, role, phone, is_verified, otp_code, otp_expires_at) 
       VALUES (?, ?, ?, ?, ?, 'admin', ?, FALSE, ?, ?)`,
      [userId, farmId, userName, userEmail, password_hash, phone, otp, expiresAt]
    );

    // Send OTP email
    const emailResult = await sendOtpEmail(userEmail, otp, farmName);

    res.json({
      success: true,
      requires_otp: true,
      email: userEmail,
      farm_name: farmName,
      dev_otp: !emailResult?.success ? otp : undefined,
      message: emailResult?.success
        ? 'A 6-digit verification code has been sent to your email.'
        : `Verification code generated! (Sandbox code: ${otp})`
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: { message: err.message || 'Server error during registration' } });
  }
});

// Verify Email OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    const userEmail = (email || '').trim().toLowerCase();
    const code = (otp || '').trim();

    if (!userEmail || !code) {
      return res.status(400).json({ error: { message: 'Email and OTP code are required' } });
    }

    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [userEmail]);
    if (users.length === 0) {
      return res.status(404).json({ error: { message: 'User not found' } });
    }

    const user = users[0];

    if (user.is_verified) {
      // Already verified, generate session
      const [farms] = await pool.query('SELECT * FROM farms WHERE id = ?', [user.farm_id]);
      const farm = farms[0] || {};
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role, farm_id: user.farm_id }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({
        data: {
          user: { id: user.id, email: user.email, role: user.role, name: user.name, farm_id: user.farm_id, farm_name: farm.name, farm_code: farm.code },
          session: { access_token: token }
        }
      });
    }

    if (user.otp_code !== code) {
      return res.status(400).json({ error: { message: 'Invalid 6-digit verification code. Please check your email.' } });
    }

    if (user.otp_expires_at && new Date() > new Date(user.otp_expires_at)) {
      return res.status(400).json({ error: { message: 'Verification code has expired. Please click Resend Code.' } });
    }

    // Activate user
    await pool.query(
      'UPDATE users SET is_verified = TRUE, otp_code = NULL, otp_expires_at = NULL WHERE id = ?',
      [user.id]
    );

    const [farms] = await pool.query('SELECT * FROM farms WHERE id = ?', [user.farm_id]);
    const farm = farms[0] || {};

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, farm_id: user.farm_id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      message: 'Account verified successfully!',
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.name,
          farm_id: user.farm_id,
          farm_name: farm.name || 'My Farm',
          farm_code: farm.code || ''
        },
        session: { access_token: token }
      }
    });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ error: { message: err.message || 'Server error verifying OTP' } });
  }
});

// Resend OTP
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;
    const userEmail = (email || '').trim().toLowerCase();

    if (!userEmail) {
      return res.status(400).json({ error: { message: 'Email is required' } });
    }

    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [userEmail]);
    if (users.length === 0) {
      return res.status(404).json({ error: { message: 'User not found' } });
    }

    const user = users[0];
    if (user.is_verified) {
      return res.json({ message: 'Account is already verified. Please log in.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await pool.query('UPDATE users SET otp_code = ?, otp_expires_at = ? WHERE id = ?', [otp, expiresAt, user.id]);

    const [farms] = await pool.query('SELECT name FROM farms WHERE id = ?', [user.farm_id]);
    const farmName = farms[0]?.name || 'AgroHerd';

    const emailResult = await sendOtpEmail(userEmail, otp, farmName);

    res.json({
      success: true,
      dev_otp: !emailResult?.success ? otp : undefined,
      message: emailResult?.success
        ? 'A fresh 6-digit verification code has been sent to your email.'
        : `A new verification code was generated! (Sandbox code: ${otp})`
    });
  } catch (err) {
    console.error('Resend OTP error:', err);
    res.status(500).json({ error: { message: 'Failed to resend verification code' } });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const userEmail = (email || '').trim().toLowerCase();

    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [userEmail]);
    if (users.length === 0) {
      return res.status(401).json({ error: { message: 'Invalid email or password' } });
    }

    const user = users[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!validPassword) {
      return res.status(401).json({ error: { message: 'Invalid email or password' } });
    }

    // Check email verification status
    if (!user.is_verified) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      await pool.query('UPDATE users SET otp_code = ?, otp_expires_at = ? WHERE id = ?', [otp, expiresAt, user.id]);

      const [farms] = await pool.query('SELECT name FROM farms WHERE id = ?', [user.farm_id]);
      const emailResult = await sendOtpEmail(userEmail, otp, farms[0]?.name || 'AgroHerd');

      return res.status(403).json({
        error: {
          message: emailResult?.success
            ? 'Your email has not been verified yet. We have sent a 6-digit verification code to your email.'
            : `Please enter your verification code. (Sandbox code: ${otp})`,
          requires_otp: true,
          dev_otp: !emailResult?.success ? otp : undefined,
          email: userEmail
        }
      });
    }

    await pool.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

    const [farms] = await pool.query('SELECT * FROM farms WHERE id = ?', [user.farm_id]);
    const farm = farms[0] || {};

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, farm_id: user.farm_id },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.name,
          phone: user.phone,
          farm_id: user.farm_id,
          farm_name: farm.name || 'My Farm',
          farm_code: farm.code || ''
        },
        session: { access_token: token }
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: { message: 'Server error during login' } });
  }
});

// Get User Profile with Farm Details
router.get('/me', verifyToken, async (req, res) => {
  try {
    const [users] = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.phone, u.profile_pic, u.is_active, u.farm_id, f.name as farm_name, f.code as farm_code 
       FROM users u 
       LEFT JOIN farms f ON u.farm_id = f.id 
       WHERE u.id = ?`,
      [req.user.id]
    );

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
    const { name, phone, farm_name } = req.body;
    await pool.query('UPDATE users SET name = ?, phone = ? WHERE id = ?', [name, phone, req.user.id]);
    
    // If admin and farm_name provided, update farm name
    if (farm_name && req.user.role === 'admin' && req.user.farm_id) {
      await pool.query('UPDATE farms SET name = ? WHERE id = ?', [farm_name, req.user.farm_id]);
    }
    
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
