const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { listFiles, getFile } = require('../controllers/file.controller');

router.get('/files', requireAuth, listFiles);
router.get('/files/:id', requireAuth, getFile);

module.exports = router;