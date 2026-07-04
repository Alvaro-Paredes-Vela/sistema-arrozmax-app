# ArrozMax — Backend API

API en Node.js + Express que da vida al frontend `ArrozMax` (Alpine.js).
Usa SQLite embebido (`sql.js`) — no necesitas contratar ni configurar una base de datos aparte.

## Endpoints incluidos

- `POST /api/auth/registro` — crear cuenta (productor / beneficiadora / comercializadora)
- `POST /api/auth/login` — iniciar sesión
- `GET  /api/precios` — listar precios (requiere token)
- `POST /api/precios` — publicar un precio (requiere token) — **Opción A: precios reales cargados por las beneficiadoras/comercializadoras**
- `GET  /api/alertas?zona=X` — alertas de clima/plagas/precio (unificadas, esto es lo que ya consume el frontend)
- `GET  /api/clima?zona=X` — datos crudos de clima real (temperatura, lluvia, viento) por zona, cacheados desde Open-Meteo
- `GET  /api/reportes-plaga?zona=X` — listar reportes comunitarios de plagas
- `POST /api/reportes-plaga` — un productor reporta una plaga en su zona
- `POST /api/reportes-plaga/:id/confirmar` — otro productor confirma ("también lo vi")
- `GET  /api/beneficiadoras` — directorio de compradores
- `GET  /api/ofertas/resumen-zonas` — datos para el mapa de oferta/demanda
- `GET  /api/alertas-umbral` — mis alertas de precio configuradas
- `POST /api/alertas-umbral` — crear alerta de precio
- `GET  /api/reportes/precios/excel` — descarga .xlsx
- `GET  /api/reportes/precios/pdf` — descarga .pdf
- `GET  /api/health` — chequeo de salud (sin auth)

## Clima real (Open-Meteo)

El backend consulta automáticamente la API gratuita de Open-Meteo
(https://open-meteo.com — sin API key, sin costo) para las 4 zonas
(Montero, San Pedro, Yapacaní, Mineros) usando sus coordenadas reales.

- Se actualiza **al arrancar el servidor** y luego **cada 3 horas** (cron job).
- Si detecta lluvia fuerte prevista, viento fuerte, helada o calor extremo,
  genera automáticamente una alerta en la tabla `alertas` con `tipo: 'clima'`,
  la cual tu app ya muestra sin ningún cambio en el frontend.
- Evita duplicar la misma alerta si ya se generó una igual en las últimas 12h.
- Puedes ajustar los umbrales (mm de lluvia, km/h de viento, °C) editando
  `services/clima.js`, función `evaluarAlertas`.

**Importante:** en algunos entornos de prueba con firewall restrictivo la
API de Open-Meteo puede no ser alcanzable, pero en Render.com (o cualquier
hosting normal con salida a internet libre) funciona sin configuración
adicional — no requiere clave ni cuenta.

## Sistema comunitario de plagas

En vez de depender de una fuente automática (que no existe para plagas),
los propios productores reportan lo que ven en campo:

1. Un productor llama a `POST /api/reportes-plaga` con la zona, tipo de
   plaga (ej. "Sogata") y una descripción opcional.
2. Esto crea el reporte y genera automáticamente una alerta visible para
   todos los productores de esa zona.
3. Otros productores pueden confirmar el mismo reporte con
   `POST /api/reportes-plaga/:id/confirmar` ("también lo vi").
4. El **nivel de la alerta sube automáticamente** según cuántos productores
   confirmen: 1 confirmación = informativo, 2-4 = medio, 5+ = alto.

Esto le da credibilidad real a las alertas sin necesitar un sensor o
servicio externo — es exactamente como funcionan los sistemas de alerta
temprana comunitaria en agricultura.

**Nota sobre el frontend:** el HTML actual todavía no tiene un formulario
para que el productor reporte una plaga (solo muestra las alertas). Si
quieres, puedo agregar esa pantalla al HTML para completar el flujo.

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
