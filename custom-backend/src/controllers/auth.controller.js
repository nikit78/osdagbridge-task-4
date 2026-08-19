const pool = require('../db/pool');
const { hashPassword, comparePassword } = require('../utils/password');
const { signToken } = require('../utils/jwt');

async function register(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [normalizedEmail]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'A user with this email already exists' });
    }

    const passwordHash = await hashPassword(password);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash)
       VALUES ($1, $2)
       RETURNING id, email, created_at`,
      [normalizedEmail, passwordHash]
    );

    const user = result.rows[0];

    return res.status(201).json({
      id: user.id,
      email: user.email,
      created_at: user.created_at,
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const result = await pool.query(
      'SELECT id, email, password_hash FROM users WHERE email = $1',
      [normalizedEmail]
    );

    // Generic error — do NOT reveal whether the email exists
    const genericError = { error: 'Invalid email or password' };

    if (result.rows.length === 0) {
      return res.status(401).json(genericError);
    }

    const user = result.rows[0];
    const passwordMatches = await comparePassword(password, user.password_hash);

    if (!passwordMatches) {
      return res.status(401).json(genericError);
    }

    // Create a server-side session
    const expiresInMs = 60 * 60 * 1000; // 1 hour, matches JWT_EXPIRES_IN
    const sessionResult = await pool.query(
      `INSERT INTO sessions (user_id, expires_at)
       VALUES ($1, NOW() + INTERVAL '1 hour')
       RETURNING id`,
      [user.id]
    );
    const sessionId = sessionResult.rows[0].id;

    // JWT contains user id AND session id
    const token = signToken({ sub: user.id, sid: sessionId });

    return res.status(200).json({
      token,
      user: { id: user.id, email: user.email },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
}

async function logout(req, res) {
  try {
    const sessionId = req.sessionId;

    await pool.query(
      `UPDATE sessions
       SET revoked_at = NOW()
       WHERE id = $1`,
      [sessionId]
    );

    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
}

module.exports = { register, login, logout };