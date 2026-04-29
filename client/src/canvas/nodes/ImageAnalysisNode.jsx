import { useState, useRef, useEffect, memo } from 'react'
import { Handle, Position, NodeToolbar, useReactFlow } from '@xyflow/react'
import { Sparkles, Trash2, ChevronDown, ChevronUp, Copy } from 'lucide-react'

function ImageAnalysisNode({ data, id, selected }) {
  const { deleteElements } = useReactFlow()
  const { image, state, analysis, error } = data
  const [showAnalysis, setShowAnalysis] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopyText = () => {
    if (analysis?.text) {
      navigator.clipboard.writeText(analysis.text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <>
      <NodeToolbar isVisible={selected} position="top" align="end" style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={() => deleteElements({ nodes: [{ id }] })}
          style={{
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6,
            color: '#ef4444', fontSize: 11, fontWeight: 600,
            cursor: 'pointer', padding: '4px 8px', fontFamily: 'system-ui',
            display: 'flex', alignItems: 'center', gap: 4,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          <Trash2 size={12} strokeWidth={2} />
        </button>
      </NodeToolbar>

      <div
        style={{
          position: 'relative',
          background: '#fff',
          border: selected ? '2px solid #8b5cf6' : '1px solid #e2e8f0',
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          overflow: 'hidden',
          cursor: 'grab',
        }}
      >
        {/* Image */}
        <img
          src={image}
          alt="Pasted"
          style={{
            display: 'block',
            maxWidth: 400,
            maxHeight: 300,
            width: 'auto',
            height: 'auto',
          }}
        />

        {/* Analysis Status Indicator */}
        {state === 'analyzing' && (
          <div style={{
            position: 'absolute',
            top: 8,
            right: 8,
            background: 'rgba(139, 92, 246, 0.95)',
            color: '#fff',
            borderRadius: 12,
            padding: '4px 10px',
            fontSize: 10,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}>
            <span style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              border: '2px solid #ffffff55',
              borderTopColor: '#fff',
              borderRadius: '50%',
              animation: 'spin 0.6s linear infinite',
            }} />
            Analizando...
          </div>
        )}

        {state === 'ready' && analysis && (
          <div style={{
            position: 'absolute',
            top: 8,
            right: 8,
            background: 'rgba(34, 197, 94, 0.95)',
            color: '#fff',
            borderRadius: 12,
            padding: '4px 8px',
            fontSize: 10,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            cursor: 'pointer',
          }}
          onClick={() => setShowAnalysis(!showAnalysis)}
          >
            <Sparkles size={12} strokeWidth={2} />
            {showAnalysis ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </div>
        )}

        {/* Analysis Panel (Dropdown) */}
        {showAnalysis && state === 'ready' && analysis && (
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'rgba(255, 255, 255, 0.98)',
            border: '1px solid #e2e8f0',
            borderRadius: '8px 8px 0 0',
            padding: '12px',
            fontFamily: 'system-ui',
            fontSize: 11,
            color: '#334155',
            maxHeight: 250,
            overflowY: 'auto',
            boxShadow: '0 -4px 12px rgba(0,0,0,0.1)',
          }}>
            {/* Description */}
            {analysis.description && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>
                  DESCRIPCIÓN
                </div>
                <div style={{ lineHeight: 1.5 }}>
                  {analysis.description}
                </div>
              </div>
            )}

            {/* Text */}
            {analysis.text && (
              <div style={{ marginBottom: 10 }}>
                <div style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#64748b',
                  marginBottom: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <span>TEXTO DETECTADO</span>
                  <button
                    onClick={handleCopyText}
                    style={{
                      background: '#f1f5f9',
                      border: '1px solid #e2e8f0',
                      borderRadius: 4,
                      padding: '2px 6px',
                      fontSize: 9,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 3,
                    }}
                  >
                    <Copy size={10} strokeWidth={2} />
                    {copied ? '✓ Copiado' : 'Copiar'}
                  </button>
                </div>
                <div style={{
                  background: '#f8fafc',
                  padding: '8px',
                  borderRadius: 4,
                  border: '1px solid #e2e8f0',
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.5,
                  fontSize: 10,
                }}>
                  {analysis.text}
                </div>
              </div>
            )}

            {/* Details */}
            {analysis.details && analysis.details.length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>
                  DETALLES
                </div>
                <div style={{ lineHeight: 1.5 }}>
                  {analysis.details.join(' • ')}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error State */}
        {state === 'error' && (
          <div style={{
            position: 'absolute',
            top: 8,
            right: 8,
            background: 'rgba(239, 68, 68, 0.95)',
            color: '#fff',
            borderRadius: 12,
            padding: '4px 8px',
            fontSize: 10,
            fontWeight: 600,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}>
            ✕ Error
          </div>
        )}

        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>

        <Handle type="source" position={Position.Right} style={{
          background: '#8b5cf6', border: '2px solid #8b5cf660',
          width: 8, height: 8, borderRadius: '50%',
        }} />

        <Handle type="target" position={Position.Left} style={{
          background: '#64748b', border: '2px solid #64748b60',
          width: 8, height: 8, borderRadius: '50%',
        }} />
      </div>
    </>
  )
}

const MemoizedImageAnalysisNode = memo(ImageAnalysisNode, (prevProps, nextProps) => {
  return (
    prevProps.id === nextProps.id &&
    prevProps.selected === nextProps.selected &&
    prevProps.data.image === nextProps.data.image &&
    prevProps.data.state === nextProps.data.state &&
    prevProps.data.analysis === nextProps.data.analysis
  )
})

MemoizedImageAnalysisNode.displayName = 'ImageAnalysisNode'

export default MemoizedImageAnalysisNode
