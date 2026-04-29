/**
 * ModelSel — selector de modelo compartido para todos los nodos de IA.
 *
 * Renderiza un <select> con <optgroup> por proveedor, filtrando solo
 * los modelos para los que el usuario tiene API key configurada.
 *
 * Props:
 *   value       — model ID seleccionado actualmente
 *   onChange    — (modelId: string) => void
 *   style       — estilos extra para el <select>
 */
import { groupedModels, getAvailableModels } from '../utils/models'
import { loadApiKeys } from '../utils/storage'

export default function ModelSel({ value, onChange, style = {} }) {
  const keys    = loadApiKeys()
  const models  = getAvailableModels(keys)
  const groups  = groupedModels(models)

  // Si no hay ninguna key configurada, mostrar un placeholder
  if (models.length === 0) {
    return (
      <select disabled style={{ ...baseStyle, color: '#94a3b8', ...style }}>
        <option>Sin API keys</option>
      </select>
    )
  }

  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      onMouseDown={e => e.stopPropagation()}
      style={{ ...baseStyle, ...style }}
    >
      {groups.map(({ group, items }) => (
        <optgroup key={group} label={group}>
          {items.map(m => (
            <option key={m.id} value={m.id}>
              {m.label}
              {m.recommended ? ' ★' : ''}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}

const baseStyle = {
  background:   '#f8fafc',
  border:       '1px solid #e2e8f0',
  borderRadius: 7,
  color:        '#334155',
  fontSize:     10,
  padding:      '3px 7px',
  outline:      'none',
  cursor:       'pointer',
  fontFamily:   'system-ui',
  maxWidth:     150,
}
