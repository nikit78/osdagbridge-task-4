const pool = require('../db/pool');
const fs = require('fs');
const path = require('path');

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

async function downloadFile(req, res) {
  try {
    const userId = req.userId;
    const fileId = req.params.id;

    const result = await pool.query(
      `SELECT file_name, mime_type, storage_path
       FROM files
       WHERE id = $1 AND owner_id = $2`,
      [fileId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = result.rows[0];

    // NOTE: storage_path values were seeded as placeholders (e.g. /storage/alice/notes.txt)
    // and don't correspond to real files on disk. In a production system these would
    // point to real files (local disk or cloud storage) written at actual upload time.
    // We simulate a real download here so the endpoint is fully testable end-to-end.
    const fakeContent = `This is a simulated download for "${file.file_name}" (${file.mime_type}).\nIn production this would stream the real file bytes from ${file.storage_path}.`;

    res.setHeader('Content-Disposition', `attachment; filename="${file.file_name}"`);
    res.setHeader('Content-Type', file.mime_type);
    return res.status(200).send(fakeContent);
  } catch (err) {
    console.error('DownloadFile error:', err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
}


module.exports = { listFiles, getFile, downloadFile };