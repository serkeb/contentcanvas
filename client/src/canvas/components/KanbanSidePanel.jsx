import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  X, Trash2, Calendar as CalendarIcon, User, Flag, Plus,
  ChevronDown, Check, Link, Mail, Phone, Hash, Type,
  ToggleLeft, List, Pencil, Settings,
} from 'lucide-react'

// ─── Constants ───────────────────────────────────────────────────────────────

const CARD_COLORS = [
  '#ffffff','#fef9c3','#fef3c7','#ecfccb','#d1fae5','#cffafe',
  '#e0f2fe','#dbeafe','#e0e7ff','#f3e8ff','#fce7f3','#fef2f2',
]

const PRIORITIES = [
  { name: 'alta',  color: '#ef4444', bg: '#fef2f2', border: '#fca5a5', label: 'Alta' },
  { name: 'media', color: '#f59e0b', bg: '#fef3c7', border: '#fcd34d', label: 'Media' },
  { name: 'baja',  color: '#22c55e', bg: '#dcfce7', border: '#86efac', label: 'Baja' },
]

const CARD_EMOJIS = [
  '📝','🎯','⚡','🔥','💡','✅','🚀','📌','💬','🧩',
  '🎨','📊','🔍','📋','🏆','⭐','🎁','🔧','💎','🌟',
  '📱','💻','🖊️','📐','🗓️','🔔','📣','🌈','🏷️','💼',
  '🧠','🔑',
]

const SELECT_COLORS = [
  { bg: '#e0e7ff', color: '#4338ca' },
  { bg: '#dcfce7', color: '#15803d' },
  { bg: '#fef3c7', color: '#b45309' },
  { bg: '#fce7f3', color: '#be185d' },
  { bg: '#cffafe', color: '#0e7490' },
  { bg: '#fef2f2', color: '#dc2626' },
  { bg: '#f3e8ff', color: '#7e22ce' },
  { bg: '#ecfccb', color: '#4d7c0f' },
]

const PROP_TYPES = [
  { id: 'text',         label: 'Texto',           icon: <Type size={14} /> },
  { id: 'number',       label: 'Número',          icon: <Hash size={14} /> },
  { id: 'select',       label: 'Selección única', icon: <ChevronDown size={14} /> },
  { id: 'multi_select', label: 'Multiselección',  icon: <List size={14} /> },
  { id: 'date',         label: 'Fecha',           icon: <CalendarIcon size={14} /> },
  { id: 'checkbox',     label: 'Casilla',         icon: <ToggleLeft size={14} /> },
  { id: 'url',          label: 'URL',             icon: <Link size={14} /> },
  { id: 'email',        label: 'Email',           icon: <Mail size={14} /> },
  { id: 'phone',        label: 'Teléfono',        icon: <Phone size={14} /> },
  { id: 'person',       label: 'Persona',         icon: <User size={14} /> },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Divider() {
  return <div style={{ height: 1, background: '#f1f3f4', margin: '14px 0' }} />
}

function SelectBadge({ label, colorIdx = 0, onRemove }) {
  const c = SELECT_COLORS[colorIdx % SELECT_COLORS.length]
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: c.bg, color: c.color, borderRadius: 5, padding: '2px 7px', fontSize: 12, fontWeight: 500 }}>
      {label}
      {onRemove && (
        <span onClick={onRemove} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: 0.6 }}
          onMouseEnter={e => e.currentTarget.style.opacity = 1}
          onMouseLeave={e => e.currentTarget.style.opacity = 0.6}
        ><X size={10} strokeWidth={2.5} /></span>
      )}
    </span>
  )
}

// ─── PropertyEditPopover (position:fixed portal) ──────────────────────────────

function PropertyEditPopover({ anchorRect, def, isBuiltIn, onRename, onChangeType, onAddOption, onRemoveOption, onDelete, onClose }) {
  const [localName, setLocalName] = useState(def.name)
  const [typeMenuOpen, setTypeMenuOpen] = useState(false)
  const [newOpt, setNewOpt] = useState('')
  const inputRef = useRef(null)
  const popRef = useRef(null)

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 30) }, [])

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (popRef.current && !popRef.current.contains(e.target)) onClose()
    }
    setTimeout(() => window.addEventListener('mousedown', handler), 0)
    return () => window.removeEventListener('mousedown', handler)
  }, [onClose])

  const commit = () => {
    const trimmed = localName.trim()
    if (trimmed && trimmed !== def.name) onRename(trimmed)
    onClose()
  }

  const ptDef = PROP_TYPES.find(p => p.id === def.type)
  const options = def.options || []
  const isSelect = def.type === 'select' || def.type === 'multi_select'

  // Position: right of anchor, or left if too close to edge
  const popW = 260
  let left = anchorRect.right + 8
  if (left + popW > window.innerWidth - 12) left = anchorRect.left - popW - 8
  const top = Math.min(anchorRect.top, window.innerHeight - 400)

  return createPortal(
    <div
      ref={popRef}
      style={{
        position: 'fixed', top, left, width: popW, zIndex: 4000,
        background: '#fff', border: '1px solid #e8eaed',
        borderRadius: 12, boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
        padding: 0, overflow: 'hidden',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
      onMouseDown={e => e.stopPropagation()}
    >
      {/* Name */}
      <div style={{ padding: '12px 14px 8px' }}>
        <input
          ref={inputRef}
          value={localName}
          onChange={e => setLocalName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') onClose() }}
          style={{
            width: '100%', boxSizing: 'border-box',
            border: '1px solid #e8eaed', borderRadius: 7, padding: '7px 10px',
            fontSize: 13, outline: 'none', fontFamily: 'inherit',
            background: '#f9fafb', color: '#1a1a1a',
          }}
          placeholder="Nombre de la propiedad"
        />
      </div>

      {/* Type selector */}
      <div style={{ padding: '0 14px 8px', position: 'relative' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>
          Tipo
        </div>
        <button
          onClick={() => !isBuiltIn && setTypeMenuOpen(p => !p)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, width: '100%',
            padding: '7px 10px', border: '1px solid #e8eaed', borderRadius: 7,
            background: isBuiltIn ? '#f9fafb' : '#fff', cursor: isBuiltIn ? 'default' : 'pointer',
            fontSize: 13, color: '#374151', textAlign: 'left',
          }}
        >
          <span style={{ color: '#6366f1', display: 'flex', alignItems: 'center' }}>{ptDef?.icon}</span>
          <span style={{ flex: 1 }}>{ptDef?.label || 'Texto'}</span>
          {!isBuiltIn && <ChevronDown size={13} color="#9ca3af" />}
          {isBuiltIn && <span style={{ fontSize: 10, color: '#9ca3af' }}>bloqueado</span>}
        </button>

        {typeMenuOpen && (
          <div style={{
            position: 'absolute', top: '100%', left: 14, right: 14, zIndex: 10,
            background: '#fff', border: '1px solid #e8eaed', borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: '6px 0',
          }}>
            {PROP_TYPES.map(pt => (
              <button
                key={pt.id}
                onClick={() => { onChangeType(pt.id); setTypeMenuOpen(false) }}
                style={{
                  width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '7px 12px', background: def.type === pt.id ? '#f5f3ff' : 'none',
                  border: 'none', cursor: 'pointer', fontSize: 13, color: '#1a1a1a',
                }}
                onMouseEnter={e => { if (def.type !== pt.id) e.currentTarget.style.background = '#f7f8f9' }}
                onMouseLeave={e => { if (def.type !== pt.id) e.currentTarget.style.background = 'none' }}
              >
                <span style={{ color: '#6366f1', display: 'flex', alignItems: 'center', width: 18 }}>{pt.icon}</span>
                <span style={{ flex: 1 }}>{pt.label}</span>
                {def.type === pt.id && <Check size={13} color="#6366f1" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Options (select/multi_select) */}
      {isSelect && (
        <div style={{ padding: '0 14px 10px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
            Opciones
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 140, overflowY: 'auto', marginBottom: 6 }}>
            {options.map((opt, i) => (
              <div key={opt} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <SelectBadge label={opt} colorIdx={i} />
                <button
                  onClick={() => onRemoveOption(opt)}
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', display: 'flex', padding: 2, borderRadius: 4 }}
                  onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                  onMouseLeave={e => e.currentTarget.style.color = '#d1d5db'}
                >
                  <X size={12} strokeWidth={2} />
                </button>
              </div>
            ))}
            {options.length === 0 && (
              <div style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic' }}>Sin opciones todavía</div>
            )}
          </div>
          <input
            value={newOpt}
            onChange={e => setNewOpt(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && newOpt.trim() && !options.includes(newOpt.trim())) {
                onAddOption(newOpt.trim())
                setNewOpt('')
              }
            }}
            placeholder="+ Agregar opción (Enter)"
            style={{
              width: '100%', boxSizing: 'border-box',
              border: '1px solid #e8eaed', borderRadius: 7, padding: '6px 10px',
              fontSize: 12, outline: 'none', fontFamily: 'inherit',
            }}
          />
        </div>
      )}

      {/* Actions */}
      <div style={{ borderTop: '1px solid #f1f3f4', padding: '8px 14px', display: 'flex', gap: 6 }}>
        <button
          onClick={commit}
          style={{ flex: 1, padding: '6px 0', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
        >
          Guardar
        </button>
        {!isBuiltIn && (
          <button
            onClick={() => { onDelete(); onClose() }}
            style={{ padding: '6px 12px', background: 'none', border: '1px solid #fecaca', borderRadius: 7, cursor: 'pointer', fontSize: 13, color: '#dc2626' }}
            title="Eliminar propiedad"
          >
            <Trash2 size={13} strokeWidth={2} />
          </button>
        )}
      </div>
    </div>,
    document.body
  )
}

// ─── PropRow with clickable label ─────────────────────────────────────────────

function PropRow({ icon, def, isBuiltIn, onRename, onChangeType, onAddOption, onRemoveOption, onDeleteDef, children }) {
  const [hovered, setHovered] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [anchorRect, setAnchorRect] = useState(null)
  const labelRef = useRef(null)

  const openEditor = () => {
    if (labelRef.current) {
      setAnchorRect(labelRef.current.getBoundingClientRect())
      setEditorOpen(true)
    }
  }

  return (
    <div
      style={{ display: 'flex', alignItems: 'flex-start', minHeight: 34, borderRadius: 6, padding: '4px 4px', background: hovered ? '#f7f8f9' : 'transparent', transition: 'background 0.1s' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Clickable label */}
      <div
        ref={labelRef}
        onClick={openEditor}
        style={{
          display: 'flex', alignItems: 'center', gap: 5, width: 134, flexShrink: 0,
          cursor: 'pointer', borderRadius: 5, padding: '2px 4px',
          transition: 'background 0.1s',
        }}
        title="Editar propiedad"
        onMouseEnter={e => e.currentTarget.style.background = '#ede9fe'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <span style={{ color: '#8c8fa1', display: 'flex', alignItems: 'center', flexShrink: 0 }}>{icon}</span>
        <span style={{ fontSize: 13, color: '#6b7280', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {def.name}
        </span>
        {hovered && <Pencil size={10} color="#a78bfa" style={{ flexShrink: 0 }} />}
      </div>

      {/* Value area */}
      <div style={{ flex: 1, fontSize: 13, color: '#1a1a1a', minWidth: 0, paddingTop: 2 }}>
        {children}
      </div>

      {/* Property editor popover */}
      {editorOpen && anchorRect && (
        <PropertyEditPopover
          anchorRect={anchorRect}
          def={def}
          isBuiltIn={isBuiltIn}
          onRename={onRename}
          onChangeType={onChangeType}
          onAddOption={onAddOption}
          onRemoveOption={onRemoveOption}
          onDelete={onDeleteDef}
          onClose={() => setEditorOpen(false)}
        />
      )}
    </div>
  )
}

// ─── Full Emoji Picker ────────────────────────────────────────────────────────

const EMOJI_CATEGORIES = [
  { id: 'recent',  label: '🕐', name: 'Recientes', emojis: [] },
  { id: 'smileys', label: '😀', name: 'Expresiones',
    emojis: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😊','😇','🥰','😍','🤩','😘','😗','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥳','🥸','😎','🤓','🧐','😕','😟','🙁','☹️','😮','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡','👹','👻','👽','🤖','😺','😸','😹','😻','😼','😽','🙀','😿','😾'] },
  { id: 'people',  label: '👋', name: 'Personas',
    emojis: ['👋','🤚','🖐️','✋','🖖','👌','🤌','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💪','🦾','👁️','👅','💋','👶','🧒','👦','👧','🧑','👱','👨','🧔','👩','🧓','👴','👵','🙍','🙎','🙅','🙆','💁','🙋','🧏','🙇','🤦','🤷','👮','💂','🕵️','👷','🤴','👸','👳','👲','🧕','🤵','👰','🤰','🤱','👼','🎅','🤶','🦸','🦹','🧙','🧚','🧛','🧜','🧝','🧞','🧟','💆','💇','🚶','🏃','💃','🕺','👯','🧗','🏋️','🤼','🤸','⛹️','🏄','🚴','🧘'] },
  { id: 'animals', label: '🐶', name: 'Animales',
    emojis: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐔','🐧','🐦','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🦋','🐛','🐌','🐞','🐜','🦂','🐢','🐍','🦎','🐙','🦑','🐡','🐟','🐠','🐬','🐳','🐋','🦈','🐊','🐅','🐆','🦓','🦍','🐘','🦛','🦏','🐪','🐫','🦒','🦘','🐃','🐂','🐄','🐎','🐖','🐏','🐑','🦙','🐐','🦌','🐕','🐩','🐈','🐓','🦃','🦚','🦜','🦢','🦩','🕊️','🐇','🦝','🦨','🦡','🦦','🦥','🐁','🐀','🐿️','🦔','🌵','🌲','🌳','🌴','🌱','🌿','☘️','🍀','🍃','🍂','🍁','🍄','🌾','💐','🌷','🌹','🌺','🌸','🌼','🌻','🌞','🌝','🌙','⭐','🌟','🌠','☁️','❄️','🌊','🌀'] },
  { id: 'food',    label: '🍎', name: 'Comida',
    emojis: ['🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌶️','🧄','🧅','🥔','🍠','🥐','🥯','🍞','🥖','🧀','🥚','🍳','🥞','🧇','🥓','🥩','🍗','🍖','🌭','🍔','🍟','🍕','🌮','🌯','🥙','🧆','🍱','🍣','🍤','🥟','🍜','🍝','🍛','🍲','🍦','🍧','🍨','🍩','🍪','🎂','🍰','🧁','🍫','🍬','🍭','🍮','🍯','🥛','☕','🍵','🧃','🥤','🧋','🍺','🍻','🥂','🍷','🥃','🍸','🍹','🧉','🍾'] },
  { id: 'travel',  label: '🚀', name: 'Viajes',
    emojis: ['🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🚜','🏍️','🛵','🚲','🛴','🚁','🛸','🚀','✈️','🛩️','🛫','🛬','🪂','⛵','🚤','🛥️','🛳️','🚢','🚂','🚆','🚇','🚈','🚉','🚊','🚝','🏠','🏡','🏢','🏥','🏦','🏨','🏪','🏫','🏬','🏭','🏯','🏰','⛺','🗺️','🏔️','⛰️','🌋','🏕️','🏖️','🏙️','🌃','🌆','🌇','🌉','🎠','🎡','🎢','🗽','🗼','🏛️','⛩️','🕌','🕍','⛪','⛽','🚦','🚥','🗺️'] },
  { id: 'activity',label: '⚽', name: 'Actividades',
    emojis: ['⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🏓','🏸','🏒','⛳','🏹','🎣','🥊','🥋','🎽','🛹','🛷','⛸️','🏋️','🏇','🤺','🏊','🚴','🧘','🧗','🏌️','🏂','🤸','🤼','🤾','⛷️','🎿','🪁','🎯','🎲','🎮','🕹️','🎰','🧩','🎭','🎪','🎨','🎬','🎤','🎧','🎼','🎵','🎶','🎷','🎸','🎹','🎺','🎻','🥁','🪘','🎲','🃏','🀄','🎴','🎑','🎃','🎄','🎆','🎇','🧨','✨','🎉','🎊','🎋','🎍','🎎','🎏','🎐','🎁','🎗️','🎟️','🎫','🎖️','🏆','🥇','🥈','🥉','🏅','🎖️'] },
  { id: 'objects', label: '💡', name: 'Objetos',
    emojis: ['💡','🔦','🕯️','🧯','💰','💳','💎','⚖️','🔑','🗝️','🔨','⛏️','🔧','🔩','⚙️','🔗','🧲','🔒','🔓','🚪','🛏️','🛋️','🚿','🛁','🧴','🧷','🧹','🧺','🧻','🧼','🧽','📱','💻','⌨️','🖥️','🖨️','🖱️','💾','💿','📀','🎥','📺','📷','📸','📹','📻','📠','📞','☎️','🔋','🔌','📔','📒','📕','📗','📘','📙','📚','📓','📃','📄','📑','📊','📈','📉','🗒️','🗓️','📅','📆','📇','📌','📍','✂️','📎','🗂️','🗃️','🗄️','🗑️','📬','📭','📮','🏷️','📦','📫','📪','✏️','🖊️','🖋️','🖌️','🖍️','📝','🔍','🔎','🔬','🔭','📡','🩺','💊','🩹','🧬','🧪','🧫','🧲','💈'] },
  { id: 'symbols', label: '❤️', name: 'Símbolos',
    emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','❤️‍🔥','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','☮️','✝️','☪️','🕉️','✡️','🛐','🔱','♻️','⚜️','🔰','✅','❎','💯','🆗','🆙','🆒','🆕','🆓','🔴','🟠','🟡','🟢','🔵','🟣','⚫','⚪','🟤','🔶','🔷','🔸','🔹','🔺','🔻','💠','🔘','🔲','🔳','▪️','▫️','◾','◽','◼️','◻️','🟥','🟧','🟨','🟩','🟦','🟪','⬛','⬜','🟫','➕','➖','➗','✖️','♾️','💲','💱','™️','©️','®️','〰️','➰','➿','🔚','🔛','🔜','🔝','🔙','⏫','⏬','⏩','⏪','⏭️','⏮️','🔀','🔁','🔂','▶️','◀️','🔼','🔽','⏸️','⏹️','⏺️'] },
]

const RECENT_EMOJIS_KEY = 'kanban_recent_emojis'

function FullEmojiPicker({ current, onSelect, onClose, anchorRef }) {
  const [query, setQuery]   = useState('')
  const [catId, setCatId]   = useState('smileys')
  const popRef  = useRef(null)
  const searchRef = useRef(null)

  // Recent emojis
  const [recent, setRecent] = useState(() => {
    try { return JSON.parse(localStorage.getItem(RECENT_EMOJIS_KEY) || '[]') } catch { return [] }
  })

  useEffect(() => { setTimeout(() => searchRef.current?.focus(), 30) }, [])

  useEffect(() => {
    const h = (e) => { if (popRef.current && !popRef.current.contains(e.target) && anchorRef?.current && !anchorRef.current.contains(e.target)) onClose() }
    setTimeout(() => window.addEventListener('mousedown', h), 0)
    return () => window.removeEventListener('mousedown', h)
  }, [onClose])

  const handleSelect = (em) => {
    const next = [em, ...recent.filter(r => r !== em)].slice(0, 24)
    setRecent(next)
    try { localStorage.setItem(RECENT_EMOJIS_KEY, JSON.stringify(next)) } catch {}
    onSelect(em)
    onClose()
  }

  // Build display list
  const allEmojis = EMOJI_CATEGORIES.flatMap(c => c.emojis)
  const filtered  = query.trim() ? allEmojis.filter(e => e.includes(query)) : null

  const activeCat = catId === 'recent'
    ? { ...EMOJI_CATEGORIES[0], emojis: recent }
    : EMOJI_CATEGORIES.find(c => c.id === catId) || EMOJI_CATEGORIES[1]

  const displayEmojis = filtered || activeCat.emojis

  // Position: below anchor, centered
  const [pos, setPos] = useState({ top: 0, left: 0 })
  useEffect(() => {
    if (!anchorRef?.current) return
    const r = anchorRef.current.getBoundingClientRect()
    const pw = 320, ph = 360
    let left = r.left + r.width / 2 - pw / 2
    let top  = r.bottom + 8
    if (left < 8) left = 8
    if (left + pw > window.innerWidth - 8) left = window.innerWidth - pw - 8
    if (top + ph > window.innerHeight - 8) top = r.top - ph - 8
    setPos({ top, left })
  }, [])

  return createPortal(
    <div ref={popRef}
      style={{ position: 'fixed', top: pos.top, left: pos.left, width: 320, zIndex: 4000, background: '#fff', border: '1px solid #e8eaed', borderRadius: 14, boxShadow: '0 16px 48px rgba(0,0,0,0.18)', overflow: 'hidden', fontFamily: 'system-ui' }}
      onMouseDown={e => e.stopPropagation()}
    >
      {/* Search */}
      <div style={{ padding: '10px 12px 6px', borderBottom: '1px solid #f1f3f4' }}>
        <input ref={searchRef} value={query} onChange={e => { setQuery(e.target.value); if (e.target.value) setCatId('search') }}
          onKeyDown={e => { if (e.key === 'Escape') onClose() }}
          placeholder="Buscar emoji..."
          style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #e8eaed', borderRadius: 8, padding: '7px 10px', fontSize: 13, outline: 'none', fontFamily: 'inherit', background: '#f9fafb' }}
        />
      </div>

      {/* Category tabs */}
      {!query && (
        <div style={{ display: 'flex', padding: '4px 8px', gap: 2, borderBottom: '1px solid #f1f3f4', overflowX: 'auto' }}>
          {[{ id: 'recent', label: '🕐', name: 'Recientes' }, ...EMOJI_CATEGORIES.slice(1)].map(cat => (
            <button key={cat.id} onClick={() => setCatId(cat.id)}
              style={{ flexShrink: 0, width: 32, height: 32, border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 18, background: catId === cat.id ? '#eef2ff' : 'transparent', transition: 'background 0.1s' }}
              title={cat.name}
              onMouseEnter={e => { if (catId !== cat.id) e.currentTarget.style.background = '#f5f6f7' }}
              onMouseLeave={e => { if (catId !== cat.id) e.currentTarget.style.background = 'transparent' }}
            >{cat.label}</button>
          ))}
        </div>
      )}

      {/* Category label */}
      {!query && (
        <div style={{ padding: '6px 12px 2px', fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {catId === 'recent' ? 'Recientes' : EMOJI_CATEGORIES.find(c => c.id === catId)?.name}
        </div>
      )}
      {query && (
        <div style={{ padding: '6px 12px 2px', fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Resultados ({filtered?.length || 0})
        </div>
      )}

      {/* Emoji grid */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 1, padding: '4px 8px 10px', maxHeight: 220, overflowY: 'auto' }}>
        {(catId === 'recent' && !query ? recent : displayEmojis).length === 0 ? (
          <div style={{ padding: '20px', color: '#9ca3af', fontSize: 13, textAlign: 'center', width: '100%' }}>
            {catId === 'recent' ? 'Aún no usaste ningún emoji' : 'Sin resultados'}
          </div>
        ) : (catId === 'recent' && !query ? recent : displayEmojis).map(em => (
          <button key={em} onClick={() => handleSelect(em)}
            style={{ width: 36, height: 36, borderRadius: 6, fontSize: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: current === em ? '2px solid #6366f1' : '2px solid transparent', background: current === em ? '#eef2ff' : 'transparent', transition: 'background 0.1s' }}
            onMouseEnter={e => { if (current !== em) e.currentTarget.style.background = '#f5f6f7' }}
            onMouseLeave={e => { if (current !== em) e.currentTarget.style.background = 'transparent' }}
          >{em}</button>
        ))}
      </div>
    </div>,
    document.body
  )
}

// ─── Custom property value editor ────────────────────────────────────────────

function PropValueEditor({ def, value, onChange }) {
  const [selectOpen, setSelectOpen] = useState(false)
  const [newOptionText, setNewOptionText] = useState('')
  const btnRef = useRef(null)
  const [dropRect, setDropRect] = useState(null)

  const inputStyle = { border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: '#1a1a1a', fontFamily: 'inherit', width: '100%' }
  const options = def.options || []

  if (def.type === 'text')     return <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} placeholder="Vacío" style={inputStyle} />
  if (def.type === 'number')   return <input type="number" value={value ?? ''} onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))} placeholder="0" style={{ ...inputStyle, width: 80 }} />
  if (def.type === 'date')     return <input type="date" value={value || ''} onChange={e => onChange(e.target.value)} style={{ ...inputStyle, cursor: 'pointer', colorScheme: 'light' }} />
  if (def.type === 'checkbox') return <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)} style={{ accentColor: '#6366f1', width: 15, height: 15, cursor: 'pointer' }} />
  if (def.type === 'url')      return <input type="url" value={value || ''} onChange={e => onChange(e.target.value)} placeholder="https://" style={inputStyle} />
  if (def.type === 'email')    return <input type="email" value={value || ''} onChange={e => onChange(e.target.value)} placeholder="correo@ejemplo.com" style={inputStyle} />
  if (def.type === 'phone')    return <input type="tel" value={value || ''} onChange={e => onChange(e.target.value)} placeholder="+54 9 ..." style={inputStyle} />
  if (def.type === 'person')   return <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} placeholder="Miembro del equipo" style={inputStyle} />

  if (def.type === 'select' || def.type === 'multi_select') {
    const isMulti  = def.type === 'multi_select'
    const selected = isMulti ? (Array.isArray(value) ? value : []) : (value ? [value] : [])

    const toggleOpt = (opt) => {
      if (isMulti) {
        onChange(selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt])
      } else {
        onChange(selected[0] === opt ? null : opt)
        setSelectOpen(false)
      }
    }

    const openDrop = () => {
      if (btnRef.current) { setDropRect(btnRef.current.getBoundingClientRect()); setSelectOpen(true) }
    }

    return (
      <>
        <div ref={btnRef} onClick={openDrop} style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center', cursor: 'pointer', minHeight: 22 }}>
          {selected.map((s, i) => {
            const idx = options.indexOf(s)
            return <SelectBadge key={s} label={s} colorIdx={idx >= 0 ? idx : i} onRemove={e => { e?.stopPropagation(); isMulti ? onChange(selected.filter(x => x !== s)) : onChange(null) }} />
          })}
          {selected.length === 0 && <span style={{ fontSize: 13, color: '#9ca3af' }}>Sin selección</span>}
        </div>

        {selectOpen && dropRect && createPortal(
          <div
            style={{ position: 'fixed', top: dropRect.bottom + 4, left: dropRect.left, zIndex: 4000, background: '#fff', border: '1px solid #e8eaed', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: '6px 0', minWidth: 180 }}
            onMouseDown={e => e.stopPropagation()}
          >
            {options.map((opt, i) => (
              <button key={opt} onClick={() => toggleOpt(opt)}
                style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}
                onMouseEnter={e => e.currentTarget.style.background = '#f7f8f9'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <SelectBadge label={opt} colorIdx={i} />
                {selected.includes(opt) && <Check size={13} color="#6366f1" style={{ marginLeft: 'auto' }} />}
              </button>
            ))}
            {options.length === 0 && <div style={{ padding: '6px 10px', fontSize: 12, color: '#9ca3af' }}>Sin opciones — edita la propiedad para añadir</div>}
            <div style={{ borderTop: '1px solid #f1f3f4', padding: '6px 8px', marginTop: 4 }}>
              <input value={newOptionText} onChange={e => setNewOptionText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && newOptionText.trim() && !options.includes(newOptionText.trim())) {
                    def._addOption && def._addOption(newOptionText.trim())
                    setNewOptionText('')
                  }
                  if (e.key === 'Escape') setSelectOpen(false)
                }}
                placeholder="Nueva opción..."
                style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #e8eaed', borderRadius: 6, padding: '5px 8px', fontSize: 12, outline: 'none', fontFamily: 'inherit' }}
              />
            </div>
            <button onClick={() => setSelectOpen(false)} style={{ display: 'none' }} />
          </div>,
          document.body
        )}

        {/* Close on outside click */}
        {selectOpen && createPortal(
          <div style={{ position: 'fixed', inset: 0, zIndex: 3999 }} onMouseDown={() => setSelectOpen(false)} />,
          document.body
        )}
      </>
    )
  }

  return <span style={{ fontSize: 13, color: '#9ca3af' }}>—</span>
}

// ─── Add Property Form (portal-based type selector) ──────────────────────────

function AddPropForm({ onAdd, onCancel }) {
  const [name, setName] = useState('')
  const [type, setType] = useState('text')
  const [typeMenuOpen, setTypeMenuOpen] = useState(false)
  const [menuRect, setMenuRect] = useState(null)
  const typeBtn = useRef(null)
  const nameInput = useRef(null)

  useEffect(() => { setTimeout(() => nameInput.current?.focus(), 30) }, [])

  const ptDef = PROP_TYPES.find(p => p.id === type)

  const submit = () => {
    if (!name.trim()) return
    onAdd({
      id:      `prop-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name:    name.trim(),
      type,
      options: (type === 'select' || type === 'multi_select') ? [] : undefined,
    })
  }

  const openTypeMenu = () => {
    if (typeBtn.current) { setMenuRect(typeBtn.current.getBoundingClientRect()); setTypeMenuOpen(true) }
  }

  return (
    <div style={{ background: '#f7f8f9', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <input
        ref={nameInput}
        type="text" value={name} onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onCancel() }}
        placeholder="Nombre de la propiedad"
        style={{ border: '1px solid #e8eaed', borderRadius: 7, padding: '7px 10px', fontSize: 13, outline: 'none', fontFamily: 'inherit', background: '#fff' }}
      />

      {/* Type picker button */}
      <button
        ref={typeBtn}
        onClick={openTypeMenu}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 7, border: '1px solid #e8eaed', background: '#fff', cursor: 'pointer', fontSize: 13, color: '#374151', textAlign: 'left' }}
      >
        <span style={{ color: '#6366f1', display: 'flex', alignItems: 'center' }}>{ptDef?.icon}</span>
        <span style={{ flex: 1 }}>{ptDef?.label || 'Texto'}</span>
        <ChevronDown size={13} color="#9ca3af" />
      </button>

      {/* Type menu — fixed portal */}
      {typeMenuOpen && menuRect && createPortal(
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 3999 }} onMouseDown={() => setTypeMenuOpen(false)} />
          <div style={{
            position: 'fixed', top: menuRect.bottom + 4, left: menuRect.left, zIndex: 4000,
            background: '#fff', border: '1px solid #e8eaed', borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: '6px 0', width: menuRect.width,
          }} onMouseDown={e => e.stopPropagation()}>
            {PROP_TYPES.map(pt => (
              <button key={pt.id} onClick={() => { setType(pt.id); setTypeMenuOpen(false) }}
                style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px', background: type === pt.id ? '#f5f3ff' : 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#1a1a1a' }}
                onMouseEnter={e => { if (type !== pt.id) e.currentTarget.style.background = '#f7f8f9' }}
                onMouseLeave={e => { if (type !== pt.id) e.currentTarget.style.background = 'none' }}
              >
                <span style={{ color: '#6366f1', display: 'flex', alignItems: 'center', width: 18 }}>{pt.icon}</span>
                <span style={{ flex: 1 }}>{pt.label}</span>
                {type === pt.id && <Check size={13} color="#6366f1" />}
              </button>
            ))}
          </div>
        </>,
        document.body
      )}

      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={submit} style={{ flex: 1, padding: '7px 0', borderRadius: 7, background: '#6366f1', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          Crear
        </button>
        <button onClick={onCancel} style={{ padding: '7px 14px', borderRadius: 7, background: 'none', color: '#6b7280', border: '1px solid #e8eaed', cursor: 'pointer', fontSize: 13 }}>
          Cancelar
        </button>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function KanbanSidePanel({
  card,
  columns,
  propertyDefs = [],
  visible,
  onClose,
  onUpdate,
  onDelete,
  onMoveToColumn,
  onAddPropertyDef,
  onUpdatePropertyDef,
  onDeletePropertyDef,
}) {
  const [panelWidth, setPanelWidth] = useState(420)
  const isResizing = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(420)

  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false)
  const [newChecklistText, setNewChecklistText] = useState('')
  const [hoveredCheckItem, setHoveredCheckItem] = useState(null)
  const [addPropOpen, setAddPropOpen] = useState(false)
  const titleRef = useRef(null)

  // Auto-resize title textarea
  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.style.height = 'auto'
      titleRef.current.style.height = titleRef.current.scrollHeight + 'px'
    }
  }, [card?.title])

  // Panel resize
  const startResize = useCallback((e) => {
    isResizing.current = true
    startX.current = e.clientX
    startWidth.current = panelWidth
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'
  }, [panelWidth])

  useEffect(() => {
    const onMove = (e) => {
      if (!isResizing.current) return
      setPanelWidth(Math.min(760, Math.max(320, startWidth.current + startX.current - e.clientX)))
    }
    const onUp = () => {
      if (!isResizing.current) return
      isResizing.current = false
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])

  if (!card) return null

  const safeColumns    = columns || []
  const currentColumn  = card.column || (safeColumns[0] ?? '')
  const checklist      = card.checklist || []
  const doneCnt        = checklist.filter(i => i.done).length
  const totalCnt       = checklist.length
  const propertyValues = card.propertyValues || {}

  const today     = new Date(); today.setHours(0,0,0,0)
  const dueDate   = card.dueDate ? new Date(card.dueDate) : null
  const isOverdue = dueDate && dueDate < today
  const isToday   = dueDate && dueDate.getTime() === today.getTime()
  const dueDateColor = isOverdue ? '#dc2626' : isToday ? '#d97706' : '#1a1a1a'

  let createdDisplay = ''
  if (card.id) {
    const match = card.id.match(/card-(\d+)/)
    if (match) {
      const ts = parseInt(match[1], 10)
      if (!isNaN(ts)) createdDisplay = new Date(ts).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
    }
  }
  if (!createdDisplay) createdDisplay = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })

  // Checklist
  const addChecklistItem = () => {
    if (!newChecklistText.trim()) return
    onUpdate(card.id, { checklist: [...checklist, { id: `chk-${Date.now()}`, text: newChecklistText.trim(), done: false }] })
    setNewChecklistText('')
  }
  const updateChecklistItem = (id, changes) => onUpdate(card.id, { checklist: checklist.map(it => it.id === id ? { ...it, ...changes } : it) })
  const deleteChecklistItem = (id) => onUpdate(card.id, { checklist: checklist.filter(it => it.id !== id) })

  // Custom props
  const updatePropValue = (defId, val) => onUpdate(card.id, { propertyValues: { ...propertyValues, [defId]: val } })

  const addOptionToDef = (defId, optionLabel) => {
    const def = propertyDefs.find(d => d.id === defId)
    if (!def || (def.options || []).includes(optionLabel)) return
    onUpdatePropertyDef && onUpdatePropertyDef(defId, { ...def, options: [...(def.options || []), optionLabel] })
  }

  const removeOptionFromDef = (defId, optionLabel) => {
    const def = propertyDefs.find(d => d.id === defId)
    if (!def) return
    onUpdatePropertyDef && onUpdatePropertyDef(defId, { ...def, options: (def.options || []).filter(o => o !== optionLabel) })
  }

  // Built-in prop defs (for the editor to show name/type)
  const builtInDefs = {
    status:   { id: 'status',   name: 'Estado',      type: 'status' },
    priority: { id: 'priority', name: 'Prioridad',   type: 'priority' },
    assignee: { id: 'assignee', name: 'Asignado',    type: 'person' },
    dueDate:  { id: 'dueDate',  name: 'Vencimiento', type: 'date' },
  }

  const handleRenameBuiltIn = (key, newName) => {
    // Store renamed built-in labels in the card's builtInLabels field
    const labels = card.builtInLabels || {}
    onUpdate(card.id, { builtInLabels: { ...labels, [key]: newName } })
  }

  const getBuiltInLabel = (key) => (card.builtInLabels || {})[key] || builtInDefs[key].name

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 2999, background: visible ? 'rgba(0,0,0,0.12)' : 'transparent', pointerEvents: visible ? 'auto' : 'none', transition: 'background 0.2s' }} />

      {/* Panel */}
      <div
        style={{
          position: 'fixed', right: 0, top: 0, bottom: 0, width: panelWidth,
          background: '#fff', zIndex: 3000,
          boxShadow: '-4px 0 32px rgba(0,0,0,0.10)',
          display: 'flex', flexDirection: 'column',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          transform: visible ? 'translateX(0)' : 'translateX(100%)',
          transition: isResizing.current ? 'none' : 'transform 0.22s cubic-bezier(0.4,0,0.2,1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Resize handle */}
        <div onMouseDown={startResize}
          style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, cursor: 'col-resize', zIndex: 10, borderLeft: '3px solid transparent', transition: 'border-color 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.borderLeftColor = '#6366f1'}
          onMouseLeave={e => e.currentTarget.style.borderLeftColor = 'transparent'}
        />

        {/* Header */}
        <div style={{ height: 46, borderBottom: '1px solid #f1f3f4', display: 'flex', alignItems: 'center', padding: '0 14px', gap: 8, flexShrink: 0 }}>
          <span style={{ flex: 1, fontSize: 12, color: '#8c8fa1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentColumn}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5f6368', display: 'flex', alignItems: 'center', padding: 6, borderRadius: 6 }}
            onMouseEnter={e => e.currentTarget.style.background = '#f1f3f4'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          ><X size={16} strokeWidth={2} /></button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 40px' }}>

          {/* Emoji */}
          <div style={{ textAlign: 'center', marginBottom: 10, position: 'relative', display: 'inline-block', left: '50%', transform: 'translateX(-50%)' }}>
            <button onClick={e => { e.stopPropagation(); setEmojiPickerOpen(p => !p) }}
              style={{ fontSize: 40, background: 'none', border: '2px solid transparent', cursor: 'pointer', padding: '4px 8px', borderRadius: 10, lineHeight: 1 }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#e8eaed'; e.currentTarget.style.background = '#f7f8f9' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'none' }}
            >{card.emoji || '📝'}</button>
            {emojiPickerOpen && <EmojiPicker current={card.emoji || '📝'} onSelect={em => onUpdate(card.id, { emoji: em })} onClose={() => setEmojiPickerOpen(false)} />}
          </div>

          {/* Title */}
          <textarea ref={titleRef} value={card.title || ''} onChange={e => { onUpdate(card.id, { title: e.target.value }); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
            placeholder="Sin título" rows={1}
            style={{ width: '100%', fontSize: 22, fontWeight: 700, color: '#1a1a1a', border: 'none', outline: 'none', resize: 'none', fontFamily: 'inherit', marginBottom: 20, lineHeight: 1.35, background: 'transparent', overflow: 'hidden', boxSizing: 'border-box' }}
          />

          {/* Properties */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginBottom: 4 }}>

            {/* Estado */}
            <PropRow
              icon={<Flag size={14} />}
              def={{ ...builtInDefs.status, name: getBuiltInLabel('status') }}
              isBuiltIn
              onRename={v => handleRenameBuiltIn('status', v)}
              onChangeType={() => {}} onAddOption={() => {}} onRemoveOption={() => {}} onDeleteDef={() => {}}
            >
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {safeColumns.map(col => (
                  <button key={col} onClick={() => onMoveToColumn(card.id, col)}
                    style={{ padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: col === currentColumn ? 'none' : '1px solid #e8eaed', background: col === currentColumn ? '#6366f1' : 'transparent', color: col === currentColumn ? '#fff' : '#5f6368' }}
                  >{col}</button>
                ))}
              </div>
            </PropRow>

            {/* Prioridad */}
            <PropRow
              icon={<Flag size={14} />}
              def={{ ...builtInDefs.priority, name: getBuiltInLabel('priority') }}
              isBuiltIn
              onRename={v => handleRenameBuiltIn('priority', v)}
              onChangeType={() => {}} onAddOption={() => {}} onRemoveOption={() => {}} onDeleteDef={() => {}}
            >
              <div style={{ display: 'flex', gap: 4 }}>
                {PRIORITIES.map(p => (
                  <button key={p.name} onClick={() => onUpdate(card.id, { priority: card.priority === p.name ? null : p.name })}
                    style={{ padding: '2px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer', background: card.priority === p.name ? p.bg : 'transparent', border: card.priority === p.name ? `1px solid ${p.border}` : '1px solid #e8eaed', color: card.priority === p.name ? p.color : '#5f6368' }}
                  >{p.label}</button>
                ))}
              </div>
            </PropRow>

            {/* Asignado */}
            <PropRow
              icon={<User size={14} />}
              def={{ ...builtInDefs.assignee, name: getBuiltInLabel('assignee') }}
              isBuiltIn
              onRename={v => handleRenameBuiltIn('assignee', v)}
              onChangeType={() => {}} onAddOption={() => {}} onRemoveOption={() => {}} onDeleteDef={() => {}}
            >
              <input type="text" value={card.assignee || ''} onChange={e => onUpdate(card.id, { assignee: e.target.value })} placeholder="Sin asignar"
                style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: '#1a1a1a', fontFamily: 'inherit', width: '100%' }}
              />
            </PropRow>

            {/* Vencimiento */}
            <PropRow
              icon={<CalendarIcon size={14} />}
              def={{ ...builtInDefs.dueDate, name: getBuiltInLabel('dueDate') }}
              isBuiltIn
              onRename={v => handleRenameBuiltIn('dueDate', v)}
              onChangeType={() => {}} onAddOption={() => {}} onRemoveOption={() => {}} onDeleteDef={() => {}}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {isToday && card.dueDate && <span style={{ fontSize: 12, color: '#d97706', fontWeight: 500 }}>Hoy</span>}
                {isOverdue && card.dueDate && <span style={{ fontSize: 12, color: '#dc2626', fontWeight: 500 }}>Vencida</span>}
                <input type="date" value={card.dueDate || ''} onChange={e => onUpdate(card.id, { dueDate: e.target.value })}
                  style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: dueDateColor, fontFamily: 'inherit', cursor: 'pointer', colorScheme: 'light' }}
                />
              </div>
            </PropRow>

            {/* Custom properties */}
            {propertyDefs.map(def => {
              const ptDef = PROP_TYPES.find(p => p.id === def.type)
              const defWithHelper = { ...def, _addOption: (label) => addOptionToDef(def.id, label) }
              return (
                <PropRow
                  key={def.id}
                  icon={ptDef?.icon || <Settings size={14} />}
                  def={def}
                  isBuiltIn={false}
                  onRename={newName => onUpdatePropertyDef && onUpdatePropertyDef(def.id, { ...def, name: newName })}
                  onChangeType={newType => onUpdatePropertyDef && onUpdatePropertyDef(def.id, { ...def, type: newType, options: (newType === 'select' || newType === 'multi_select') ? (def.options || []) : undefined })}
                  onAddOption={label => addOptionToDef(def.id, label)}
                  onRemoveOption={label => removeOptionFromDef(def.id, label)}
                  onDeleteDef={() => onDeletePropertyDef && onDeletePropertyDef(def.id)}
                >
                  <PropValueEditor
                    def={defWithHelper}
                    value={propertyValues[def.id]}
                    onChange={val => updatePropValue(def.id, val)}
                  />
                </PropRow>
              )
            })}
          </div>

          {/* Add property */}
          <div style={{ marginTop: 4, marginBottom: 4 }}>
            {!addPropOpen ? (
              <button onClick={() => setAddPropOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#9ca3af', width: '100%' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#f7f8f9'; e.currentTarget.style.color = '#374151' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#9ca3af' }}
              >
                <Plus size={13} strokeWidth={2} /> Agregar propiedad
              </button>
            ) : (
              <AddPropForm
                onAdd={def => { onAddPropertyDef && onAddPropertyDef(def); setAddPropOpen(false) }}
                onCancel={() => setAddPropOpen(false)}
              />
            )}
          </div>

          <Divider />

          {/* Description */}
          <div style={{ marginBottom: 4 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#8c8fa1', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>Descripción</div>
            <textarea value={card.description || ''} onChange={e => onUpdate(card.id, { description: e.target.value })} placeholder="Añadí una descripción..."
              style={{ width: '100%', minHeight: 80, border: 'none', outline: 'none', fontSize: 13, lineHeight: 1.65, color: '#1a1a1a', resize: 'none', fontFamily: 'inherit', background: 'transparent', boxSizing: 'border-box' }}
            />
          </div>

          <Divider />

          {/* Checklist */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', flex: 1 }}>✅ Checklist</span>
              {totalCnt > 0 && <span style={{ fontSize: 12, color: '#8c8fa1' }}>{doneCnt}/{totalCnt}</span>}
            </div>
            {totalCnt > 0 && (
              <div style={{ height: 3, background: '#e8eaed', borderRadius: 2, marginBottom: 10, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: '#22c55e', borderRadius: 2, width: `${(doneCnt / totalCnt) * 100}%`, transition: 'width 0.2s' }} />
              </div>
            )}
            {checklist.map(item => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}
                onMouseEnter={() => setHoveredCheckItem(item.id)}
                onMouseLeave={() => setHoveredCheckItem(null)}
              >
                <input type="checkbox" checked={item.done} onChange={e => updateChecklistItem(item.id, { done: e.target.checked })} style={{ accentColor: '#6366f1', flexShrink: 0, cursor: 'pointer', width: 14, height: 14 }} />
                <input type="text" value={item.text} onChange={e => updateChecklistItem(item.id, { text: e.target.value })}
                  style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13, fontFamily: 'inherit', color: item.done ? '#9ca3af' : '#1a1a1a', textDecoration: item.done ? 'line-through' : 'none' }}
                />
                <button onClick={() => deleteChecklistItem(item.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', alignItems: 'center', padding: 2, opacity: hoveredCheckItem === item.id ? 1 : 0, transition: 'opacity 0.1s' }}
                ><X size={12} strokeWidth={2} /></button>
              </div>
            ))}
            <input type="text" value={newChecklistText} onChange={e => setNewChecklistText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addChecklistItem() }}
              onBlur={addChecklistItem}
              placeholder="+ Agregar ítem"
              style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, fontFamily: 'inherit', color: '#9ca3af', width: '100%', marginTop: 4 }}
              onFocus={e => e.target.style.color = '#1a1a1a'}
            />
          </div>

          <Divider />

          {/* Card color */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#8c8fa1', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>Color de tarjeta</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {CARD_COLORS.map(c => (
                <button key={c} onClick={() => onUpdate(card.id, { color: c })}
                  style={{ width: 22, height: 22, borderRadius: '50%', background: c, border: '1.5px solid #e8eaed', cursor: 'pointer', boxShadow: card.color === c ? '0 0 0 2px #fff, 0 0 0 4px #6366f1' : 'none', transition: 'box-shadow 0.1s' }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px solid #f1f3f4', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: '#9ca3af' }}>Creado el {createdDisplay}</span>
          <button
            onClick={() => { if (confirm('¿Eliminar esta tarjeta?')) { onDelete(card.id); onClose() } }}
            style={{ background: 'transparent', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 600, color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
            onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <Trash2 size={13} strokeWidth={2} /> Eliminar
          </button>
        </div>
      </div>
    </>
  )
}
