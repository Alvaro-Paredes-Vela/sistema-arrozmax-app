const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'arrozmax.sqlite');

let SQL = null;
let db = null;

function persist() {
  const data = db.export();
  fs.writeFileSync(DB_FILE, Buffer.from(data));
}

function run(sql, params = []) {
  db.run(sql, params);
  persist();
}

function get(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  let row = null;
  if (stmt.step()) row = stmt.getAsObject();
  stmt.free();
  return row;
}

function all(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function nextId(table) {
  const row = get(`SELECT MAX(id) as maxId FROM ${table}`);
  return (row && row.maxId ? row.maxId : 0) + 1;
}

async function init() {
  SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    const fileBuffer = fs.readFileSync(DB_FILE);
    db = new SQL.Database(fileBuffer);
    return;
  }

  db = new SQL.Database();

  db.run(`
    CREATE TABLE usuarios (
      id INTEGER PRIMARY KEY,
      nombre TEXT NOT NULL,
      telefono TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      rol TEXT NOT NULL,
      zona TEXT,
      beneficiadora_id INTEGER,
      plan TEXT DEFAULT 'ingenio_pequeno',
      creado_en TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE beneficiadoras (
      id INTEGER PRIMARY KEY,
      nombre TEXT NOT NULL,
      tipo TEXT NOT NULL,
      zona TEXT NOT NULL,
      telefono TEXT NOT NULL,
      verificado INTEGER DEFAULT 0
    );

    CREATE TABLE precios (
      id INTEGER PRIMARY KEY,
      beneficiadora_id INTEGER NOT NULL,
      beneficiadora TEXT NOT NULL,
      zona TEXT NOT NULL,
      precio_bs REAL NOT NULL,
      calidad TEXT DEFAULT 'Estándar',
      verificado INTEGER DEFAULT 0,
      fecha_hora TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE alertas (
      id INTEGER PRIMARY KEY,
      tipo TEXT NOT NULL,
      nivel TEXT NOT NULL,
      titulo TEXT NOT NULL,
      detalle TEXT NOT NULL,
      zona TEXT,
      reporte_id INTEGER,
      fecha_hora TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE alertas_umbral (
      id INTEGER PRIMARY KEY,
      usuario_id INTEGER NOT NULL,
      condicion TEXT NOT NULL,
      precio_objetivo REAL NOT NULL,
      zona_filtro TEXT,
      disparada INTEGER DEFAULT 0,
      creado_en TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE ofertas (
      id INTEGER PRIMARY KEY,
      zona TEXT NOT NULL,
      productores_ofreciendo INTEGER NOT NULL,
      volumen_total_qq REAL NOT NULL
    );

    CREATE TABLE zonas_coords (
      zona TEXT PRIMARY KEY,
      latitud REAL NOT NULL,
      longitud REAL NOT NULL
    );

    CREATE TABLE clima_cache (
      zona TEXT PRIMARY KEY,
      datos_json TEXT NOT NULL,
      actualizado_en TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE reportes_plaga (
      id INTEGER PRIMARY KEY,
      usuario_id INTEGER NOT NULL,
      usuario_nombre TEXT NOT NULL,
      zona TEXT NOT NULL,
      tipo_plaga TEXT NOT NULL,
      descripcion TEXT,
      confirmaciones INTEGER DEFAULT 1,
      fecha_hora TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE reportes_plaga_confirmaciones (
      reporte_id INTEGER NOT NULL,
      usuario_id INTEGER NOT NULL,
      PRIMARY KEY (reporte_id, usuario_id)
    );
  `);


  // --- Seed data ---
  db.run(`INSERT INTO beneficiadoras (nombre, tipo, zona, telefono, verificado) VALUES
    ('Molino Santa Cruz', 'Beneficiadora', 'Montero', '77123456', 1),
    ('Arrocera del Norte', 'Beneficiadora', 'San Pedro', '77234567', 1),
    ('Ingenio Yapacaní SRL', 'Beneficiadora', 'Yapacaní', '77345678', 0),
    ('Comercializadora El Grano', 'Comercializadora', 'Mineros', '77456789', 1)
  `);

  db.run(`INSERT INTO precios (beneficiadora_id, beneficiadora, zona, precio_bs, calidad, verificado) VALUES
    (1, 'Molino Santa Cruz', 'Montero', 185, 'Primera', 1),
    (2, 'Arrocera del Norte', 'San Pedro', 178, 'Primera', 1),
    (3, 'Ingenio Yapacaní SRL', 'Yapacaní', 172, 'Estándar', 0),
    (4, 'Comercializadora El Grano', 'Mineros', 180, 'Primera', 1)
  `);

  db.run(`INSERT INTO alertas (tipo, nivel, titulo, detalle, zona) VALUES
    ('precio', 'info', 'Precio en alza', 'El precio del arroz subió un 4% esta semana en la región.', NULL)
  `);

  db.run(`INSERT INTO ofertas (zona, productores_ofreciendo, volumen_total_qq) VALUES
    ('Montero', 42, 3200),
    ('San Pedro', 28, 2100),
    ('Yapacaní', 19, 1400),
    ('Mineros', 15, 980)
  `);

  // Coordenadas reales aproximadas de cada zona (Santa Cruz, Bolivia)
  db.run(`INSERT INTO zonas_coords (zona, latitud, longitud) VALUES
    ('Montero', -17.3395, -63.2528),
    ('San Pedro', -17.1667, -63.2833),
    ('Yapacaní', -17.4167, -63.8500),
    ('Mineros', -17.1167, -63.2333)
  `);

  persist();
}

module.exports = { init, run, get, all, nextId };
