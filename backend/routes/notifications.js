const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

// Get notifications for current farm
router.get('/', async (req, res) => {
  try {
    const { is_read, limit } = req.query;
    
    let query = `SELECT n.*, c.tag_number FROM notifications n LEFT JOIN cows c ON n.cow_id = c.id WHERE (n.farm_id = ? OR n.farm_id IS NULL) AND (n.user_id = ? OR n.user_id IS NULL)`;
    const params = [req.user.farm_id, req.user.id];
    
    if (is_read !== undefined) {
      query += ` AND n.is_read = ?`;
      params.push(is_read === 'true');
    }
    
    query += ` ORDER BY n.created_at DESC`;
    
    if (limit) {
      query += ` LIMIT ?`;
      params.push(parseInt(limit));
    }
    
    const [rows] = await db.query(query, params);
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get unread count
router.get('/count', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT COUNT(*) as count FROM notifications WHERE (farm_id = ? OR farm_id IS NULL) AND (user_id = ? OR user_id IS NULL) AND is_read = false`,
      [req.user.farm_id, req.user.id]
    );
    res.json({ count: rows[0].count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update single notification
router.put('/:id', async (req, res) => {
  try {
    const { is_read } = req.body;
    await db.query(`UPDATE notifications SET is_read = ? WHERE id = ? AND (farm_id = ? OR farm_id IS NULL)`, [is_read, req.params.id, req.user.farm_id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark all as read
router.post('/mark-read', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !ids.length) return res.json({ success: true });
    
    await db.query(`UPDATE notifications SET is_read = true WHERE id IN (?) AND (farm_id = ? OR farm_id IS NULL)`, [ids, req.user.farm_id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete notification
router.delete('/:id', async (req, res) => {
  try {
    await db.query(`DELETE FROM notifications WHERE id = ? AND (farm_id = ? OR farm_id IS NULL)`, [req.params.id, req.user.farm_id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
