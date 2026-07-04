# ArrozMax — Backend API

API en Node.js + Express que da vida al frontend `ArrozMax` (Alpine.js).
Usa SQLite embebido (`sql.js`) — no necesitas contratar ni configurar una base de datos aparte.

## Endpoints incluidos

- `POST /api/auth/registro` — crear cuenta (productor / beneficiadora / comercializadora)
- `POST /api/auth/login` — iniciar sesión
- `GET  /api/precios` — listar precios (requiere token)
- `POST /api/precios` — publicar un precio (requiere token)
- `GET  /api/alertas?zona=X` — alertas de clima/plagas/precio
- `GET  /api/beneficiadoras` — directorio de compradores
- `GET  /api/ofertas/resumen-zonas` — datos para el mapa de oferta/demanda
- `GET  /api/alertas-umbral` — mis alertas de precio configuradas
- `POST /api/alertas-umbral` — crear alerta de precio
- `GET  /api/reportes/precios/excel` — descarga .xlsx
- `GET  /api/reportes/precios/pdf` — descarga .pdf
- `GET  /api/health` — chequeo de salud (sin auth)

Todas las rutas menos `/auth/*` y `/health` requieren el header:
`Authorization: Bearer <token>`

## Cómo correrlo en tu computadora

```bash
npm install
npm start
```

El servidor arranca en `http://localhost:3000`. La base de datos se crea
automáticamente en `arrozmax.sqlite` con datos de ejemplo la primera vez.

## Cómo desplegarlo gratis en Render.com

1. Sube esta carpeta a un repositorio de GitHub (puede ser privado).
2. Entra a https://render.com → **New +** → **Web Service**.
3. Conecta tu repo de GitHub.
4. Configuración:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
5. En la pestaña **Environment**, agrega una variable:
   - `JWT_SECRET` = cualquier texto largo y aleatorio (ej: genera uno en
     https://randomkeygen.com)
6. Dale a **Create Web Service**. Cuando termine el despliegue, Render te
   dará una URL como `https://arrozmax-api.onrender.com`.
7. Prueba que funciona visitando `https://arrozmax-api.onrender.com/api/health`
   — debe responder `{"ok":true,...}`.

## Conectar el frontend

En el HTML de ArrozMax, reemplaza esta línea:

```javascript
const API_URL = 'https://TU-BACKEND-DESPLEGADO.onrender.com/api';
```

por tu URL real de Render, terminando en `/api`:

```javascript
const API_URL = 'https://arrozmax-api.onrender.com/api';
```

## Nota sobre el plan gratuito de Render

Los servicios gratuitos de Render "duermen" tras 15 minutos sin uso, y la
**primera petición después de dormir puede tardar hasta 30-50 segundos**
en responder mientras el servidor despierta. Es normal — no es un error.
Si esto molesta a tus usuarios, considera el plan pago más económico de
Render (~$7/mes) que mantiene el servicio siempre activo.

## Datos de ejemplo incluidos

Al primer arranque se crean automáticamente:
- 4 beneficiadoras/comercializadoras (Montero, San Pedro, Yapacaní, Mineros)
- 4 precios de ejemplo
- 3 alertas (clima, plaga, precio)
- Resumen de oferta por las 4 zonas

Puedes editar estos datos directamente en `db.js` (sección `Seed data`)
antes del primer despliegue, o luego administrando la base de datos.
