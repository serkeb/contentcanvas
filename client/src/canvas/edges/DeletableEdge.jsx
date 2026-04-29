import { useState } from 'react'
import { BaseEdge, EdgeLabelRenderer, getBezierPath, useReactFlow } from '@xyflow/react'

export default function DeletableEdge({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition, style, markerEnd, selected,
}) {
  const { deleteElements } = useReactFlow()
  const [hovered, setHovered] = useState(false)

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition,
  })

  const active = hovered || selected

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: active ? '#94a3b8' : '#cbd5e1',
          strokeWidth: active ? 2 : 1.5,
          transition: 'stroke 0.15s, stroke-width 0.15s',
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />
      <EdgeLabelRenderer>
        {active && (
          <button
            onClick={() => deleteElements({ edges: [{ id }] })}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '50%',
              width: 20, height: 20,
              fontSize: 9, color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 1px 6px rgba(0,0,0,0.12)',
              lineHeight: 1,
            }}
            title="Desconectar"
          >
            ✕
          </button>
        )}
      </EdgeLabelRenderer>
    </>
  )
}
