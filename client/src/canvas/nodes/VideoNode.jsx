import { Handle, Position } from '@xyflow/react'

const PLATFORM_COLORS = {
  YouTube: '#ef4444',
  Instagram: '#ec4899',
  TikTok: '#06b6d4',
}

const PLATFORM_ICONS = {
  YouTube: '▶',
  Instagram: '◈',
  TikTok: '♪',
}

const styles = {
  node: (color) => ({
    background: 'linear-gradient(135deg, rgba(10,10,20,0.98) 0%, rgba(15,15,30,0.98) 100%)',
    border: `1px solid ${color}59`,
    borderRadius: 14,
    padding: '14px 16px',
    minWidth: 240,
    maxWidth: 280,
    boxShadow: `0 0 20px ${color}18, 0 4px 24px rgba(0,0,0,0.6)`,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    color: '#e2e8f0',
    position: 'relative',
  }),
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  badge: (color) => ({
    background: `${color}2e`,
    border: `1px solid ${color}4d`,
    borderRadius: 6,
    padding: '2px 8px',
    fontSize: 10,
    fontWeight: 700,
    color: color,
    letterSpacing: '0.05em',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  }),
  title: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 6,
    fontWeight: 500,
    lineHeight: 1.4,
    wordBreak: 'break-word',
  },
  urlRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  url: {
    fontSize: 10,
    color: '#475569',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
  },
  link: (color) => ({
    fontSize: 10,
    color: color,
    textDecoration: 'none',
    opacity: 0.8,
    flexShrink: 0,
  }),
  handle: (color) => ({
    background: color,
    border: `2px solid ${color}80`,
    width: 10,
    height: 10,
    borderRadius: '50%',
  }),
  divider: {
    height: 1,
    background: 'rgba(255,255,255,0.05)',
    margin: '8px 0',
  },
}

export default function VideoNode({ data }) {
  const { url, platform, title } = data
  const color = PLATFORM_COLORS[platform] || '#64748b'
  const icon = PLATFORM_ICONS[platform] || '●'

  const truncatedUrl = url
    ? url.replace(/^https?:\/\//, '').substring(0, 36) + (url.length > 40 ? '…' : '')
    : ''

  return (
    <div style={styles.node(color)}>
      <div style={styles.header}>
        <span style={styles.badge(color)}>
          {icon} {platform}
        </span>
        <span style={{ fontSize: 9, color: '#334155', marginLeft: 'auto' }}>VIDEO</span>
      </div>

      {title && (
        <>
          <div style={styles.divider} />
          <div style={styles.title}>{title}</div>
        </>
      )}

      <div style={styles.divider} />

      <div style={styles.urlRow}>
        <span style={styles.url}>{truncatedUrl}</span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={styles.link(color)}
          onClick={(e) => e.stopPropagation()}
        >
          ↗ Abrir
        </a>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        style={styles.handle(color)}
      />
    </div>
  )
}
