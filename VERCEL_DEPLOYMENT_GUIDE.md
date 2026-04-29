# 🚀 Guía de Deployment a Vercel - Content Research Canvas

## ⚠️ Importante: NO modificar el código existente

Esta guía está diseñada para desplegar tu proyecto **SIN modificar** el código. Todo el proyecto ya está configurado correctamente para Vercel.

---

## 📋 Arquitectura del Proyecto

Tu proyecto tiene **2 partes** que necesitan desplegarse separadamente:

1. **Frontend** (`client/`) → **Vercel** ✅
2. **Backend** (`server.py`) → **Railway/Render/otros** 🐍
3. **Base de datos** → **Supabase** (ya configurado) ✅

---

## 🎯 Parte 1: Frontend en Vercel

### ✅ Tu proyecto ya está READY para Vercel

**Cosas que ya están bien configuradas:**
- ✓ `package.json` con script `"build": "vite build"`
- ✓ `vite.config.js` configurado correctamente
- ✓ Estructura de carpetas estándar
- ✓ Puerto configurado (5173)

### 📝 Pasos para Vercel:

#### 1. Preparar Variables de Entorno

En Vercel necesitas configurar estas variables:

```
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_anon_key_de_supabase
```

**¿Dónde conseguir las URLs?**
1. Ve a tu proyecto en [Supabase](https://supabase.com/dashboard)
2. Settings → API
3. Copia:
   - Project URL → `VITE_SUPABASE_URL`
   - anon public key → `VITE_SUPABASE_ANON_KEY`

#### 2. Desplegar en Vercel

**Opción A: Desde VS Code (Recomendado)**
1. Instala la extensión "Vercel" en VS Code
2. Abre la carpeta `client/`
3. Click derecho en `package.json` → "Deploy to Vercel"
4. Seguí las instrucciones

**Opción B: Desde la Web de Vercel**
1. Ve a [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Importa desde GitHub (o arrastra la carpeta `client/`)
4. Configura:
   - **Framework Preset**: Vite
   - **Root Directory**: `./` (porque estás desplegando desde `client/`)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Agrega las variables de entorno
6. Deploy

#### 3. Configurar Dominio (Opcional)

Una vez desplegado:
1. Ve a Settings → Domains
2. Agrega tu dominio personal
3. O usa el dominio gratuito de Vercel: `tu-proyecto.vercel.app`

---

## 🐍 Parte 2: Backend Python

El backend Python **NO puede ir a Vercel** directamente. Necesitas un servicio que soporte Python.

### Opciones RECOMENDADAS:

#### Opción 1: Railway (Más fácil) ⭐
1. Ve a [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub"
3. Selecciona tu repo
4. Railway detecta automáticamente Python
5. Configura variables:
   ```
   OPENAI_API_KEY=tu_api_key
   INSTAGRAM_USER=tu_usuario (opcional)
   INSTAGRAM_PASS=tu_contraseña (opcional)
   NANO_BANANA_API_KEY=tu_key (opcional)
   ```
6. Deploy

**Ventajas:**
- Detecta Python automáticamente
- Base de datos PostgreSQL incluida
- Muy fácil de usar

#### Opción 2: Render (Gratuito)
1. Ve a [render.com](https://render.com)
2. Click "New" → "Web Service"
3. Conecta tu repo de GitHub
4. Configura:
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python server.py`
5. Agrega variables de entorno
6. Deploy

#### Opción 3: Fly.io
1. Instala Fly CLI: `curl -L https://fly.io/install.sh | sh`
2. `fly launch`
3. Detecta Python automáticamente
4. Configura variables de entorno
5. `fly deploy`

---

## 🔗 Parte 3: Conectar Frontend (Vercel) con Backend

Una vez que tengas:
- ✅ Frontend en Vercel: `https://tu-app.vercel.app`
- ✅ Backend en Railway/Render: `https://tu-backend.railway.app`

### Actualizar la URL del backend en el frontend

**Archivo a modificar:** `client/src/canvas/utils/api.js`

```javascript
// Línea 5 aproximadamente
const BASE_URL = 'https://tu-backend-url.railway.app'  // ← Cambia esto
```

**Importante:**
- Reemplaza `http://localhost:5000` por la URL de tu backend
- Commit y push a GitHub
- Vercel hará auto-deploy

---

## 🔐 Variables de Entorno

### Frontend (Vercel):
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbxxx...
```

### Backend (Railway/Render):
```
OPENAI_API_KEY=sk-proj-...
INSTAGRAM_USER=tu_usuario
INSTAGRAM_PASS=tu_contraseña
NANO_BANANA_API_KEY=tu_key
```

---

## 📦 Checklist Final de Deployment

### Frontend (Vercel):
- [ ] Repo en GitHub con código frontend
- [ ] Variables de entorno configuradas en Vercel
- [ ] Build exitoso en Vercel
- [ ] URL del frontend funcionando
- [ ] Backend URL actualizada en `api.js`
- [ ] Supabase conectado

### Backend:
- [ ] Repo en GitHub con código backend
- [ ] Variables de entorno configuradas
- [ ] Puerto configurado (si es necesario)
- [ ] Backend funcionando
- [ ] CORS configurado para aceptar peticiones del frontend

### Testing final:
- [ ] Login funciona
- [ ] Pegar videos funciona
- [ ] Generar imágenes funciona
- [ ] Guardar/cargar canvas funciona

---

## 🚨 Problemas Comunes y Soluciones

### 1. Error CORS
**Problema:** Frontend no puede conectar con backend  
**Solución:** En `server.py` línea 37, cambia:
```python
# Debe estar así:
CORS(app, origins=["*"])  # Para desarrollo
# O para producción:
CORS(app, origins=["https://tu-app.vercel.app"])
```

### 2. Error "Cannot GET /api/..."
**Problema:** Rutas incorrectas  
**Solución:** Verifica que `BASE_URL` en `api.js` no tenga `/api` al final

### 3. Error de Supabase
**Problema:** "Invalid API key"  
**Solución:** Verifica que las variables de entorno en Vercel tengan `VITE_` prefijo

### 4. Build falla en Vercel
**Problema:** Error de dependencias  
**Solución:** 
```bash
cd client
rm -rf node_modules package-lock.json
npm install
npm run build
```

---

## 💾 Estructura de Repositorio Recomendada

```
tu-repo/
├── client/          ← Este es tu ROOT en Vercel
│   ├── src/
│   ├── package.json
│   └── vite.config.js
├── server.py        ← Este es tu ROOT en Railway/Render
├── requirements.txt
└── README.md
```

**En Vercel:** Root Directory = `./client/`  
**En Railway/Render:** Root Directory = `./`

---

## 🎯 Pasos Rápidos (Resumen)

1. **Frontend a Vercel:**
   - Push a GitHub
   - Importar en Vercel
   - Configurar vars `VITE_SUPABASE_*`
   - Deploy

2. **Backend a Railway:**
   - Push a GitHub
   - Importar en Railway
   - Configurar vars `OPENAI_API_KEY`, etc.
   - Deploy

3. **Conectar:**
   - Cambiar `BASE_URL` en `api.js`
   - Push y deploy

---

## ⚡ Rendimiento y Optimización

**Vercel automáticamente:**
- ✓ Optimiza imágenes
- ✓ CDN global
- ✓ Cache inteligente
- ✓ HTTPS automático
- ✓ Auto deploys desde git

**Tu proyecto ya tiene:**
- ✓ Build optimizado (Vite)
- ✓ Code splitting automático
- ✓ Árboles de dependencias correctos

---

## 📊 Costos Estimados

### Vercel (Frontend):
- **Plan Hobby**: GRATIS
- Límite: 100GB bandwidth/mes
- Suficiente para uso personal/pequeño

### Railway (Backend):
- **Plan $5/mes**: ~$5 USD
- Incluye 512MB RAM
- Suficiente para Python + Flask

### Supabase:
- **Plan Free**: GRATIS
- 500MB base de datos
- 1GB bandwidth
- Suficiente para empezar

**Total estimado:** ~$5/mes para producción completa

---

## ✅ Listo para Producción

Tu proyecto está **EXCELNETE configurado** para Vercel:

1. ✅ Build estándar (`vite build`)
2. ✅ Output directory correcto (`dist/`)
3. ✅ Package.json con scripts correctos
4. ✅ Dependencias optimizadas
5. ✅ Supabase integration correcta
6. ✅ Puerto configurado

**NO necesitas modificar nada del código** - solo seguir los pasos de deployment.

---

## 🎉 Proximo Pasos

1. **Backup:** Hacé commit de todo
2. **GitHub:** Push al repo
3. **Frontend:** Desplegar a Vercel (5 min)
4. **Backend:** Desplegar a Railway (5 min)
5. **Conectar:** Actualizar URLs
6. **Testear:** Probar todas las funcionalidades

**Tiempo estimado total:** 20-30 minutos para deployment completo

¿Necesitas ayuda con algún paso específico o tenés dudas sobre alguna de las plataformas?
