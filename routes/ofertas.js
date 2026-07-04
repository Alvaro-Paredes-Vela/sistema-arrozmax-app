const express = require('express');
const db = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();

router.get('/resumen-zonas', requireAuth, (req, res) => {
  const resumen = db.all('SELECT * FROM ofertas ORDER BY volumen_total_qq DESC');
  res.json(resumen);
});

module.exports = router;
