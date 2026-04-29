import { useState } from 'react'
import { saveApiKeys } from './utils/storage'

const PROVIDERS = [
  {
    id:          'openai',
    name:        'OpenAI',
    logo:        '◈',
    color:       '#10a37f',
    bg:          '#f0fdf4',
    border:      '#a7f3d0',
    placeholder: 'sk-proj-...',
    hint:        'platform.openai.com/api-keys',
    hintUrl:     'https://platform.openai.com/api-keys',
    models:      'GPT-5.2, GPT-4.1, GPT-4.1 Mini, GPT-4.1 Nano, o3, o4-mini',
    recommended: true,
  },
  {
    id:          'anthropic',
    name:        'Anthropic',
    logo:        '◇',
    color:       '#c97641',
    bg:          '#fff7ed',
    border:      '#fdba74',
    placeholder: 'sk-ant-api03-...',
    hint:        'console.anthropic.com/settings/keys',
    hintUrl:     'https://console.anthropic.com/settings/keys',
    models:      'Claude Opus 4.5, Claude Sonnet 4.5, Claude Haiku 4.5',
  },
  {
    id:          'gemini',
    name:        'Google Gemini',
    logo:        '✦',
    color:       '#1a73e8',
    bg:          '#eff6ff',
    border:      '#bfdbfe',
    placeholder: 'AIzaSy...',
    hint:        'aistudio.google.com/app/apikey',
    hintUrl:     'https://aistudio.google.com/app/apikey',
    models:      'Gemini 2.5 Pro, Gemini 2.5 Flash, Gemini 2.0 Flash',
  },
]

export default function SetupScreen({ onComplete }) {
  const [keys, setKeys] = useState({ openai: '', anthropic: '', gemini: '', nano_banana: '' })
  const [show, setShow] = useState({ openai: false, anthropic: false, gemini: false, nano_banana: false })
  const [isSaving, setIsSaving] = useState(false)

  const hasAny = Object.values(keys).some(v => v && v.trim().length > 0)

  async function handleSave() {
    if (!hasAny) return

    setIsSaving(true)
    try {
      // Guardar en localStorage (fallback rápido) y Supabase (persistencia en la nube)
      await saveApiKeys({
        openai:    keys.openai.trim(),
        anthropic: keys.anthropic.trim(),
        gemini:    keys.gemini.trim(),
        nano_banana: keys.nano_banana?.trim() || '',
      })

      onComplete()
    } catch (error) {
      console.error('Error guardando API keys:', error)
      alert('Error al guardar las API keys. Por favor intentá de nuevo.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'linear-gradient(135deg, #f8fafc 0%, #ede9fe 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '24px',
    }}>
      <div style={{
        width: '100%', maxWidth: 480,
        display: 'flex', flexDirection: 'column', gap: 0,
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>◈</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0, marginBottom: 8 }}>
            Configurá tu API
          </h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0, lineHeight: 1.6 }}>
            Agregá al menos una clave para empezar.<br />
            Podés agregar más de un provider para elegir modelos de cada uno.
          </p>
        </div>

        {/* Provider cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          {PROVIDERS.map(p => {
            const val = keys[p.id]
            const filled = val.trim().length > 0
            return (
              <div key={p.id} style={{
                background: filled ? p.bg : '#fff',
                border: `1.5px solid ${filled ? p.border : '#e2e8f0'}`,
                borderRadius: 14, padding: '14px 16px',
                transition: 'all 0.15s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: filled ? p.color : '#f1f5f9',
                    color: filled ? '#fff' : '#94a3b8',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, fontWeight: 800, flexShrink: 0,
                    transition: 'all 0.15s',
                  }}>{p.logo}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{p.name}</span>
                      {p.recommended && (
                        <span style={{
                          fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 20,
                          background: '#ede9fe', color: '#7c3aed', border: '1px solid #ddd6fe',
                        }}>Recomendado</span>
                      )}
                      {filled && (
                        <span style={{
                          fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 20,
                          background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0',
                        }}>✓ Configurado</span>
                      )}
                    </div>
                    <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>{p.models}</div>
                  </div>
                </div>

                <div style={{ position: 'relative' }}>
                  <input
                    type={show[p.id] ? 'text' : 'password'}
                    value={val}
                    onChange={e => setKeys(k => ({ ...k, [p.id]: e.target.value }))}
                    placeholder={p.placeholder}
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      padding: '9px 38px 9px 12px',
                      background: '#fff', border: `1px solid ${filled ? p.border : '#e2e8f0'}`,
                      borderRadius: 8, fontSize: 12, fontFamily: 'monospace',
                      color: '#0f172a', outline: 'none',
                      transition: 'border-color 0.15s',
                    }}
                  />
                  <button
                    onClick={() => setShow(s => ({ ...s, [p.id]: !s[p.id] }))}
                    style={{
                      position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 13, color: '#94a3b8', padding: 0, lineHeight: 1,
                    }}
                  >{show[p.id] ? '🙈' : '👁'}</button>
                </div>

                <a
                  href={p.hintUrl} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 10, color: p.color, display: 'block', marginTop: 6, textDecoration: 'none' }}
                >
                  🔗 {p.hint}
                </a>
              </div>
            )
          })}
        </div>

        {/* CTA */}
        <button
          onClick={handleSave}
          disabled={!hasAny || isSaving}
          style={{
            width: '100%', padding: '14px',
            background: hasAny && !isSaving ? 'linear-gradient(135deg, #7c3aed, #6366f1)' : '#f1f5f9',
            color: hasAny && !isSaving ? '#fff' : '#94a3b8',
            border: 'none', borderRadius: 12,
            fontSize: 14, fontWeight: 700, cursor: hasAny && !isSaving ? 'pointer' : 'default',
            boxShadow: hasAny && !isSaving ? '0 4px 20px rgba(124,58,237,0.35)' : 'none',
            transition: 'all 0.2s',
            letterSpacing: '0.01em',
            opacity: isSaving ? 0.7 : 1,
          }}
        >
          {isSaving ? '💾 Guardando...' : hasAny ? '✦ Guardar y empezar →' : 'Ingresá al menos una clave para continuar'}
        </button>

        <p style={{ textAlign: 'center', fontSize: 10, color: '#94a3b8', marginTop: 16, lineHeight: 1.5 }}>
          Las claves se guardan en tu navegador y en Supabase (cuenta en la nube).<br />
          Así podés usar la app desde cualquier dispositivo. 🔒
        </p>
      </div>
    </div>
  )
}
