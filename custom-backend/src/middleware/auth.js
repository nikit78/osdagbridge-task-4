const { verifyToken } = require('../utils/jwt');
const pool = require('../db/pool');

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const { sub: userId, sid: sessionId } = decoded;

    // Check the session is still active (not revoked, not expired)
    const sessionResult = await pool.query(
      `SELECT id, user_id, revoked_at, expires_at
       FROM sessions
       WHERE id = $1 AND user_id = $2`,
      [sessionId, userId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(401).json({ error: 'Session not found' });
    }

    const session = sessionResult.rows[0];

    if (session.revoked_at !== null) {
      return res.status(401).json({ error: 'Session has been revoked' });
    }

    if (new Date(session.expires_at) < new Date()) {
      return res.status(401).json({ error: 'Session has expired' });
    }

    // Attach authenticated user info to the request for downstream handlers
    req.userId = userId;
    req.sessionId = sessionId;

    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(500).json({ error: 'Authentication error' });
  }
}

module.exports = { requireAuth };