const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const db = require('./db');
const { actualizarClimaTodasLasZonas } = require('./services/clima');

const authRoutes = require('./routes/auth');
const preciosRoutes = require('./routes/precios');
const alertasRoutes = require('./routes/alertas');
const beneficiadorasRoutes = require('./routes/beneficiadoras');
const ofertasRoutes = require('./routes/ofertas');
const alertasUmbralRoutes = require('./routes/alertasUmbral');
const reportesRoutes = require('./routes/reportes');
const climaRoutes = require('./routes/clima');
const reportesPlagaRoutes = require('./routes/reportesPlaga');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ ok: true, servicio: 'ArrozMax API', hora: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/precios', preciosRoutes);
app.use('/api/alertas', alertasRoutes);
app.use('/api/beneficiadoras', beneficiadorasRoutes);
app.use('/api/ofertas', ofertasRoutes);
app.use('/api/alertas-umbral', alertasUmbralRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/clima', climaRoutes);
app.use('/api/reportes-plaga', reportesPlagaRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada.' });
});

db.init()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ ArrozMax API corriendo en http://localhost:${PORT}`);
    });

    // Actualiza el clima real al arrancar el servidor...
    actualizarClimaTodasLasZonas();

    // ...y luego cada 3 horas automáticamente.
    cron.schedule('0 */3 * * *', () => {
      console.log('⏰ Actualizando clima programado...');
      actualizarClimaTodasLasZonas();
    });
  })
  .catch((err) => {
    console.error('❌ Error al iniciar la base de datos:', err);
    process.exit(1);
  });
