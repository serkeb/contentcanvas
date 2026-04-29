import { useState } from 'react'
import { ChevronDown, ChevronUp, Edit3, Check, X } from 'lucide-react'

/**
 * Componente para editar prompts personalizados en nodos de IA
 * @param {string} customPrompt - Prompt personalizado actual
 * @param {function} onSave - Callback cuando se guarda el prompt (customPrompt) => void
 * @param {string} defaultPromptPreview - Preview del prompt default (opcional, DEPRECADO: usar masterPrompt)
 * @param {string} masterPrompt - Prompt maestro completo del sistema (opcional)
 * @param {string} accentColor - Color de acento para el botón
 */
export default function PromptEditor({ customPrompt, onSave, defaultPromptPreview, masterPrompt, accentColor = '#6366f1' }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [draftPrompt, setDraftPrompt] = useState(customPrompt || '')
  const [showMaster, setShowMaster] = useState(false)

  const hasCustom = !!customPrompt && customPrompt.trim().length > 0
  // Usar masterPrompt si está disponible, sino defaultPromptPreview
  const defaultPrompt = masterPrompt || defaultPromptPreview

  function handleOpen() {
    setDraftPrompt(customPrompt || '')
    setIsOpen(true)
    setIsEditing(false)
  }

  function handleStartEdit() {
    setIsEditing(true)
    setDraftPrompt(customPrompt || '')
  }

  function handleCancel() {
    setIsEditing(false)
    setDraftPrompt(customPrompt || '')
  }

  function handleSave() {
    onSave(draftPrompt.trim())
    setIsEditing(false)
    setIsOpen(false)
  }

  function handleReset() {
    setDraftPrompt('')
    onSave('')
    setIsEditing(false)
    setShowMaster(false)
  }

  if (!isOpen) {
    return (
      <button
        onClick={handleOpen}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: hasCustom ? `${accentColor}15` : '#f8fafc',
          border: `1px solid ${hasCustom ? accentColor : '#e2e8f0'}`,
          borderRadius: 8, padding: '6px 10px',
          cursor: 'pointer', fontSize: 11, fontWeight: 600,
          color: hasCustom ? accentColor : '#64748b',
          transition: 'all 0.15s',
        }}
        title={hasCustom ? 'Prompt personalizado - click para ver/editar' : 'Personalizar prompt'}
      >
        <Edit3 size={12} strokeWidth={2} />
        <span>{hasCustom ? 'Prompt Personalizado' : 'Prompt Default'}</span>
        {hasCustom && <span style={{ marginLeft: 4, fontSize: 9 }}>✓</span>}
      </button>
    )
  }

  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
      padding: '16px', margin: '8px 0',
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Edit3 size={16} strokeWidth={2} style={{ color: accentColor }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
            {hasCustom ? 'Prompt Personalizado' : 'Prompt del Sistema'}
          </span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4 }}
        >
          <X size={16} strokeWidth={2} />
        </button>
        {!hasCustom && masterPrompt && (
          <button
            onClick={() => setShowMaster(v => !v)}
            style={{
              background: showMaster ? `${accentColor}12` : '#f8fafc',
              border: `1px solid ${showMaster ? accentColor : '#e2e8f0'}`,
              borderRadius: 6,
              color: showMaster ? accentColor : '#64748b',
              fontSize: 10,
              fontWeight: 600,
              cursor: 'pointer',
              padding: '4px 8px',
              marginLeft: 'auto',
            }}
          >
            {showMaster ? 'Ocultar' : 'Ver prompt completo'}
          </button>
        )}
      </div>

      {/* Content */}
      {!isEditing ? (
        <div style={{ marginBottom: 12 }}>
          {hasCustom ? (
            <div style={{
              background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8,
              padding: '10px 12px', fontSize: 11, lineHeight: 1.6, color: '#334155', whiteSpace: 'pre-wrap'
            }}>
              {customPrompt}
            </div>
          ) : showMaster && masterPrompt ? (
            <div style={{
              background: '#f8fafc', border: `1px solid ${accentColor}30`, borderRadius: 8,
              padding: '10px 12px', fontSize: 10, lineHeight: 1.5, color: '#334155', whiteSpace: 'pre-wrap',
              maxHeight: 300, overflowY: 'auto',
            }}>
              {masterPrompt}
            </div>
          ) : (
            <div style={{
              background: '#f1f5f9', borderRadius: 8, padding: '10px 12px',
              fontSize: 11, color: '#64748b', lineHeight: 1.5
            }}>
              Usando el prompt por defecto del sistema.
              {masterPrompt && (
                <>
                  {' '}<strong style={{ color: '#475569' }}>Prompt completo disponible ({masterPrompt.length} caracteres)</strong>
                </>
              )}
              {!masterPrompt && defaultPrompt && (
                <>
                  {' '}<strong style={{ color: '#475569' }}>Preview:</strong>
                  <div style={{ marginTop: 8, padding: '8px', background: '#fff', borderRadius: 6, fontSize: 10, fontStyle: 'italic', color: '#94a3b8' }}>
                    {defaultPrompt}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      ) : (
        <div style={{ marginBottom: 12 }}>
          <textarea
            value={draftPrompt}
            onChange={e => setDraftPrompt(e.target.value)}
            placeholder="Escribí tu prompt personalizado aquí..."
            style={{
              width: '100%', minHeight: 120, padding: '10px 12px',
              background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8,
              fontSize: 11, fontFamily: 'system-ui', lineHeight: 1.6,
              color: '#0f172a', resize: 'vertical', outline: 'none',
              boxSizing: 'border-box',
            }}
            autoFocus
          />
          <div style={{ marginTop: 6, fontSize: 10, color: '#64748b' }}>
            {draftPrompt.trim().length} caracteres
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        {!isEditing ? (
          <>
            <button
              onClick={handleStartEdit}
              style={{
                flex: 1, padding: '8px 12px',
                background: accentColor, border: 'none', borderRadius: 7,
                color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <Edit3 size={12} strokeWidth={2} />
              {hasCustom ? 'Editar Prompt' : 'Personalizar'}
            </button>
            {hasCustom && (
              <button
                onClick={handleReset}
                style={{
                  padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca',
                  borderRadius: 7, color: '#dc2626', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Resetear
              </button>
            )}
          </>
        ) : (
          <>
            <button
              onClick={handleCancel}
              style={{
                padding: '8px 16px', background: '#f8fafc', border: '1px solid #e2e8f0',
                borderRadius: 7, color: '#64748b', fontSize: 11, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              style={{
                flex: 1, padding: '8px 16px', background: accentColor, border: 'none',
                borderRadius: 7, color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <Check size={12} strokeWidth={2} />
              Guardar
            </button>
          </>
        )}
      </div>
    </div>
  )
}
