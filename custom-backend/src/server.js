require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const pool = require('./db/pool');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const fileRoutes = require('./routes/file.routes');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use('/', authRoutes);
app.use('/', userRoutes);
app.use('/', fileRoutes);

app.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'ok', db_time: result.rows[0].now });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Database connection failed' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});