const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'arrozmax_dev_secret_cambia_esto_en_produccion';

function generarToken(usuario) {
  return jwt.sign(
    { id: usuario.id, telefono: usuario.telefono, rol: usuario.rol },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'No autorizado. Token faltante.' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.usuario = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token inválido o expirado. Inicia sesión de nuevo.' });
  }
}

module.exports = { generarToken, requireAuth, JWT_SECRET };
