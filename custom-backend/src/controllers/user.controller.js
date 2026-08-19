const pool = require('../db/pool');

async function getMe(req, res) {
  try {
    const userId = req.userId;

    const result = await pool.query(
      `SELECT id, email, full_name, display_name, bio, role, created_at
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('GetMe error:', err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
}

module.exports = { getMe };