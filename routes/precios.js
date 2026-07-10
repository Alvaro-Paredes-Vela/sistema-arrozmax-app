const express = require('express');
const db = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  const precios = db.all('SELECT * FROM precios ORDER BY precio_bs DESC');
  res.json({ precios });
});

router.post('/', requireAuth, (req, res) => {
  try {
    let { beneficiadora_id, precio_bs } = req.body;

    if (!precio_bs) {
      return res.status(400).json({ error: 'Faltan datos del precio.' });
    }

    // Compatibilidad con cuentas B2B creadas antes de que el registro
    // vinculara automáticamente una fila en "beneficiadoras": si el
    // usuario logueado no trae beneficiadora_id, se la creamos ahora.
    if (!beneficiadora_id) {
      const usuarioActual = db.get('SELECT * FROM usuarios WHERE id = ?', [req.usuario.id]);
      if (!usuarioActual) {
        return res.status(404).json({ error: 'Usuario no encontrado.' });
      }
      if (usuarioActual.beneficiadora_id) {
        beneficiadora_id = usuarioActual.beneficiadora_id;
      } else {
        const nuevaId = db.nextId('beneficiadoras');
        const tipo = usuarioActual.rol === 'beneficiadora' ? 'Beneficiadora' : 'Comercializadora';
        db.run(
          `INSERT INTO beneficiadoras (id, nombre, tipo, zona, telefono, verificado)
           VALUES (?, ?, ?, ?, ?, 0)`,
          [nuevaId, usuarioActual.nombre, tipo, usuarioActual.zona || 'Montero', usuarioActual.telefono]
        );
        db.run('UPDATE usuarios SET beneficiadora_id = ? WHERE id = ?', [nuevaId, usuarioActual.id]);
        beneficiadora_id = nuevaId;
      }
    }

    const beneficiadora = db.get('SELECT * FROM beneficiadoras WHERE id = ?', [beneficiadora_id]);
    if (!beneficiadora) {
      return res.status(404).json({ error: 'Beneficiadora no encontrada.' });
    }

    const id = db.nextId('precios');
    db.run(
      `INSERT INTO precios (id, beneficiadora_id, beneficiadora, zona, precio_bs, calidad, verificado, fecha_hora)
       VALUES (?, ?, ?, ?, ?, 'Primera', ?, CURRENT_TIMESTAMP)`,
      [id, beneficiadora.id, beneficiadora.nombre, beneficiadora.zona, precio_bs, beneficiadora.verificado]
    );

    // Revisar alertas de umbral que se disparan con este nuevo precio
    const umbrales = db.all('SELECT * FROM alertas_umbral WHERE disparada = 0');
    umbrales.forEach((u) => {
      if (u.zona_filtro && u.zona_filtro !== beneficiadora.zona) return;
      const cumple =
        (u.condicion === 'mayor_a' && precio_bs >= u.precio_objetivo) ||
        (u.condicion === 'menor_a' && precio_bs <= u.precio_objetivo);
      if (cumple) {
        db.run('UPDATE alertas_umbral SET disparada = 1 WHERE id = ?', [u.id]);
      }
    });

    res.status(201).json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al publicar el precio.' });
  }
});

module.exports = router;