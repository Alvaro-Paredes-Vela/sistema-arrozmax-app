const express = require('express');
const db = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  const umbrales = db.all(
    'SELECT * FROM alertas_umbral WHERE usuario_id = ? ORDER BY creado_en DESC',
    [req.usuario.id]
  );
  res.json(umbrales);
});

router.post('/', requireAuth, (req, res) => {
  try {
    const { condicion, precio_objetivo, zona_filtro } = req.body;

    if (!condicion || !precio_objetivo) {
      return res.status(400).json({ error: 'Faltan datos de la alerta.' });
    }
    if (!['mayor_a', 'menor_a'].includes(condicion)) {
      return res.status(400).json({ error: 'Condición inválida.' });
    }

    const id = db.nextId('alertas_umbral');
    db.run(
      `INSERT INTO alertas_umbral (id, usuario_id, condicion, precio_objetivo, zona_filtro, disparada)
       VALUES (?, ?, ?, ?, ?, 0)`,
      [id, req.usuario.id, condicion, precio_objetivo, zona_filtro || null]
    );

    res.status(201).json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al crear la alerta.' });
  }
});

module.exports = router;
