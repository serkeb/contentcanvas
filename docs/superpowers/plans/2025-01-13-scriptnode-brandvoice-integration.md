# ScriptNode BrandVoice Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve ScriptNode to use BrandVoice as 100% personality and show visual feedback of connected sources

**Architecture:** Modify ScriptNode.jsx buildPrompt() to include full BrandVoice context with explicit personality instructions, and add visual indicators (badges, preview) for connected sources

**Tech Stack:** React, @xyflow/react, existing codebase patterns

---

## File Structure

**Files to modify:**
- `client/src/canvas/nodes/ScriptNode.jsx` - Main component with prompt building and UI

**Files that remain unchanged:**
- `client/src/canvas/utils/getConnectedSources.js` - Already extracts brandVoice and transcripts correctly

---

### Task 1: Add imports and extract connected sources

**Files:**
- Modify: `client/src/canvas/nodes/ScriptNode.jsx:1-10`

- [ ] **Step 1: Add useMemo import if not present**

The file already has `useCallback` imported. Check line 1 for:
```javascript
import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
```

If `useMemo` is missing, add it to the import.

Run: Check line 1 of ScriptNode.jsx
Expected: `useMemo` is in the import statement

- [ ] **Step 2: Extract connected sources in component body**

After line 132 (after `const error = data.error || null`), add:
```javascript
  // Extract connected sources for prompt building and visual feedback
  const { transcripts, brandVoice } = useMemo(() => getConnectedSources(id, getNodes, getEdges), [id, getNodes, getEdges])
  const connectedCount = transcripts.length + (brandVoice ? 1 : 0)
```

Run: Check that the file compiles
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add client/src/canvas/nodes/ScriptNode.jsx
git commit -m "feat(script): extract connected sources for brandvoice integration"
```

---

### Task 2: Rewrite buildPrompt() to use full BrandVoice

**Files:**
- Modify: `client/src/canvas/nodes/ScriptNode.jsx:149-186`

- [ ] **Step 1: Replace buildPrompt function**

Replace the entire `buildPrompt()` function (lines 149-186) with:
```javascript
  function buildPrompt() {
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

Run: Check that the file compiles
Expected: No errors

- [ ] **Step 2: Commit**

```bash
git add client/src/canvas/nodes/ScriptNode.jsx
git commit -m "feat(script): use full brandvoice as personality in prompt"
```

---

### Task 3: Add visual feedback badge in header

**Files:**
- Modify: `client/src/canvas/nodes/ScriptNode.jsx:252-278` (header section)

- [ ] **Step 1: Add sources badge after the SCRIPT badge**

Find the header section with the SCRIPT badge (around line 258-260). After the badge span, add:
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

Run: Check that the file compiles
Expected: No errors, badge appears when sources are connected

- [ ] **Step 2: Commit**

```bash
git add client/src/canvas/nodes/ScriptNode.jsx
git commit -m "feat(script): add connected sources badge in header"
```

---

### Task 4: Add BrandVoice preview below config row

**Files:**
- Modify: `client/src/canvas/nodes/ScriptNode.jsx:280-310` (after config row)

- [ ] **Step 1: Add BrandVoice preview section**

After the config row div (after line 291, the closing `</div>` of the config row), add:
```javascript
        {/* BrandVoice preview */}
        {brandVoice && brandVoice.vozEnUnaFrase && (
          <div style={{
            padding: '6px 10px', marginTop: 6, marginBotton: 6,
            background: '#f0fdf4', border: '1px solid #bbf7d0',
            borderRadius: 8, fontSize: 10, color: '#16a34a',
            lineHeight: 1.5,
          }}>
            <span style={{ fontWeight: 600 }}>🎯 {brandVoice.personName || 'BrandVoice'}:</span> {brandVoice.vozEnUnaFrase.slice(0, 80)}{brandVoice.vozEnUnaFrase.length > 80 ? '...' : ''}
          </div>
        )}

        {/* No BrandVoice message */}
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

Run: Check that the file compiles
Expected: No errors, preview appears when BrandVoice is connected

- [ ] **Step 2: Fix typo in marginBottom**

In the code above, fix `marginBotton` to `marginBottom`.

Run: Check that the file compiles
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add client/src/canvas/nodes/ScriptNode.jsx
git commit -m "feat(script): add brandvoice preview and empty state"
```

---

### Task 5: Update buildPrompt to use extracted sources

**Files:**
- Modify: `client/src/canvas/nodes/ScriptNode.jsx:188-200` (handleRun function)

- [ ] **Step 1: Remove duplicate getConnectedSources call**

The `handleRun` function currently calls `getConnectedSources` inside `buildPrompt`. Since we now extract it at the component level, update `handleRun` to use the memoized values.

Find the `handleRun` function (around line 188-200) and update it:
```javascript
  async function handleRun() {
    setRunning(true)
    persist({ state: 'running', error: null })
    try {
      const { messages } = buildPrompt()
      const res = await runLLM(messages, transcripts, 'gpt-4.1')
      persist({ state: 'done', script: res.result, platform, format, duration, goal, topic })
    } catch (err) {
      persist({ state: 'error', error: err.message })
    } finally {
      setRunning(false)
    }
  }
```

Note: We removed `getConnectedSources` call from inside buildPrompt and are now using the memoized `transcripts` from component level.

Run: Check that the file compiles
Expected: No errors

- [ ] **Step 2: Update buildPrompt to use component-level sources**

Since `buildPrompt` now uses the component-level `brandVoice` and `transcripts`, it doesn't need to call `getConnectedSources` anymore. The function signature and first line should be:

```javascript
  function buildPrompt() {
    const platformLabel = PLATFORMS.find(p => p.id === platform)?.label || platform
    const formatLabel   = FORMATS.find(f => f.id === format)?.label || format
    const goalLabel     = GOALS.find(g => g.id === goal)?.label || goal

    let prompt = `Sos un experto en creación de contenido para ${platformLabel}.\n\n`
    // ... rest of function
```

Run: Check that the file compiles
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add client/src/canvas/nodes/ScriptNode.jsx
git commit -m "refactor(script): use memoized connected sources"
```

---

## Testing

### Manual Testing Steps

1. **Test without BrandVoice:**
   - Create a ScriptNode
   - Don't connect any sources
   - Verify: "🎯 Conectá un BrandVoice para usar su voz" message appears
   - Generate a script - should work but without personality

2. **Test with BrandVoice only:**
   - Create a BrandVoiceNode and generate analysis
   - Connect BrandVoiceNode to ScriptNode
   - Verify: Badge "📎 1 fuentes" appears in green
   - Verify: BrandVoice preview shows "🎯 [Nombre]: [voz en una frase]"
   - Generate a script
   - Verify: Script uses the brand's personality (language, tone, expressions)

3. **Test with BrandVoice + videos:**
   - Add VideoTranscriptNode with transcript
   - Connect to ScriptNode
   - Verify: Badge updates to "📎 2 fuentes" or "📎 3 fuentes"
   - Generate a script
   - Verify: Script uses brand personality AND references video content

4. **Test persistence:**
   - Save canvas with connected sources
   - Reload page
   - Verify: All connections and visual feedback persist

5. **Test different formats:**
   - Test with reel, carrusel, hilo formats
   - Verify: Each format uses brand voice appropriately

---

## Self-Review Results

**Spec coverage:**
✅ BrandVoice used as 100% personality - Task 2
✅ Visual feedback (badges) - Task 3
✅ BrandVoice preview - Task 4
✅ Video transcripts used - Task 2 (MATERIAL DE REFERENCIA section)
✅ Connected sources counted - Task 1

**Placeholder scan:**
✅ All code is complete, no TBD/TODO
✅ All steps have actual code or commands
✅ File paths are exact

**Type consistency:**
✅ `brandVoice` object structure consistent throughout
✅ `transcripts` array used consistently
✅ Component-level extraction used in all tasks
