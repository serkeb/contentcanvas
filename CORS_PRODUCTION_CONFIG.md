# ⚡ Configuración CORS para Producción

## 🚨 IMPORTANTE: Leer ANTES de desplegar

Tu proyecto tiene configuración CORS para **desarrollo**. Antes de desplegar a producción, necesitás ajustar UNA línea en el backend.

---

## 📍 Archivo: `server.py` (Línea 37)

### Configuración ACTUAL (Desarrollo):
```python
CORS(app, origins=["http://localhost:5173"])
```

### Configuración RECOMENDADA para Producción:

**Opción A: Dominio específico (Más seguro)**
```python
# Reemplaza "http://localhost:5173" con tu dominio de Vercel
CORS(app, origins=["https://tu-app.vercel.app"])
```

**Opción B: Múltiples dominios (Si tenés varios frontends)**
```python
CORS(app, origins=[
    "https://tu-app.vercel.app",
    "https://otro-dominio.com"
])
```

**Opción C: Cualquier origen (NO recomendado para producción)**
```python
CORS(app, origins=["*"])
```

---

## 🔧 Cómo hacer el cambio SIN romper el proyecto

### Opción 1: Cambio temporal solo para producción
1. En tu repo local, NO cambies nada
2. En Railway/Render, configura las variables de entorno
3. Modifica CORS solo en el servidor de producción

### Opción 2: Usar variables de entorno (RECOMENDADO)
Cambia la línea 37 en `server.py`:

```python
# ANTES:
CORS(app, origins=["http://localhost:5173"])

# DESPUÉS:
import os

frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
CORS(app, origins=[frontend_url])
```

Luego configura `FRONTEND_URL` como variable de entorno en Railway/Render:
- Producción: `https://tu-app.vercel.app`
- Desarrollo: `http://localhost:5173`

---

## ✅ Verificación Final

Antes de hacer deploy, verificá:

### Backend:
- [ ] CORS configurado para el dominio correcto
- [ ] Variables de entorno listas
- [ ] Puerto del backend configurado

### Frontend:
- [ ] `BASE_URL` actualizada en `api.js`
- [ ] Variables de Supabase configuradas
- [ ] Build exitoso localmente

---

## 🚨 Si NO cambias CORS

**Síntoma:** El frontend carga pero las llamadas a la API fallan con error CORS  
**Solución:** Cambiar origins a tu dominio de Vercel

**Síntoma:** Error 401/403 al llamar a la API  
**Solución:** Verificar que el dominio esté en la lista de allowed origins

---

## 🎯 Resumen

**Cambio MÍNIMO requerido:**
- 1 línea en `server.py` (CORS)
- 1 línea en `client/src/canvas/utils/api.js` (BASE_URL)
- Variables de entorno en ambos servicios

**Todo lo demás está PERFECTO para Vercel.**
