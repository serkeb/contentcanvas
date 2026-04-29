# BrandVoiceNode - Design Document

**Fecha:** 2025-01-13
**Tipo:** Nuevo nodo de análisis de marca personal
**Prioridad:** Alta

## Resumen Ejecutivo

Nuevo nodo `BrandVoiceNode` que genera un análisis estratégico completo de identidad de marca personal a partir de transcripciones de video. El nodo es compacto visualmente pero se expande en un popup con las 20 secciones del análisis. Se puede conectar a un nodo LLM para que use toda la información como contexto al generar contenido.

## Arquitectura

### Nuevo Archivo
`client/src/canvas/nodes/BrandVoiceNode.jsx`

### Registro
- Agregar `brandVoiceNode` al objeto `nodeTypes` en `ContentCanvas.jsx`
- Botón en toolbar izquierdo: icono "🎯" etiqueta "BrandVoice"

### Patrón de Diseño
Similar a `ProfileAnalysisNode`:
- Vista compacta con nombre, foto, botón expandir
- Panel portaled (popup) con el contenido completo
- Handles para conectar fuentes (input) y LLM (output)
- Estados: idle, analyzing, ready, error

## Flujo de Datos

### Input (Target Handle)
Acepta conexiones de:
- `profileAnalysisNode` → usa los videos transcritos del perfil
- `videoTranscriptNode` → usa la transcripción individual
- `documentNode` → usa el texto del documento
- `llmNode` → (opcional) para refinamiento futuro

### Procesamiento
1. Usuario conecta fuentes al nodo
2. Extrae transcripciones de las fuentes conectadas
3. Usuario hace click en "Generar BrandVoice"
4. Envía transcripciones + prompt específico al endpoint `/llm`
5. Guarda resultado en `data.brandVoice` (objeto con las 20 secciones)
6. Actualiza estado a "ready"

### Output (Source Handle)
- Se conecta a `llmNode`
- El LLM recibe el brandVoice completo como contexto adicional
- Formato: se incluye en `documents` o como un campo especial `brandVoice`

## UI/UX

### Vista Compacta (estado normal)
```
┌─────────────────────────────────┐
│ 🎯 [NOMBRE]             ✦ Ver  │
│                                 │
│ [Foto]  @usuario                │
│         TikTok • 15 videos      │
│                                 │
│ Estado: ✓ Listo                 │
└─────────────────────────────────┘
```

### Vista Expandida (Popup portaled)
Panel de 500px ancho, 80vh alto con:
- Header: título + botón cerrar
- Navegación lateral con las 20 secciones
- Contenido principal con markdown renderizado
- Scroll independiente

### Estados Visuales
- **Idle:** Gris, muestra "Conectá fuentes para comenzar"
- **Analyzing:** Spinner + "Analizando con IA…"
- **Ready:** Verde + botón expandir
- **Error:** Rojo + mensaje de error

## Estructura de Datos

### data object
```javascript
{
  // Estado del nodo
  state: 'idle' | 'analyzing' | 'ready' | 'error',
  error: string | null,

  // Info de la persona (se llena automáticamente)
  personName: string,
  personHandle: string,
  personAvatar: string | null,
  platform: string,

  // Fuentes conectadas
  connectedSources: [{
    id: string,
    type: 'profile' | 'video' | 'document',
    name: string
  }],

  // Transcripciones extraídas (para enviar al LLM)
  transcripts: [{
    url: string,
    platform: string,
    transcript: string,
    title: string
  }],

  // Resultado del análisis (las 20 secciones)
  brandVoice: {
    esencia: string,
    posicionamiento: string,
    audiencia: string,
    brandVoice: string,
    vozEnUnaFrase: string,
    rasgos: string,
    loQueDiceMucho: string,
    loQueDebeEvitar: string,
    creencias: string,
    personalidad: string,
    diferenciales: string,
    pilares: string,
    promesa: string,
    mensajeCentral: string,
    arquetipo: string,
    tension: string,
    manualPractico: string,
    ejemplos: string,
    riesgos: string,
    resumenReutilizable: string
  }
}
```

## Prompt

El prompt completo ya está definido por el usuario. Se envía en el campo `content` del mensaje al endpoint `/llm`.

**Endpoint:** `POST /llm`
**Body:**
```javascript
{
  messages: [{
    role: "user",
    content: "[PROMPT COMPLETO DEL USUARIO]\n\nTRANSCRIPCIONES:\n{transcripciones}"
  }],
  transcripts: [...],  // las transcripciones de las fuentes
  model: "gpt-4.1"
}
```

## Integración con LLM

Cuando un `BrandVoiceNode` está conectado a un `LLMNode`:

1. El LLM detecta la conexión en `edges`
2. Extrae el `brandVoice` del nodo conectado
3. Lo incluye como contexto adicional en el system message:

```javascript
`BRANDVOICE CONTEXT (${data.personName}):
${data.brandVoice?.resumenReutilizable || 'No disponible'}

---`
```

4. El LLM puede entonces generar contenido "como si fuera" esa persona

## Persistencia

- **LocalStorage:** Se guarda automáticamente con `saveCanvas()`
- **Key:** `'content-research-canvas-v1'`
- **Structure:** El nodo completo se serializa en el array `nodes`

## Archivos a Crear/Modificar

### Nuevos
1. `client/src/canvas/nodes/BrandVoiceNode.jsx` (300-400 líneas)

### Modificar
1. `client/src/canvas/ContentCanvas.jsx`
   - Importar BrandVoiceNode
   - Agregar a `nodeTypes`
   - Agregar función `addBrandVoiceNode()`
   - Agregar botón en toolbar

2. `client/src/canvas/utils/api.js`
   - (Opcional) Agregar función helper `extractTranscriptsFromNodes()` si es compleja

## Testing Checklist

- [ ] Crear nodo desde toolbar
- [ ] Conectar ProfileAnalysisNode con videos listos
- [ ] Click en "Generar BrandVoice"
- [ ] Verificar que muestra estado "analyzing"
- [ ] Esperar respuesta y verificar estado "ready"
- [ ] Expandir y ver las 20 secciones
- [ ] Verificar navegación entre secciones
- [ ] Conectar a LLMNode
- [ ] Verificar que LLM recibe el contexto
- [ ] Probar generar contenido como esa persona
- [ ] Guardar canvas y recargar página
- [ ] Verificar que persiste todo el brandVoice

## Implementación Order

1. **BrandVoiceNode.jsx** - Componente base con UI compacta
2. **Lógica de extracción** - Obtener transcripciones de nodos conectados
3. **Llamada a API** - Ejecutar el análisis con el prompt
4. **Popup expandido** - Panel con navegación de 20 secciones
5. **Integración ContentCanvas** - Registro y botón toolbar
6. **Integración LLMNode** - Pasar brandVoice como contexto

## Notas de Implementación

- Usar `createPortal` para el popup (como ProfileAnalysisNode)
- Usar Markdown component para renderizar el contenido
- Usar `useReactFlow` para acceder a nodos conectados
- Color de acento: `#8b5cf6` (violeta) para diferenciarlo
- El prompt es largo, considerarlo como constante
- Manejar errores de API gracefully
- Mostrar preview del brandVoice en vista compacta (primeros 200 chars de "voz en una frase")
