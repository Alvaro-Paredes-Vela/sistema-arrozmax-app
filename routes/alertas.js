const express = require('express');
const db = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  const { zona } = req.query;
  let alertas;
  if (zona) {
    alertas = db.all(
      'SELECT * FROM alertas WHERE zona = ? OR zona IS NULL ORDER BY fecha_hora DESC',
      [zona]
    );
  } else {
    alertas = db.all('SELECT * FROM alertas ORDER BY fecha_hora DESC');
  }
  res.json(alertas);
});

module.exports = router;
