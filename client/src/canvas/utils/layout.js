/**
 * Auto-arrange compact video nodes that are children of a group.
 * Returns a new nodes array with updated positions.
 */
export function layoutGroupChildren(nodes, groupId) {
  const COMPACT_W = 220
  const COMPACT_H = 84   // collapsed compact card height (approx)
  const GAP_X = 8
  const GAP_Y = 8
  const PAD = 8
  const HEADER_H = 130   // header row 1 + summarize row (variable, use safe estimate)

  const group = nodes.find(n => n.id === groupId)
  if (!group) return nodes

  const groupW = group.style?.width || 500
  const availableW = groupW - PAD * 2
  const cols = Math.max(1, Math.floor((availableW + GAP_X) / (COMPACT_W + GAP_X)))

  const children = nodes.filter(
    n => n.type === 'videoTranscriptNode' && n.parentId === groupId
  )

  return nodes.map(n => {
    if (n.type !== 'videoTranscriptNode' || n.parentId !== groupId) return n
    const idx = children.findIndex(c => c.id === n.id)
    if (idx < 0) return n
    const col = idx % cols
    const row = Math.floor(idx / cols)
    return {
      ...n,
      position: {
        x: PAD + col * (COMPACT_W + GAP_X),
        y: HEADER_H + row * (COMPACT_H + GAP_Y),
      },
    }
  })
}

/**
 * Calculate the optimal size for a group based on its children.
 * Returns { width, height } or null if group not found.
 */
export function calculateGroupSize(nodes, groupId) {
  const COMPACT_W = 220
  const COMPACT_H = 84
  const GAP_X = 8
  const GAP_Y = 8
  const PAD = 8
  const HEADER_H = 130
  const MIN_WIDTH = 500
  const MIN_HEIGHT = 250

  const group = nodes.find(n => n.id === groupId)
  if (!group) return null

  const children = nodes.filter(
    n => n.type === 'videoTranscriptNode' && n.parentId === groupId
  )

  if (children.length === 0) {
    return { width: MIN_WIDTH, height: MIN_HEIGHT }
  }

  // Calculate columns based on content
  const cols = Math.max(2, Math.ceil(Math.sqrt(children.length)))
  const rows = Math.ceil(children.length / cols)

  const width = Math.max(MIN_WIDTH, PAD * 2 + cols * (COMPACT_W + GAP_X) - GAP_X)
  const height = Math.max(MIN_HEIGHT, HEADER_H + PAD + rows * (COMPACT_H + GAP_Y))

  return { width, height }
}
