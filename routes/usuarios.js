const express = require('express');
const db = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();

const PLANES_VALIDOS = ['ingenio_pequeno', 'ingenio_mediano', 'institucional'];

function usuarioPublico(u) {
  return {
    id: u.id,
    nombre: u.nombre,
    telefono: u.telefono,
    rol: u.rol,
    zona: u.zona,
    beneficiadora_id: u.beneficiadora_id,
    plan: u.plan,
  };
}

router.post('/plan', requireAuth, (req, res) => {
  try {
    const { plan } = req.body;

    if (!plan || !PLANES_VALIDOS.includes(plan)) {
      return res.status(400).json({ error: 'Plan inválido.' });
    }

    db.run('UPDATE usuarios SET plan = ? WHERE id = ?', [plan, req.usuario.id]);

    const usuario = db.get('SELECT * FROM usuarios WHERE id = ?', [req.usuario.id]);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    res.json({ usuario: usuarioPublico(usuario) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al actualizar el plan.' });
  }
});

module.exports = router;