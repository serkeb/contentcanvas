# Content Research Canvas - Client

Frontend de Content Research Canvas con autenticación glassmorphism y Supabase.

## 🚀 Quick Start

```bash
# 1. Instalar dependencias (si no están instaladas)
npm install

# 2. Configurar Supabase
cp .env.example .env
# Edita .env con tus credenciales de Supabase

# 3. Verificar setup
npm run verify

# 4. Iniciar desarrollo
npm run dev
```

Abre http://localhost:5173

## ✨ Características

### 🎨 Diseño Glassmorphism
- Pantalla de login/registro con gradientes vibrantes
- Efectos de cristal (backdrop-blur)
- Partículas animadas de fondo
- Transiciones suaves (60fps)
- Responsive design (mobile, tablet, desktop)

### 🔐 Autenticación con Supabase
- Login/Registro con email y password
- Menú de usuario con dropdown
- Logout funcional
- Sesiones persistentes
- Seguridad RLS configurada

### 💾 Base de Datos Cloud
- 9 tablas en Supabase
- Políticas de seguridad RLS
- Sistema de caché inteligente
- Tracking de consumo de tokens
- Sincronización entre dispositivos

## 📁 Estructura del Proyecto

```
client/
├── src/
│   ├── components/          # Componentes React
│   │   ├── AuthScreen.tsx           # Pantalla glassmorphism
│   │   ├── UserMenu.tsx             # Menú de usuario
│   │   ├── LoginScreen.tsx          # (backup)
│   │   ├── MinimalAuthScreen.tsx    # Opción minimalista
│   │   ├── DarkAuthScreen.tsx       # Opción dark mode
│   │   ├── TypographyAuthScreen.tsx # Opción typography
│   │   └── AuthScreenSwitcher.tsx   # Selector de estilos
│   ├── canvas/              # Canvas principal
│   │   ├── ContentCanvas.jsx        # Componente principal
│   │   ├── nodes/                   # Nodos del canvas
│   │   ├── utils/                   # Utilidades
│   │   │   ├── storage.js           # LocalStorage original
│   │   │   └── cloudStorage.ts      # Supabase storage
│   │   └── edges/                   # Edges del canvas
│   ├── hooks/               # Custom React hooks
│   │   └── useAuth.ts               # Hook de autenticación
│   ├── lib/                 # Librerías
│   │   └── supabase.ts              # Cliente Supabase
│   ├── services/            # Servicios
│   │   └── cacheService.ts          # Caché de datos
│   ├── types/               # Tipos TypeScript
│   │   └── database.ts              # Tipos de Supabase
│   ├── App.jsx              # App principal con auth
│   └── main.jsx             # Entry point
├── .env.example            # Template de variables de entorno
├── .env                    # Variables de entorno (crear)
├── package.json            # Dependencias y scripts
├── vite.config.js          # Configuración de Vite
├── verify-setup.js         # Script de verificación
└── README.md               # Este archivo
```

## 🔧 Configuración

### Variables de Entorno

Crear archivo `.env`:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key
```

### Supabase Setup

1. **Habilitar Auth**
   ```
   Authentication → Settings → Email provider: Enable
   ```

2. **Configurar Redirect URLs**
   ```
   Authentication → URL Configuration
   Site URL: http://localhost:5173
   Redirect URLs: http://localhost:5173/**
   ```

## 📦 Dependencias Principales

```json
{
  "@supabase/supabase-js": "^2.103.3",
  "lucide-react": "^1.8.0",
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "@xyflow/react": "^12.3.5"
}
```

## 🎨 Componentes de Autenticación

### AuthScreen.tsx (Principal)
Diseño glassmorphism con gradientes y partículas.

```jsx
import AuthScreen from './components/AuthScreen'

<AuthScreen onAuthenticated={() => {}} />
```

### UserMenu.tsx
Menú de usuario con dropdown glassmorphism.

```jsx
import UserMenu from './components/UserMenu'

<UserMenu />
```

### useAuth.ts
Hook personalizado para autenticación.

```jsx
import { useAuth } from './hooks/useAuth'

const { user, loading, signIn, signUp, signOut } = useAuth()
```

## 📱 Scripts Disponibles

```bash
npm run dev          # Iniciar servidor de desarrollo
npm run build        # Crear build de producción
npm run preview      # Previsualizar build de producción
npm run verify       # Verificar configuración
npm run setup:auth   # Alias para verify
```

## 🎯 Flujo de Autenticación

```
Usuario → AuthScreen (glassmorphism)
         ↓
         Regístrate / Inicia sesión
         ↓
         Supabase Auth
         ↓
         Canvas Principal
         ↓
         UserMenu (avatar + dropdown)
         ↓
         Cerrar Sesión
         ↓
         AuthScreen
```

## 🌟 Características del Diseño

### Glassmorphism
- Gradientes: `from-indigo-500 via-purple-500 to-pink-500`
- Cristal: `backdrop-blur-xl` + `bg-white/10`
- Bordes: `border-white/20`
- Sombras: `shadow-2xl`

### Animaciones
- Modo switch: 150ms fade + scale
- Hover states: 200ms transitions
- Particles: `animate-pulse`
- Loading: `animate-spin`

### Responsive
- Mobile: < 640px (stack vertical)
- Tablet: 640px - 1024px (proporciones ajustadas)
- Desktop: > 1024px (diseño completo)

## 📚 Documentación Adicional

- **[START_HERE.md](START_HERE.md)** - Guía de inicio rápido
- **[SETUP_GUIDE.md](SETUP_GUIDE.md)** - Setup detallado
- **[GLASSMORPHISM_AUTH_SETUP.md](GLASSMORPHISM_AUTH_SETUP.md)** - Configuración completa
- **[GLASSMORPHISM_IMPLEMENTATION_COMPLETE.md](GLASSMORPHISM_IMPLEMENTATION_COMPLETE.md)** - Implementación completa
- **[AUTH_SCREEN_GUIDE.md](AUTH_SCREEN_GUIDE.md)** - Guía de diseños

## 🔍 Verificación

Ejecutar el script de verificación:

```bash
npm run verify
```

Este script verifica:
- ✅ Archivos requeridos
- ✅ Imports correctos
- ✅ Dependencias instaladas
- ✅ Configuración de entorno

## 🆘 Troubleshooting

### Module not found
```bash
npm install @supabase/supabase-js lucide-react
```

### Invalid API key
- Verificar que `.env` esté en la carpeta `client/`
- Confirmar credenciales de Supabase
- Reiniciar: `npm run dev`

### Auth session missing
- Habilitar Auth en Supabase Dashboard
- Configurar Redirect URLs
- Limpiar localStorage

## 🚀 Deployment

### Vercel
```bash
npm run build
# Deploy carpeta dist/ a Vercel
```

Variables de entorno en Vercel:
```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key
```

### Supabase
Configurar Redirect URLs para producción:
```
https://tu-dominio.com/**
```

## 🎉 Features Implementadas

- ✅ Autenticación con Supabase
- ✅ Diseño glassmorphism moderno
- ✅ Menú de usuario funcional
- ✅ Logout implementado
- ✅ Base de datos cloud
- ✅ Sistema de caché
- ✅ Responsive design
- ✅ Animaciones suaves
- ✅ Accesibilidad WCAG AA
- ✅ TypeScript types
- ✅ Error handling
- ✅ Loading states

## 📄 Licencia

Este proyecto es parte de Content Research Canvas.

---

**¡Disfruta tu nueva autenticación glassmorphism!** 🎨✨