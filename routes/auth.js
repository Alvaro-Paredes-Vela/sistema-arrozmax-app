const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { generarToken } = require('../auth');

const router = express.Router();

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

router.post('/registro', (req, res) => {
  try {
    const { nombre, telefono, password, rol, zona } = req.body;

    if (!nombre || !telefono || !password || !rol) {
      return res.status(400).json({ error: 'Faltan campos obligatorios.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
    }
    const rolesValidos = ['productor', 'beneficiadora', 'comercializadora'];
    if (!rolesValidos.includes(rol)) {
      return res.status(400).json({ error: 'Rol inválido.' });
    }

    const existente = db.get('SELECT id FROM usuarios WHERE telefono = ?', [telefono]);
    if (existente) {
      return res.status(409).json({ error: 'Ya existe una cuenta con este número de teléfono.' });
    }

    const hash = bcrypt.hashSync(password, 10);
    const id = db.nextId('usuarios');

    db.run(
      `INSERT INTO usuarios (id, nombre, telefono, password_hash, rol, zona, plan)
       VALUES (?, ?, ?, ?, ?, ?, 'ingenio_pequeno')`,
      [id, nombre, telefono, hash, rol, zona || null]
    );

    const usuario = db.get('SELECT * FROM usuarios WHERE id = ?', [id]);
    const token = generarToken(usuario);

    res.status(201).json({ token, usuario: usuarioPublico(usuario) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al crear la cuenta. Intenta de nuevo.' });
  }
});

router.post('/login', (req, res) => {
  try {
    const { telefono, password } = req.body;

    if (!telefono || !password) {
      return res.status(400).json({ error: 'Ingresa tu teléfono y contraseña.' });
    }

    const usuario = db.get('SELECT * FROM usuarios WHERE telefono = ?', [telefono]);
    if (!usuario) {
      return res.status(401).json({ error: 'Teléfono o contraseña incorrectos.' });
    }

    const valido = bcrypt.compareSync(password, usuario.password_hash);
    if (!valido) {
      return res.status(401).json({ error: 'Teléfono o contraseña incorrectos.' });
    }

    const token = generarToken(usuario);
    res.json({ token, usuario: usuarioPublico(usuario) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al iniciar sesión. Intenta de nuevo.' });
  }
});

module.exports = router;
