# ScriptNode - BrandVoice Integration & Visual Feedback

**Fecha:** 2025-01-13
**Tipo:** Mejora de nodo existente
**Prioridad:** Alta

## Resumen Ejecutivo

Mejorar el ScriptNode para que:
1. Use el BrandVoice como "personalidad" al 100% (simular la voz del creador)
2. Tome correctamente la información de videos y otras fuentes conectadas
3. Muestre feedback visual de qué fuentes están conectadas

## Problemas Actuales

1. **Uso limitado del BrandVoice**: Solo se usa `resumenReutilizable` o las primeras 3 secciones del brandVoice, no toda la personalidad
2. **Sin feedback visual**: El usuario no sabe qué fuentes están conectadas ni si se están usando
3. **Contenido de videos ignorado**: Las transcripciones conectadas no se reflejan claramente en el guión generado

## Solución Propuesta

### 1. Prompt Mejorado con Personalidad Completa

**Estructura del prompt:**

```
Sos un experto en creación de contenido para [PLATAFORMA].

# INSTRUCCIÓN DE PERSONALIDAD
Actuá como si fueras [NOMBRE DEL CREADOR]. Escribí este guión usando su voz, tono, estilo y forma de expresarse. NO seas genérico.

# BRANDVOICE COMPLETO
[Voz en una frase]
[Rasgos de comunicación]
[Lo que dice mucho]
[Lo que debe evitar]
[Manual práctico: cómo suenan hooks, explicaciones, opiniones, CTAs]
[Ejemplos de frases que sí suenan a esta marca]
[Ejemplos de frases que NO suenan]

# CONFIGURACIÓN DEL GUIÓN
- Formato: [reel/carrusel/etc]
- Duración: [30s/60s/etc]
- Objetivo: [entretener/educar/vender/etc]
- Tema: [input del usuario]

# MATERIAL DE REFERENCIA
[Transcripciones de videos conectados si las hay]

# FORMATO DE SALIDA
[Estructura markdown según el formato]
```

**Secciones del BrandVoice a incluir:**
- `vozEnUnaFrase` - Resumen de la voz
- `rasgos` - 5 rasgos principales de comunicación
- `loQueDiceMucho` - Palabras, expresiones, ideas recurrentes
- `loQueDebeEvitar` - Palabras, tonos, poses a evitar
- `manualPractico` - Cómo suenan hooks, explicaciones, opiniones, CTAs
- `ejemplos` - 10 frases que sí suenan + 10 que no suenan + 5 hooks + 3 CTAs

### 2. Feedback Visual en el Nodo

**Indicadores a agregar:**

1. **Badge de fuentes en el header** (similar a LLMNode):
   - Ubicación: Header del nodo, junto al badge "✦ SCRIPT"
   - Color: Verde (#16a34a) cuando hay BrandVoice conectado
   - Texto: "📎 X fuentes" donde X = BrandVoice + videos + colecciones

2. **Preview del BrandVoice**:
   - Ubicación: Debajo del config row
   - Contenido: `brandVoice.vozEnUnaFrase` (si existe)
   - Máximo 80 caracteres, con "..." si es más largo
   - Background: `#f0fdf4` con borde verde si hay BrandVoice
   - Icono: "🎯"

3. **Estado de BrandVoice**:
   - Conectado y listo: Badge verde "✓ BrandVoice: [Nombre]"
   - No conectado: Texto gris "🎯 Sin BrandVoice"

4. **Tooltip o sección expandible** (opcional):
   - Lista completa de fuentes:
     - "🎯 [Nombre del creador]" (BrandVoice)
     - "📹 N videos conectados"
     - "📁 N colecciones"

### 3. Flujo de Datos

```
Usuario conecta fuentes
         ↓
getConnectedSources() extrae:
  - brandVoice (objeto completo)
  - transcripts (array)
         ↓
buildPrompt() construye:
  - Sección PERSONALIDAD (brandVoice completo)
  - Sección REFERENCIA (transcripciones)
  - Sección CONFIG (platform, format, etc)
         ↓
runLLM() envía a la API
         ↓
Usuario ve:
  - Contador de fuentes en header
  - Preview del brandVoice
  - Script generado con la voz del creador
```

## Archivos a Modificar

### 1. `client/src/canvas/nodes/ScriptNode.jsx`

**Cambios en `buildPrompt()`:**

```javascript
function buildPrompt() {
  const { transcripts, brandVoice } = getConnectedSources(id, getNodes, getEdges)
  const platformLabel = PLATFORMS.find(p => p.id === platform)?.label || platform
  const formatLabel   = FORMATS.find(f => f.id === format)?.label || format
  const goalLabel     = GOALS.find(g => g.id === goal)?.label || goal

  let prompt = `Sos un experto en creación de contenido para ${platformLabel}.\n\n`

  // ── BRANDVOICE COMO PERSONALIDAD ────────────────────────────────
  if (brandVoice && brandVoice.vozEnUnaFrase) {
    const personName = brandVoice.personName || 'el creador'

    prompt += `# INSTRUCCIÓN DE PERSONALIDAD\n`
    prompt += `Actuá como si fueras ${personName}. Escribí este guión usando su voz, tono, estilo y forma de expresarse. NO seas genérico.\n\n`

    prompt += `# BRANDVOICE COMPLETO\n\n`

    if (brandVoice.vozEnUnaFrase) {
      prompt += `## Voz en una frase\n${brandVoice.vozEnUnaFrase}\n\n`
    }

    if (brandVoice.rasgos) {
      prompt += `## Rasgos de comunicación\n${brandVoice.rasgos}\n\n`
    }

    if (brandVoice.loQueDiceMucho) {
      prompt += `## Lo que dice mucho (palabras, expresiones, ideas recurrentes)\n${brandVoice.loQueDiceMucho}\n\n`
    }

    if (brandVoice.loQueDebeEvitar) {
      prompt += `## Lo que debe evitar\n${brandVoice.loQueDebeEvitar}\n\n`
    }

    if (brandVoice.manualPractico) {
      prompt += `## Manual práctico (cómo suenan hooks, explicaciones, opiniones, CTAs)\n${brandVoice.manualPractico}\n\n`
    }

    if (brandVoice.ejemplos) {
      prompt += `## Ejemplos de frases que sí / no suenan a esta marca\n${brandVoice.ejemplos}\n\n`
    }

    prompt += `---\n\n`
  }

  // ── CONFIGURACIÓN DEL GUIÓN ─────────────────────────────────────
  prompt += `# CONFIGURACIÓN DEL GUIÓN\n`
  prompt += `- Formato: ${formatLabel}\n`
  prompt += `- Duración: ${duration}\n`
  prompt += `- Objetivo: ${goalLabel}\n`
  if (topic.trim()) prompt += `- Tema: ${topic}\n`
  prompt += `\n`

  // ── MATERIAL DE REFERENCIA ───────────────────────────────────────
  if (transcripts.length > 0) {
    prompt += `# MATERIAL DE REFERENCIA\n`
    prompt += `Usá este contenido como fuente de ideas, examples y knowledge:\n\n`
    transcripts.slice(0, 8).forEach((t, i) => {
      prompt += `## Fuente ${i + 1}: ${t.title || t.url}\n`
      prompt += `${t.transcript?.slice(0, 1500) || ''}\n\n`
    })
    prompt += `---\n\n`
  }

  // ── FORMATO DE SALIDA ───────────────────────────────────────────
  prompt += `# FORMATO DE SALIDA (en markdown)\n`
  if (format === 'reel' || format === 'guion') {
    prompt += `## 🎣 HOOK (primeros 3 segundos)\n[Escribí el hook aquí]\n\n## 📖 DESARROLLO\n[Contenido principal]\n\n## 🎯 CTA\n[Llamado a la acción]\n\n## 📝 NOTAS DE PRODUCCIÓN\n[Tips de grabación, tono, ritmo]`
  } else if (format === 'carrusel') {
    prompt += `## Slide 1 — PORTADA\n## Slide 2\n## Slide 3\n...\n## Slide final — CTA`
  } else if (format === 'hilo') {
    prompt += `## Tweet 1\n## Tweet 2\n...\n## Tweet final`
  } else {
    prompt += `## Título\n## Cuerpo\n## CTA`
  }
  prompt += `\n\nIMPORTANTE: Aplicá el brandvoice en cada parte del guión. Hooks, contenido y CTAs deben sonar como ${brandVoice?.personName || 'el creador'}.`

  return { messages: [{ role: 'user', content: prompt }], transcripts }
}
```

**Cambios visuales en el render:**

1. **Header con badge de fuentes** (después del badge "✦ SCRIPT"):
```javascript
{connectedCount > 0 && (
  <span style={{
    fontSize: 9, color: '#16a34a',
    background: '#f0fdf4', border: '1px solid #bbf7d0',
    borderRadius: 12, padding: '2px 8px', fontWeight: 600,
  }}>
    📎 {connectedCount} fuente{connectedCount > 1 ? 's' : ''}
  </span>
)}
```

2. **Preview del BrandVoice** (después del config row):
```javascript
{brandVoice && brandVoice.vozEnUnaFrase && (
  <div style={{
    padding: '6px 10px', marginTop: 6,
    background: '#f0fdf4', border: '1px solid #bbf7d0',
    borderRadius: 8, fontSize: 10, color: '#16a34a',
    lineHeight: 1.5,
  }}>
    <span style={{ fontWeight: 600 }}>🎯 {brandVoice.personName || 'BrandVoice'}:</span> {brandVoice.vozEnUnaFrase.slice(0, 80)}{brandVoice.vozEnUnaFrase.length > 80 ? '...' : ''}
  </div>
)}
```

3. **Calcular `connectedCount`**:
```javascript
// Calcular en cada render (getNodes/getEdges no pueden ser dependencias de useMemo)
const { transcripts, brandVoice } = getConnectedSources(id, getNodes, getEdges)
const connectedCount = transcripts.length + (brandVoice ? 1 : 0)
```

**Estado sin BrandVoice**:
```javascript
{!brandVoice && (
  <div style={{
    fontSize: 9, color: '#94a3b8',
    background: '#f8fafc', border: '1px dashed #cbd5e1',
    borderRadius: 6, padding: '4px 8px', marginTop: 6,
    textAlign: 'center',
  }}>
    🎯 Conectá un BrandVoice para usar su voz
  </div>
)}
```

### 2. `client/src/canvas/utils/getConnectedSources.js`

**Sin cambios necesarios** - Ya extrae correctamente `brandVoice` y `transcripts`.

## Testing Checklist

- [ ] Conectar BrandVoiceNode con estado 'ready' al ScriptNode
- [ ] Verificar que aparece el badge "📎 1 fuentes" en verde
- [ ] Verificar que aparece el preview del brandVoice (voz en una frase)
- [ ] Generar un guión y verificar que usa la voz del creador
- [ ] Conectar videos adicionales y verificar que el contador aumenta
- [ ] Generar guión sin BrandVoice y verificar mensaje de "Conectá un BrandVoice"
- [ ] Probar con múltiples fuentes (BrandVoice + videos + colecciones)
- [ ] Verificar que el guión incluye referencias al contenido de las transcripciones
- [ ] Guardar canvas y recargar página
- [ ] Verificar que persisten las conexiones y el brandVoice

## Notas de Implementación

- Usar `useMemo` para calcular `connectedCount` para evitar recalculos en cada render
- El prompt puede ser largo, pero GPT-4.1 maneja hasta 128k tokens
- Si el brandVoice no tiene ciertas secciones, simplemente no se incluyen (fallback)
- El preview del brandVoice se trunca a 80 caracteres para no romper el layout
- Los colores usados son consistentes con LLMNode (verde para fuentes conectadas)

## Éxito

**El usuario puede:**
- Ver claramente qué fuentes están conectadas al ScriptNode
- Saber si el BrandVoice se está usando (badge verde + preview)
- Generar guiones que suenan idénticos a la voz del creador
- Entender de dónde viene la información del guión
