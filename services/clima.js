const db = require('../db');

// Open-Meteo es gratuita y no requiere API key.
const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';

async function obtenerClimaZona(zona, lat, lon) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    daily: 'precipitation_sum,precipitation_probability_max,temperature_2m_max,temperature_2m_min,wind_speed_10m_max',
    current: 'temperature_2m,precipitation,weather_code,wind_speed_10m',
    timezone: 'America/La_Paz',
    forecast_days: '3',
  });

  const res = await fetch(`${OPEN_METEO_URL}?${params.toString()}`);
  if (!res.ok) throw new Error(`Open-Meteo respondió ${res.status} para ${zona}`);
  return res.json();
}

function evaluarAlertas(zona, datos) {
  const alertas = [];
  const daily = datos.daily;
  const current = datos.current;

  if (!daily) return alertas;

  // Lluvia fuerte prevista en las próximas 48h
  const lluviaManana = daily.precipitation_sum?.[1] ?? 0;
  const probManana = daily.precipitation_probability_max?.[1] ?? 0;
  if (lluviaManana >= 20 && probManana >= 60) {
    alertas.push({
      tipo: 'clima',
      nivel: lluviaManana >= 40 ? 'alto' : 'medio',
      titulo: 'Lluvias intensas previstas',
      detalle: `Se esperan ${lluviaManana.toFixed(0)} mm de lluvia mañana en ${zona}, con ${probManana.toFixed(0)}% de probabilidad. Considere proteger la cosecha almacenada.`,
      zona,
    });
  }

  // Viento fuerte
  const vientoManana = daily.wind_speed_10m_max?.[1] ?? 0;
  if (vientoManana >= 40) {
    alertas.push({
      tipo: 'clima',
      nivel: vientoManana >= 60 ? 'alto' : 'medio',
      titulo: 'Vientos fuertes previstos',
      detalle: `Se esperan ráfagas de hasta ${vientoManana.toFixed(0)} km/h en ${zona} mañana. Asegure techos y estructuras livianas.`,
      zona,
    });
  }

  // Riesgo de helada (temperatura mínima baja, poco común en tierras bajas pero se evalúa igual)
  const tempMinManana = daily.temperature_2m_min?.[1];
  if (tempMinManana !== undefined && tempMinManana <= 5) {
    alertas.push({
      tipo: 'clima',
      nivel: tempMinManana <= 2 ? 'alto' : 'medio',
      titulo: 'Riesgo de helada',
      detalle: `Se prevé una temperatura mínima de ${tempMinManana.toFixed(0)}°C en ${zona}. Tome precauciones si tiene plantines jóvenes.`,
      zona,
    });
  }

  // Calor extremo
  const tempMaxManana = daily.temperature_2m_max?.[1];
  if (tempMaxManana !== undefined && tempMaxManana >= 38) {
    alertas.push({
      tipo: 'clima',
      nivel: tempMaxManana >= 42 ? 'alto' : 'medio',
      titulo: 'Ola de calor prevista',
      detalle: `Se esperan hasta ${tempMaxManana.toFixed(0)}°C en ${zona} mañana. Considere ajustar el riego.`,
      zona,
    });
  }

  return alertas;
}

async function actualizarClimaTodasLasZonas() {
  const zonas = db.all('SELECT * FROM zonas_coords');

  for (const z of zonas) {
    try {
      const datos = await obtenerClimaZona(z.zona, z.latitud, z.longitud);

      // Cachear datos crudos para servir sin re-consultar la API en cada request
      const existente = db.get('SELECT zona FROM clima_cache WHERE zona = ?', [z.zona]);
      if (existente) {
        db.run(
          'UPDATE clima_cache SET datos_json = ?, actualizado_en = CURRENT_TIMESTAMP WHERE zona = ?',
          [JSON.stringify(datos), z.zona]
        );
      } else {
        db.run(
          'INSERT INTO clima_cache (zona, datos_json, actualizado_en) VALUES (?, ?, CURRENT_TIMESTAMP)',
          [z.zona, JSON.stringify(datos)]
        );
      }

      const nuevasAlertas = evaluarAlertas(z.zona, datos);

      for (const alerta of nuevasAlertas) {
        // Evitar duplicar la misma alerta si ya existe una igual en las últimas 12 horas
        const reciente = db.get(
          `SELECT id FROM alertas
           WHERE tipo = ? AND zona = ? AND titulo = ?
           AND datetime(fecha_hora) >= datetime('now', '-12 hours')`,
          [alerta.tipo, alerta.zona, alerta.titulo]
        );
        if (reciente) continue;

        const id = db.nextId('alertas');
        db.run(
          `INSERT INTO alertas (id, tipo, nivel, titulo, detalle, zona, fecha_hora)
           VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [id, alerta.tipo, alerta.nivel, alerta.titulo, alerta.detalle, alerta.zona]
        );
      }

      console.log(`🌦️  Clima actualizado para ${z.zona}: ${nuevasAlertas.length} alerta(s) nueva(s)`);
    } catch (e) {
      console.warn(`⚠️  No se pudo actualizar clima para ${z.zona}:`, e.message);
    }
  }
}

module.exports = { actualizarClimaTodasLasZonas, obtenerClimaZona };
