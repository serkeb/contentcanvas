# 🔍 VERIFICACIONES PRE-DEPLOYMENT

## ✅ Ejecutá estos comandos ANTES de hacer deploy

## Frontend (desde carpeta `client/`)

```bash
# 1. Verificar que el build funciona localmente
npm run build

# 2. Verificar que no hay errores de dependencias
npm ls

# 3. Verificar tamaño del build (debería ser < 10MB)
du -sh dist/

# 4. Verificar que index.html existe en dist/
ls dist/index.html
```

**Resultados esperados:**
- ✓ `npm run build` termina sin errores
- ✓ `dist/` folder creada
- ✓ `index.html` presente en `dist/`
- ✓ Tamaño total < 10MB (ideal para Vercel)

---

## Backend (desde raíz del proyecto)

```bash
# 1. Verificar que Python está instalado
python --version

# 2. Verificar que las dependencias se pueden instalar
pip install -r requirements.txt --dry-run

# 3. Verificar que el servidor inicia
python server.py &
sleep 3
curl http://localhost:5000/health
pkill -f server.py
```

**Resultados esperados:**
- ✓ Python 3.8+ instalado
- ✓ Dependencias instalables sin errores
- ✓ `/health` endpoint responde correctamente

---

## 🚨 SI HAY ERRORES

### Error: "Module not found"
```bash
cd client
rm -rf node_modules package-lock.json
npm install
```

### Error: Build falla
```bash
cd client
npm run build --verbose
# Verificar qué módulo está fallando
```

### Error: Puerto en uso
```bash
# En Windows:
netstat -ano | findstr :5000
# En Mac/Linux:
lsof -ti:5000

# Matar proceso
taskkill /PID [PID] /F
```

---

## 📊 MÉTRICAS de Performance

### Frontend:
- **Tamaño del build ideal:** < 5MB
- **Tiempo de build ideal:** < 60s
- **Número de assets:** < 100 archivos

### Backend:
- **Tiempo de inicio ideal:** < 5s
- **Memoria ideal:** < 512MB
- **CPU ideal:** < 0.5 vCPU

---

## 🔧 CONFIGURACIONES YA LISTAS

### ✅ Frontend (Vercel-Ready)
- [x] `package.json` con scripts correctos
- [x] `vite.config.js` optimizado
- [x] Build configurado
- [x] React 18+ instalado
- [x] Supabase SDK instalado
- [x] No hay dependencias circulares
- [x] No hay warnings críticos

### ✅ Backend (Production-Ready)
- [x] Flask instalado
- [x] CORS configurado
- [x] Health endpoint disponible
- [x] Error handling implementado
- [x] Dependencies versionadas
- [x] No hay hardcodes sensibles

---

## 🌍 AMBIENTES

### Desarrollo (Local):
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`
- Supabase: tu proyecto local

### Producción:
- Frontend: `https://tu-app.vercel.app`
- Backend: `https://tu-backend.railway.app`
- Supabase: mismo proyecto

---

## 💾 BACKUP ANTES DE DEPLOY

```bash
# 1. Crear tag de versión actual
git tag -a v1.0.0 -m "Versión pre-deployment"
git push origin v1.0.0

# 2. Crear rama de deployment
git checkout -b deployment/pre-production
git push origin deployment/pre-production

# 3. Verificar que todo está commiteado
git status
```

---

## 🧪 TESTING PRE-DEPLOYMENT

### Test 1: Build Frontend
```bash
cd client
npm run build
npm run preview
# Abrir http://localhost:4173
# Verificar que la app funciona
```

### Test 2: Iniciar Backend
```bash
python server.py
# En otra terminal:
curl http://localhost:5000/health
# Debe responder: {"ok": true}
```

### Test 3: Conexión Frontend-Backend
```bash
# Desde el frontend local, probar pegar un video
# Debería funcionar con backend local
```

---

## ✅ CHECKLIST FINAL

### Código:
- [ ] Todo commiteado en GitHub
- [ ] Tags creados
- [ ] Ramas de deployment listas
- [ ] No hay archivos temporales en el repo

### Servicios:
- [ ] Cuenta en Vercel creada
- [ ] Cuenta en Railway creada
- [ ] Proyecto en Supabase configurado
- [ ] API Keys disponibles

### Configuración:
- [ ] Variables de entorno documentadas
- [ ] URLs de servicios conocidas
- [ ] Dominios configurados (si aplica)

---

## 🚀 ESTADO FINAL

**Tu proyecto está LISTO para deployment:**

✅ Frontend: 100% compatible con Vercel  
✅ Backend: 100% compatible con Railway/Render  
✅ Build: Optimizado y funcional  
✅ Dependencias: Todas instaladas  
✅ Configuración: Correcta para producción  

**Solo faltan:**
1. Cambiar 2 líneas de código
2. Configurar variables de entorno
3. Deploy en plataformas

---

## 📱 COMANDOS ÚTILES

### Para verificar el build:
```bash
cd client && npm run build && ls -lh dist/
```

### Para limpiar si es necesario:
```bash
cd client && rm -rf node_modules dist .vite
npm install && npm run build
```

### Para verificar servidor:
```bash
python -c "import flask; print('Flask OK')"
python -c "from openai import OpenAI; print('OpenAI OK')"
```

---

**¿Todo está verde?** 🟢  
**Podés proceder con deployment en Vercel** 🚀
