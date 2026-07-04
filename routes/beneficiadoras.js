const express = require('express');
const db = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  const directorio = db.all('SELECT * FROM beneficiadoras ORDER BY nombre ASC');
  res.json(directorio);
});

module.exports = router;
