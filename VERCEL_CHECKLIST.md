# ✅ CHECKLIST - Deployment a Vercel

## 🎯 Tu proyecto está **99% READY** para Vercel

Aquí está lo único que necesitás hacer **SIN modificar la estructura del código**:

---

## 📋 PASO 1: Preparación (5 min)

### Frontend - Vercel
- [ ] Tu código está en GitHub
- [ ] La carpeta `client/` tiene `package.json`
- [ ] El script `"build": "vite build"` existe ✅ (ya está)
- [ ] Vite config está correcto ✅ (ya está)

### Backend - Railway/Render
- [ ] Tu código está en GitHub
- [ ] `requirements.txt` existe ✅ (ya está)
- [ ] `server.py` existe ✅ (ya está)

---

## 📋 PASO 2: Variables de Entorno (3 min)

### Para Vercel (Frontend):
```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-key-anon
```

### Para Railway (Backend):
```
OPENAI_API_KEY=sk-proj-...
FRONTEND_URL=https://tu-app.vercel.app
```

---

## 📋 PASO 3: Deployment (10 min)

### Frontend → Vercel:
1. Ve a [vercel.com/new](https://vercel.com/new)
2. "Import Git Repository"
3. Selecciona tu repo
4. **Framework Preset**: Vite
5. **Root Directory**: `./client/`
6. **Build Command**: `npm run build`
7. **Output Directory**: `dist`
8. Configure environment variables
9. "Deploy"

### Backend → Railway:
1. Ve a [railway.app/new](https://railway.app/new)
2. "Deploy from GitHub"
3. Selecciona tu repo
4. **Root Directory**: `./` (raíz del repo)
5. Configure environment variables
6. "Deploy"

---

## 📋 PASO 4: Conexión (2 min)

### Cambiar UNA línea en el frontend:

**Archivo:** `client/src/canvas/utils/api.js`  
**Línea 5:** Cambiar `BASE_URL`

```javascript
// ANTES:
const BASE_URL = 'http://localhost:5000'

// DESPUÉS:
const BASE_URL = 'https://tu-backend.railway.app'
```

---

## 📋 PASO 5: Verificación (5 min)

### Testeo:
- [ ] Login con Supabase funciona
- [ ] Pegar videos funciona
- [ ] Generar imágenes funciona
- [ ] Guardar canvas funciona
- [ ] No hay errores CORS

---

## 🚨 SOLO ESTO necesitas cambiar:

### 1. CORS en backend (1 línea)
**Archivo:** `server.py` (línea 37)
```python
# CAMBIAR ESTO:
CORS(app, origins=["http://localhost:5173"])

# POR ESTO:
CORS(app, origins=["https://tu-app.vercel.app"])
```

### 2. Backend URL en frontend (1 línea)
**Archivo:** `client/src/canvas/utils/api.js` (línea 5)
```javascript
// CAMBIAR ESTO:
const BASE_URL = 'http://localhost:5000'

// POR ESTO:
const BASE_URL = 'https://tu-backend.railway.app'
```

### 3. Variables de entorno
- Frontend (Vercel): 2 variables
- Backend (Railway): 3 variables

---

## ✅ VERIFICACIÓN FINAL

Tu proyecto YA TIENE:
- ✅ Build optimizado
- ✅ Scripts correctos
- ✅ Dependencias instaladas
- ✅ Supabase configurado
- ✅ Estructura correcta

**Solo faltan:**
- 🔄 Cambiar 2 líneas de código
- 🔄 Configurar 5 variables de entorno
- 🔄 Deploy en 2 plataformas

---

## 🎉 RESULTADO

**Tiempo total:** ~25 minutos  
**Costo:** ~$5/mes  
**Dificultad:** Media

¿Estás listo para deploy? ¿Necesitas ayuda con algún paso específico?
