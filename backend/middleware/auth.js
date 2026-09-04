const jwt = require('jsonwebtoken');
const pool = require('../db');
const crypto = require('crypto');

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(403).json({ error: { message: 'A token is required for authentication' } });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(403).json({ error: { message: 'Invalid token format' } });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_agroherd');
    req.user = decoded;

    // Refresh role and farm_id from database to guarantee accurate role and farm
    const [rows] = await pool.query('SELECT id, farm_id, role, is_active FROM users WHERE id = ?', [decoded.id]);
    if (rows.length > 0) {
      req.user.role = rows[0].role; // Strictly preserve role ('worker' or 'admin')
      req.user.farm_id = rows[0].farm_id;

      // If user somehow doesn't have a farm_id, auto-link to or create a farm
      if (!req.user.farm_id) {
        const [defaultFarm] = await pool.query('SELECT id FROM farms LIMIT 1');
        if (defaultFarm.length > 0) {
          await pool.query('UPDATE users SET farm_id = ? WHERE id = ?', [defaultFarm[0].id, decoded.id]);
          req.user.farm_id = defaultFarm[0].id;
        } else {
          const newFarmId = crypto.randomUUID();
          const farmCode = `FARM-${Math.floor(1000 + Math.random() * 9000)}`;
          await pool.query('INSERT INTO farms (id, name, code) VALUES (?, "My Dairy Farm", ?)', [newFarmId, farmCode]);
          await pool.query('UPDATE users SET farm_id = ? WHERE id = ?', [newFarmId, decoded.id]);
          req.user.farm_id = newFarmId;
        }
      }
    }
  } catch (err) {
    return res.status(401).json({ error: { message: 'Invalid Token' } });
  }
  return next();
};

module.exports = { verifyToken };
