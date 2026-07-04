const express = require('express');
const db = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  const { zona } = req.query;

  if (zona) {
    const row = db.get('SELECT * FROM clima_cache WHERE zona = ?', [zona]);
    if (!row) return res.status(404).json({ error: 'Sin datos de clima para esa zona todavía.' });
    return res.json({ zona: row.zona, datos: JSON.parse(row.datos_json), actualizado_en: row.actualizado_en });
  }

  const rows = db.all('SELECT * FROM clima_cache');
  res.json(rows.map((r) => ({ zona: r.zona, datos: JSON.parse(r.datos_json), actualizado_en: r.actualizado_en })));
});

module.exports = router;
