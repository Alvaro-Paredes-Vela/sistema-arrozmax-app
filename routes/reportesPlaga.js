const express = require('express');
const db = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();

const NIVEL_POR_CONFIRMACIONES = (confirmaciones) => {
  if (confirmaciones >= 5) return 'alto';
  if (confirmaciones >= 2) return 'medio';
  return 'info';
};

function sincronizarAlertaDesdeReporte(reporte) {
  // Busca si ya existe una alerta de plaga generada desde este reporte y actualiza su nivel/detalle
  const nivel = NIVEL_POR_CONFIRMACIONES(reporte.confirmaciones);
  const titulo = `Reporte de ${reporte.tipo_plaga}`;
  const detalle = `${reporte.usuario_nombre} reportó presencia de ${reporte.tipo_plaga} en ${reporte.zona}.${reporte.descripcion ? ' ' + reporte.descripcion : ''} (${reporte.confirmaciones} productor${reporte.confirmaciones === 1 ? '' : 'es'} lo confirma${reporte.confirmaciones === 1 ? '' : 'n'}).`;

  const existente = db.get(
    `SELECT id FROM alertas WHERE tipo = 'plaga' AND zona = ? AND titulo = ? ORDER BY id DESC LIMIT 1`,
    [reporte.zona, titulo]
  );

  if (existente) {
    db.run('UPDATE alertas SET nivel = ?, detalle = ?, reporte_id = ?, fecha_hora = CURRENT_TIMESTAMP WHERE id = ?', [
      nivel,
      detalle,
      reporte.id,
      existente.id,
    ]);
  } else {
    const id = db.nextId('alertas');
    db.run(
      `INSERT INTO alertas (id, tipo, nivel, titulo, detalle, zona, reporte_id, fecha_hora)
       VALUES (?, 'plaga', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [id, nivel, titulo, detalle, reporte.zona, reporte.id]
    );
  }
}

// Listar reportes de plagas (opcionalmente filtrados por zona)
router.get('/', requireAuth, (req, res) => {
  const { zona } = req.query;
  const reportes = zona
    ? db.all('SELECT * FROM reportes_plaga WHERE zona = ? ORDER BY fecha_hora DESC', [zona])
    : db.all('SELECT * FROM reportes_plaga ORDER BY fecha_hora DESC');
  res.json(reportes);
});

// Crear un nuevo reporte de plaga
router.post('/', requireAuth, (req, res) => {
  try {
    const { zona, tipo_plaga, descripcion } = req.body;

    if (!zona || !tipo_plaga) {
      return res.status(400).json({ error: 'Faltan datos del reporte (zona y tipo de plaga).' });
    }

    const usuario = db.get('SELECT * FROM usuarios WHERE id = ?', [req.usuario.id]);

    const id = db.nextId('reportes_plaga');
    db.run(
      `INSERT INTO reportes_plaga (id, usuario_id, usuario_nombre, zona, tipo_plaga, descripcion, confirmaciones, fecha_hora)
       VALUES (?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)`,
      [id, usuario.id, usuario.nombre, zona, tipo_plaga, descripcion || null]
    );

    db.run('INSERT INTO reportes_plaga_confirmaciones (reporte_id, usuario_id) VALUES (?, ?)', [id, usuario.id]);

    const reporte = db.get('SELECT * FROM reportes_plaga WHERE id = ?', [id]);
    sincronizarAlertaDesdeReporte(reporte);

    res.status(201).json(reporte);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al crear el reporte de plaga.' });
  }
});

// Confirmar ("también lo vi") un reporte existente de otro productor
router.post('/:id/confirmar', requireAuth, (req, res) => {
  try {
    const reporte = db.get('SELECT * FROM reportes_plaga WHERE id = ?', [req.params.id]);
    if (!reporte) return res.status(404).json({ error: 'Reporte no encontrado.' });

    const yaConfirmo = db.get(
      'SELECT * FROM reportes_plaga_confirmaciones WHERE reporte_id = ? AND usuario_id = ?',
      [reporte.id, req.usuario.id]
    );
    if (yaConfirmo) {
      return res.status(409).json({ error: 'Ya confirmaste este reporte.' });
    }

    db.run('INSERT INTO reportes_plaga_confirmaciones (reporte_id, usuario_id) VALUES (?, ?)', [
      reporte.id,
      req.usuario.id,
    ]);
    db.run('UPDATE reportes_plaga SET confirmaciones = confirmaciones + 1 WHERE id = ?', [reporte.id]);

    const actualizado = db.get('SELECT * FROM reportes_plaga WHERE id = ?', [reporte.id]);
    sincronizarAlertaDesdeReporte(actualizado);

    res.json(actualizado);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al confirmar el reporte.' });
  }
});

module.exports = router;
