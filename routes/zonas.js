const express = require("express");
const db = require("../db");
const { requireAuth } = require("../auth");

const router = express.Router();

// Pública: se usa incluso antes de iniciar sesión (pantalla de registro)
router.get("/", (req, res) => {
  try {
    const zonas = db.all(
      "SELECT zona, latitud, longitud FROM zonas_coords ORDER BY zona ASC",
    );
    res.json(zonas);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al cargar las zonas." });
  }
});

router.post("/", requireAuth, (req, res) => {
  try {
    const { zona, latitud, longitud } = req.body;

    if (
      !zona ||
      latitud === undefined ||
      latitud === null ||
      longitud === undefined ||
      longitud === null
    ) {
      return res
        .status(400)
        .json({
          error: "Faltan campos: zona, latitud y longitud son obligatorios.",
        });
    }

    const lat = Number(latitud);
    const lng = Number(longitud);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res
        .status(400)
        .json({ error: "Latitud y longitud deben ser números." });
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res
        .status(400)
        .json({ error: "Latitud u longitud fuera de rango válido." });
    }

    const existente = db.get("SELECT zona FROM zonas_coords WHERE zona = ?", [
      zona,
    ]);
    if (existente) {
      return res
        .status(409)
        .json({ error: "Ya existe una zona con ese nombre." });
    }

    db.run(
      "INSERT INTO zonas_coords (zona, latitud, longitud) VALUES (?, ?, ?)",
      [zona, lat, lng],
    );

    // La sección de Mapa muestra "ofertas" (productores_ofreciendo / volumen_total_qq),
    // no "zonas_coords". Sin esta fila, la zona recién agregada nunca aparecería listada
    // ni tendría datos que visualizar en el resumen del mapa.
    const ofertaExistente = db.get("SELECT zona FROM ofertas WHERE zona = ?", [
      zona,
    ]);
    if (!ofertaExistente) {
      db.run(
        "INSERT INTO ofertas (zona, productores_ofreciendo, volumen_total_qq) VALUES (?, 0, 0)",
        [zona],
      );
    }

    const zonas = db.all(
      "SELECT zona, latitud, longitud FROM zonas_coords ORDER BY zona ASC",
    );
    res.status(201).json(zonas);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al agregar la zona." });
  }
});

module.exports = router;
