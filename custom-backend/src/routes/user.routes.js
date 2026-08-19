const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { getMe } = require('../controllers/user.controller');

router.get('/me', requireAuth, getMe);

module.exports = router;