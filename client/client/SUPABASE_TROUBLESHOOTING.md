# 🔧 Solución de Problemas - Conexión Supabase

## ⚠️ Problema: No se puede conectar a Supabase

El nombre del proyecto `julbaobendgltyrwhir.supabase.co` no está respondiendo.

## 🎯 **SOLUCIÓN RÁPIDA**

### Paso 1: Verificar tu proyecto en Supabase Dashboard

1. **Ve a**: https://supabase.com/dashboard
2. **Selecciona tu proyecto**: "julbaobendgltyrwhir"
3. **Ve a**: Settings → API
4. **Copia las credenciales exactas**:

Deberías ver algo como:
```
Project URL: https://xxxxxxxxxxxxx.supabase.co
Project API Key (anon/public): eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Paso 2: Identificar el problema

**A. Si el proyecto NO aparece en tu dashboard:**
- El proyecto puede haber sido eliminado
- Necesitas crear un nuevo proyecto

**B. Si el proyecto SÍ aparece:**
- La URL puede ser diferente
- Copia exactamente lo que dice "Project URL"
- Puede que sea algo como `https://abc123def456.supabase.co`

### Paso 3: Actualizar el archivo .env

Una vez tengas la URL correcta:

```bash
# Editar archivo .env
cd client
```

Reemplazar las líneas:
```env
VITE_SUPABASE_URL=https://LA_URL_CORRECTA_AQUI.supabase.co
VITE_SUPABASE_ANON_KEY=LA_ANON_KEY_CORRECTA_AQUI
```

### Paso 4: Reiniciar el servidor

```bash
# Matar cualquier proceso anterior
npm run dev
```

---

## 🚨 **DIAGNÓSTICO**

### Test de conexión

Ejecuta este comando para probar la conexión:

```bash
curl -I "https://julbaobendgltyrwhir.supabase.co"
```

**Si dice "Could not resolve host":**
- El proyecto no existe o el nombre está mal

**Si dice "200 OK" o similar:**
- El proyecto existe pero hay otro problema

---

## 🆘 **SOLUCIÓN ALTERNATIVA**

Si el proyecto fue eliminado o no existe:

### Crear un nuevo proyecto en Supabase

1. **Ir a**: https://supabase.com/dashboard
2. **Click**: "New Project"
3. **Nombre**: "Content Research Canvas"
4. **Database Password**: (elegir una segura)
5. **Region**: (elegir la más cercana a ti)
6. **Click**: "Create new project"

### Una vez creado el proyecto:

1. **Ir a**: Settings → API
2. **Copiar**:
   - Project URL
   - anon/public key
3. **Pegar** en el archivo `.env`

---

## 📋 **CHECKLIST**

Antes de continuar, verifica:

- [ ] El proyecto aparece en tu dashboard de Supabase
- [ ] La URL del proyecto es correcta
- [ ] La anon key es correcta
- [ ] El archivo .env está en la carpeta `client/`
- [ ] Las variables tienen el formato correcto:
  ```env
  VITE_SUPABASE_URL=https://xxxxx.supabase.co
  VITE_SUPABASE_ANON_KEY=eyJhbGci...
  ```

---

## 🎯 **PRÓXIMO PASO**

Una vez tengas las credenciales correctas:

**Opción A**: Dime las credenciales correctas y yo actualizo el archivo
**Opción B**: Tú mismo edita el archivo `client/.env` con las credenciales correctas

---

## ⚡ **SOLUCIÓN MÁS RÁPIDA**

Si quieres que configure todo de nuevo:

1. **Crea un proyecto nuevo en Supabase**
2. **Dime**: "Crear nuevo proyecto"
3. **Yo configuraré todo desde cero**

---

## 📞 **NECESITAS AYUDA**

Si no puedes acceder a tu dashboard de Supabase o el proyecto no aparece:

1. Verifica que estás logueado con la cuenta correcta
2. Revisa si hay múltiples organizaciones en Supabase
3. Contacta a soporte de Supabase

---

**¿Quieres que cree un proyecto nuevo desde cero?** 🚀