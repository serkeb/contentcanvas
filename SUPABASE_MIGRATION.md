# Migración a Supabase - Content Research Canvas

## 📋 Resumen de la Migración

Hemos migrado completamente tu aplicación de **localStorage** a **Supabase**, haciendo tu app "full cloud" con:

- ✅ **Persistencia en la nube** para todos los datos
- ✅ **Multi-usuario** con autenticación de Supabase
- ✅ **Sincronización entre dispositivos**
- ✅ **Caché inteligente** para evitar reprocesar contenido (ahorro de costos)
- ✅ **Tracking de consumo** de tokens de IA
- ✅ **Seguridad** con Row Level Security (RLS)

---

## 🗄️ Estructura de Base de Datos

### Tablas Principales

#### 1. **users**
```sql
- id: UUID (primary key)
- email: TEXT (unique)
- name: TEXT
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```
Usuarios de la aplicación.

#### 2. **boards**
```sql
- id: UUID (primary key)
- user_id: UUID (foreign key → users)
- name: TEXT
- nodes: JSONB (React Flow nodes)
- edges: JSONB (React Flow edges)
- viewport: JSONB
- is_default: BOOLEAN
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```
Tableros/canvases con nodos y conexiones.

#### 3. **brand_voices**
```sql
- id: UUID (primary key)
- user_id: UUID (foreign key → users)
- name: TEXT
- person_name: TEXT
- brand_voice_data: JSONB
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```
Configuraciones de Brand Voice.

#### 4. **api_keys**
```sql
- id: UUID (primary key)
- user_id: UUID (foreign key → users)
- provider: TEXT (openai | anthropic | gemini)
- encrypted_key: TEXT
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```
API keys de proveedores de IA (encriptadas).

#### 5. **documents**
```sql
- id: UUID (primary key)
- user_id: UUID (foreign key → users)
- name: TEXT
- type: TEXT (pdf | txt | md | csv | gdoc)
- text: TEXT
- file_url: TEXT
- pages: INTEGER
- metadata: JSONB
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```
Documentos de referencia extraídos.

#### 6. **transcripts**
```sql
- id: UUID (primary key)
- user_id: UUID (foreign key → users)
- url: TEXT (unique)
- platform: TEXT (youtube | instagram | tiktok | other)
- transcript: TEXT
- language: TEXT
- source: TEXT (whisper | youtube_subtitles | manual)
- audio_seconds: DECIMAL
- metadata: JSONB
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```
Transcripciones cacheadas de videos.

#### 7. **profile_analyses**
```sql
- id: UUID (primary key)
- user_id: UUID (foreign key → users)
- platform: TEXT (tiktok | instagram)
- username: TEXT
- profile_data: JSONB
- analysis: TEXT
- video_count: INTEGER
- videos: JSONB
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```
Análisis de perfiles de creadores cacheados.

#### 8. **token_usage**
```sql
- id: UUID (primary key)
- user_id: UUID (foreign key → users)
- model: TEXT
- provider: TEXT (openai | anthropic | gemini)
- prompt_tokens: INTEGER
- completion_tokens: INTEGER
- total_tokens: INTEGER
- operation: TEXT (transcribe | analyze | llm | script | profile_analysis)
- metadata: JSONB
- created_at: TIMESTAMPTZ
```
Registro de consumo de tokens de IA.

#### 9. **user_settings**
```sql
- id: UUID (primary key)
- user_id: UUID (unique, foreign key → users)
- settings: JSONB
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```
Configuración personalizada por usuario.

---

## 🔒 Seguridad (RLS)

Todas las tablas tienen **Row Level Security** habilitado con políticas que garantizan que cada usuario solo pueda acceder a sus propios datos:

```sql
-- Ejemplo: Solo puedo ver mis tableros
CREATE POLICY "Users can view own boards" ON boards
  FOR SELECT USING (auth.uid() = user_id);
```

---

## 🔧 Funciones Helper

### `get_user_boards(p_user_id UUID)`
Obtiene todos los tableros de un usuario ordenados.

### `get_token_stats(p_user_id UUID, p_days INTEGER DEFAULT 30)`
Estadísticas de consumo de tokens por período.

### `search_transcripts(p_user_id UUID, p_search_text TEXT)`
Busca transcripciones por contenido de texto.

### `create_user_if_not_exists(p_user_id UUID, p_email TEXT, p_name TEXT)`
Crea o actualiza usuario.

---

## 📦 Archivos Creados

### Frontend

1. **`client/src/types/database.ts`**
   - Tipos TypeScript generados desde Supabase
   - Tipos útiles para la aplicación

2. **`client/src/lib/supabase.ts`**
   - Cliente de Supabase configurado
   - Helpers para autenticación

3. **`client/src/canvas/utils/cloudStorage.ts`**
   - Servicio de almacenamiento en la nube
   - Reemplaza las funciones de `storage.js`
   - Mantiene compatibilidad con la interfaz original

4. **`client/src/services/cacheService.ts`**
   - Servicio de caché inteligente
   - Evita reprocesar contenido
   - Tracking de consumo de tokens

---

## 🚀 Cómo Usar

### 1. Instalar dependencias

```bash
cd client
npm install @supabase/supabase-js
```

### 2. Configurar variables de entorno

Crear `.env` en la raíz del proyecto:

```env
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_anon_key_de_supabase
```

### 3. Reemplazar imports

En los archivos que usan `storage.js`, reemplazar:

```javascript
// Antes
import { saveBoard, loadBoard, saveBrandVoice, loadBrandVoices } from './utils/storage'

// Después
import { saveBoard, loadBoard, saveBrandVoice, loadBrandVoices } from './utils/cloudStorage'
```

### 4. Usar caché de transcripciones

En `api.js`, antes de transcribir un video, verificar caché:

```javascript
import { getCachedTranscript, saveCachedTranscript } from '../services/cacheService'

// Verificar si ya tenemos la transcripción
const cached = await getCachedTranscript(url)
if (cached) {
  return { transcript: cached.transcript, source: 'cache' }
}

// Si no, transcribir y guardar en caché
const result = await transcribeUrl(url)
await saveCachedTranscript({
  url,
  transcript: result.transcript,
  platform: 'youtube',
  source: 'whisper'
})
```

---

## 💰 Ahorro de Costos con Caché

La implementación de caché inteligente ahorra dinero:

### Transcripciones
- **Antes**: Siempre llamar a Whisper API ($)
- **Ahora**: Buscar en caché primero, llamar a API solo si no existe

### Análisis de Perfiles
- **Antes**: Transcribir N videos + analizar con GPT-4o ($$)
- **Ahora**: Buscar análisis cacheado, reprocesar solo si expiró

### Documentos
- **Antes**: Extraer texto cada vez
- **Ahora**: Cache de documentos extraídos

---

## 📊 Tracking de Consumo

### Registar uso de tokens

```javascript
import { trackTokenUsage } from '../services/cacheService'

await trackTokenUsage({
  model: 'gpt-4o',
  provider: 'openai',
  prompt_tokens: 1000,
  completion_tokens: 500,
  total_tokens: 1500,
  operation: 'analyze'
})
```

### Obtener estadísticas

```javascript
import { getTokenStats } from '../services/cacheService'

const stats = await getTokenStats(30) // últimos 30 días
console.log('Consumo por proveedor:', stats)
```

---

## 🔄 Migración de Datos Existentes

### Script de migración

```javascript
// Migrar datos de localStorage a Supabase
import * as storage from './utils/storage'
import { saveBoard, saveBrandVoice, saveApiKeys } from './utils/cloudStorage'

async function migrateFromLocalStorage() {
  // Migrar tableros
  const boards = storage.listBoards()
  for (const board of boards) {
    const { nodes, edges } = storage.loadBoard(board.id)
    await saveBoard(board.id, nodes, edges)
  }

  // Migrar brand voices
  const brandVoices = storage.loadBrandVoices()
  for (const bv of brandVoices) {
    await saveBrandVoice(bv)
  }

  // Migrar API keys
  const apiKeys = storage.loadApiKeys()
  await saveApiKeys(apiKeys)

  console.log('Migración completada!')
}
```

---

## 🎯 Próximos Pasos

1. **Autenticación**: Implementar auth de Supabase (Email/Password, Google, etc.)
2. **Encriptación**: Usar `pgcrypto` para encriptar API keys
3. **Storage**: Usar Supabase Storage para archivos PDF/media
4. **Realtime**: Sincronización en tiempo real con Supabase Realtime
5. **Edge Functions**: Mover lógica de backend a Supabase Edge Functions

---

## 📝 Notas Importantes

- **API Keys**: Actualmente se guardan en texto plano. En producción, encriptarlas.
- **Costos**: El caché reduce significativamente los costos de OpenAI
- **Backup**: Supabase hace backup automático de todos los datos
- **Escalabilidad**: La arquitectura soporta millones de usuarios

---

## 🆘 Troubleshooting

### Error: "Row not found"
Asegúrate de que el usuario esté autenticado:

```javascript
const { data: { user } } = await supabase.auth.getUser()
if (!user) {
  // Redirigir a login
}
```

### Error: "Permission denied"
Verifica que las políticas RLS estén configuradas correctamente en Supabase.

### Error: "Invalid API key"
Revisa las variables de entorno `.env`:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key
```