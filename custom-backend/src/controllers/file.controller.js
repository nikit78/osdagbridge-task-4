const pool = require('../db/pool');

async function listFiles(req, res) {
  try {
    const userId = req.userId;

    const result = await pool.query(
      `SELECT id, file_name, mime_type, size_bytes, uploaded_at
       FROM files
       WHERE owner_id = $1
       ORDER BY uploaded_at DESC`,
      [userId]
    );

    return res.status(200).json(result.rows);
  } catch (err) {
    console.error('ListFiles error:', err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
}

async function getFile(req, res) {
  try {
    const userId = req.userId;
    const fileId = req.params.id;

    const result = await pool.query(
      `SELECT id, file_name, mime_type, size_bytes, uploaded_at
       FROM files
       WHERE id = $1 AND owner_id = $2`,
      [fileId, userId]
    );

    if (result.rows.length === 0) {
      // Same error whether the file doesn't exist OR belongs to someone else
      return res.status(404).json({ error: 'File not found' });
    }

    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('GetFile error:', err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
}

module.exports = { listFiles, getFile };