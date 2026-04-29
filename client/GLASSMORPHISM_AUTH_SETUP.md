# 🎨 Configuración de Autenticación Glassmorphism

Guía paso a paso para implementar la autenticación con Supabase y el diseño glassmorphism en tu app.

## 📋 Requisitos Previos

1. Tener una cuenta en [Supabase](https://supabase.com)
2. Haber creado el proyecto en Supabase (ya configuramos la base de datos)
3. Node.js y npm instalados

## 🚀 Configuración Paso a Paso

### 1. Instalar Dependencias

```bash
cd client
npm install @supabase/supabase-js lucide-react
```

### 2. Configurar Variables de Entorno

Crea el archivo `.env` en la carpeta `client/`:

```bash
cd client
cp .env.example .env
```

Edita `.env` con tus credenciales de Supabase:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui
```

**¿Dónde obtener estas credenciales?**

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Settings → API
4. Copia:
   - Project URL → `VITE_SUPABASE_URL`
   - anon/public key → `VITE_SUPABASE_ANON_KEY`

### 3. Habilitar Auth en Supabase

En tu dashboard de Supabase:

1. Ve a **Authentication** → **Settings**
2. Habilita **Email Auth**
3. Configura:

```
✅ Enable email provider
✅ Confirm email: Disabled (para desarrollo)
✅ Email templates: Personalizar si quieres
```

### 4. Configurar Redirect URLs

En **Authentication** → **URL Configuration**:

```
Redirect URLs:
http://localhost:5173/**

Site URL:
http://localhost:5173
```

### 5. Estructura de Archivos

Tu estructura ahora debería ser:

```
client/
├── src/
│   ├── components/
│   │   ├── AuthScreen.tsx           # Pantalla glassmorphism ✨
│   │   ├── LoginScreen.tsx          # (backup, puedes borrar)
│   │   └── AuthScreenSwitcher.tsx   # Selector de estilos
│   ├── hooks/
│   │   └── useAuth.ts              # Hook de autenticación
│   ├── lib/
│   │   └── supabase.ts             # Cliente de Supabase
│   ├── types/
│   │   └── database.ts             # Tipos TypeScript
│   ├── canvas/
│   │   └── utils/
│   │       ├── storage.js          # LocalStorage original
│   │       └── cloudStorage.ts     # Supabase storage (nuevo)
│   ├── services/
│   │   └── cacheService.ts         # Caché de transcripciones
│   ├── App.jsx                     # App principal (actualizado)
│   └── main.jsx
├── .env                            # Variables de entorno (crear)
├── .env.example                    # Template
└── package.json
```

### 6. Actualizar Import en Otros Archivos

Si estás usando `storage.js` en otros archivos, cámbialo a `cloudStorage.ts`:

```javascript
// Antes
import { saveBoard, loadBoard } from './canvas/utils/storage'

// Después
import { saveBoard, loadBoard } from './canvas/utils/cloudStorage'
```

### 7. Probar la Autenticación

Inicia la app:

```bash
cd client
npm run dev
```

Abre http://localhost:5173 y deberías ver:

1. ✅ Pantalla de login glassmorphism con gradientes
2. ✅ Campos de email y contraseña con iconos
3. ✅ Botones animados con hover effects
4. ✅ Transición suave entre login y registro

## 🧪 Testing

### Registrar un Nuevo Usuario

1. Haz clic en "¿No tienes cuenta? Regístrate"
2. Llena los campos:
   - Nombre completo
   - Email
   - Contraseña (mínimo 6 caracteres)
3. Click en "Crear cuenta"
4. ✅ Deberías ver mensaje de éxito

### Iniciar Sesión

1. Ingresa email y contraseña
2. Click en "Iniciar sesión"
3. ✅ Deberías acceder al canvas principal

### Verificar en Supabase

En tu dashboard de Supabase:

1. **Authentication** → **Users** → Ver usuarios creados
2. **Database** → **Table Editor** → Ver datos en tablas:
   - `users` - Usuario creado
   - `boards` - Tableros del usuario
   - `brand_voices` - Brand voices
   - etc.

## 🎨 Personalización del Diseño Glassmorphism

### Cambiar Colores del Gradiente

Edita `client/src/components/AuthScreen.tsx`:

```jsx
// Gradiente actual (indigo → purple → pink)
bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500

// Ejemplos de otros gradientes:
from-blue-600 via-cyan-500 to-teal-400      // Azul oceano
from-emerald-500 via-green-500 to-teal-500 // Verde naturaleza
from-orange-500 via-red-500 to-pink-500    // Atardecer
from-violet-600 via-purple-600 to-fuchsia-600 // Violeta intenso
```

### Cambiar el Logo

Reemplaza el icono `Sparkles`:

```jsx
import { YourLogo } from './YourLogo'

// En el componente, reemplaza:
<Sparkles className="w-8 h-8 text-white" />

// Por:
<YourLogo className="w-8 h-8 text-white" />
```

### Modificar Textos

```jsx
<h1 className="text-3xl font-bold text-white">
  {isSignUp ? 'Crea tu cuenta' : 'Bienvenido de nuevo'}
</h1>

// Personalizar para tu marca:
{isSignUp ? 'Únete a Content Research' : 'Bienvenido a Content Research'}
```

## 🔒 Seguridad

### Producción

Cuando pases a producción:

1. **Habilitar confirmación de email** en Supabase
2. **Usar variables de entorno** reales (nunca commitear `.env`)
3. **Verificar políticas RLS** en cada tabla
4. **Implementar rate limiting** en Supabase

### .gitignore

Asegúrate de tener en `.gitignore`:

```
# Environment variables
.env
.env.local
.env.*.local
```

## 🐛 Troubleshooting

### Error: "Invalid API key"

**Problema**: Las variables de entorno no están configuradas correctamente.

**Solución**:
1. Verifica que `.env` exista en la carpeta `client/`
2. Confirma que las credenciales sean correctas
3. Reinicia el servidor: `npm run dev`

### Error: "Auth session missing"

**Problema**: El usuario no está autenticado.

**Solución**:
1. Verifica que Auth esté habilitado en Supabase
2. Revisa las Redirect URLs
3. Limpia localStorage y vuelve a intentar

### No se guarda en Supabase

**Problema**: Las políticas RLS bloquean el acceso.

**Solución**:
1. Ve a Database → Tables → Tu tabla
2. Verifica que RLS esté habilitado
3. Revisa las políticas en "RLS Policies"
4. Ejecuta `SELECT * FROM users` en SQL Editor para verificar

## 📱 Responsive Design

El diseño glassmorphism funciona perfectamente en:

- ✅ Mobile (< 640px)
- ✅ Tablet (640px - 1024px)
- ✅ Desktop (> 1024px)

## 🎯 Próximos Pasos

Ahora que tienes autenticación funcionando:

1. **Implementar logout** en el canvas
2. **Agregar perfil de usuario** (editar nombre, avatar)
3. **Social auth** (Google, GitHub)
4. **Recuperación de contraseña**
5. **Verificación de email**

## 📚 Recursos Útiles

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Lucide Icons](https://lucide.dev/icons/)
- [Vite Env Variables](https://vitejs.dev/guide/env-and-mode.html)