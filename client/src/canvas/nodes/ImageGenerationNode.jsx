import { useState, useRef, useEffect, memo } from 'react'
import { Handle, Position, NodeToolbar, useReactFlow, useNodes, useEdges } from '@xyflow/react'
import { Sparkles, Trash2, Wand2, Image as ImageIcon, Settings, ChevronDown, ChevronUp } from 'lucide-react'

const MODELS = [
  { id: 'dall-e-2', name: 'DALL-E 2', provider: 'openai', icon: '🎨' },
  { id: 'gpt-image-2-2026-04-21', name: 'GPT Image 2', provider: 'openai', icon: '🖼️' },
  { id: 'nano-banana', name: 'Nano Banana', provider: 'nano_banana', icon: '🍌' },
]

const SIZES = [
  { id: '256x256', label: '256×256', desc: 'Rápido' },
  { id: '512x512', label: '512×512', desc: 'Balanceado' },
  { id: '1024x1024', label: '1024×1024', desc: 'HD' },
  { id: '1792x1024', label: '1792×1024', desc: 'Wide' },
  { id: '1024x1792', label: '1024×1792', desc: 'Tall' },
]

function ImageGenerationNode({ data, id, selected }) {
  const { deleteElements } = useReactFlow()
  const nodes = useNodes()
  const edges = useEdges()

  const [prompt, setPrompt] = useState(data.prompt || '')
  const [model, setModel] = useState(data.model || 'dall-e-2')
  const [count, setCount] = useState(data.count || 1)
  const [size, setSize] = useState(data.size || '1024x1024')
  const [state, setState] = useState(data.state || 'idle')
  const [generatedImages, setGeneratedImages] = useState(data.generatedImages || [])
  const [error, setError] = useState(data.error || null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const promptRef = useRef(null)

  // Collect text and images from ACTUALLY connected nodes (via edges)
  const getConnectedContent = () => {
    // Find all edges that point to this node
    const incomingEdges = edges.filter(e => e.target === id)

    // Get the source node IDs
    const sourceNodeIds = incomingEdges.map(e => e.source)

    // Separate text nodes and image nodes
    const textNodes = nodes.filter(n =>
      sourceNodeIds.includes(n.id) &&
      (n.type === 'videoTranscriptNode' ||
       n.type === 'documentNode' ||
       n.type === 'textNode' ||
       n.type === 'llmNode')
    )

    const imageNodes = nodes.filter(n =>
      sourceNodeIds.includes(n.id) &&
      n.type === 'imageAnalysisNode' &&
      n.data.image // Has actual image data
    )

    // Collect text
    const textParts = []
    textNodes.forEach(n => {
      if (n.data.transcript) {
        textParts.push(`[${n.type}]: ${n.data.transcript.substring(0, 500)}`)
      } else if (n.data.text) {
        textParts.push(`[${n.type}]: ${n.data.text.substring(0, 500)}`)
      } else if (n.data.result) {
        textParts.push(`[${n.type}]: ${n.data.result.substring(0, 500)}`)
      }
    })

    // Collect images (base64)
    const referenceImages = imageNodes.map(n => n.data.image)

    return {
      text: textParts.join('\n\n'),
      images: referenceImages
    }
  }

  const connectedContent = getConnectedContent()
  const connectedTextCount = edges.filter(e => e.target === id && nodes.find(n => n.id === e.source && (
    n.type === 'videoTranscriptNode' ||
    n.type === 'documentNode' ||
    n.type === 'textNode' ||
    n.type === 'llmNode'
  ))).length

  const connectedImageCount = edges.filter(e => e.target === id && nodes.find(n => n.id === e.source && (
    n.type === 'imageAnalysisNode' && n.data.image
  ))).length

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Por favor escribí un prompt')
      return
    }

    setState('generating')
    setError(null)

    try {
      // Import api function dynamically
      const { generateImage } = await import('../utils/api')

      const result = await generateImage({
        prompt,
        model,
        count,
        size,
        text_context: connectedContent.text,
        reference_images: connectedContent.images,
      })

      // Create new image nodes for each generated image
      const newNodes = []

      result.images.forEach((img, index) => {
        const nodeId = `image-generated-${Date.now()}-${index}`
        const offsetX = (index % 2) * 350
        const offsetY = Math.floor(index / 2) * 320

        newNodes.push({
          id: nodeId,
          type: 'imageAnalysisNode',
          position: {
            x: parseFloat(data.position?.x || 0) + 420 + offsetX,
            y: parseFloat(data.position?.y || 0) + offsetY
          },
          data: {
            image: img.b64_json || img.url,
            state: 'ready',
            analysis: {
              description: `Imagen generada con ${model}`,
              text: img.revised_prompt || prompt,
              details: [`Modelo: ${model}`, `Tamaño: ${size}`, `Prompt: ${prompt.substring(0, 50)}...`]
            },
            error: null,
            generated: true,
            sourceNodeId: id
          }
        })
      })

      // Add edges connecting generator to generated images
      const newEdges = newNodes.map(node => ({
        id: `e-${id}-${node.id}`,
        source: id,
        target: node.id,
        type: 'deletable',
        style: { stroke: '#8b5cf6', strokeWidth: 2 },
        markerEnd: { type: 'arrowclosed', color: '#8b5cf6' }
      }))

      setState('complete')
      setGeneratedImages(result.images)

      // Dispatch event to add nodes and edges
      window.dispatchEvent(new CustomEvent('add-generated-nodes', {
        detail: { nodes: newNodes, edges: newEdges }
      }))

    } catch (err) {
      setState('error')
      setError(err.message || 'Error al generar imágenes')
    }
  }

  const currentModel = MODELS.find(m => m.id === model) || MODELS[0]

  return (
    <>
      <NodeToolbar isVisible={selected} position="top" align="end" style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={() => deleteElements({ nodes: [{ id }] })}
          style={{
            background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7,
            color: '#dc2626', fontSize: 10, fontWeight: 600,
            cursor: 'pointer', padding: '4px 10px', fontFamily: 'system-ui',
            display: 'flex', alignItems: 'center', gap: 4,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          <Trash2 size={12} strokeWidth={2} /> Eliminar
        </button>
      </NodeToolbar>

      <div
        style={{
          background: '#ffffff',
          border: selected ? '2px solid #8b5cf6' : '1px solid #e2e8f0',
          borderRadius: 12,
          minWidth: 380,
          maxWidth: 400,
          boxShadow: selected ? '0 4px 20px rgba(139, 92, 246, 0.15)' : '0 2px 12px rgba(0,0,0,0.08)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          color: '#0f172a',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{
              background: '#8b5cf615', border: '1px solid #8b5cf630',
              borderRadius: 8, padding: '4px 10px',
              fontSize: 11, fontWeight: 700, color: '#8b5cf6',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <Wand2 size={14} strokeWidth={2} />
              Generador de Imágenes
            </span>
            {state === 'generating' && (
              <span style={{ fontSize: 9, color: '#8b5cf6', marginLeft: 'auto' }}>
                Generando...
              </span>
            )}
            {state === 'complete' && (
              <span style={{ fontSize: 9, color: '#22c55e', marginLeft: 'auto' }}>
                ✓ Completado
              </span>
            )}
          </div>

          {/* Model Selector */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {MODELS.map(m => (
              <button
                key={m.id}
                onClick={() => setModel(m.id)}
                style={{
                  background: model === m.id ? '#8b5cf615' : '#f8fafc',
                  border: model === m.id ? '1px solid #8b5cf640' : '1px solid #e2e8f0',
                  borderRadius: 6,
                  padding: '4px 8px',
                  fontSize: 10,
                  fontWeight: 600,
                  color: model === m.id ? '#8b5cf6' : '#64748b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  if (model !== m.id) e.target.style.borderColor = '#cbd5e1'
                }}
                onMouseLeave={(e) => {
                  e.target.style.borderColor = model === m.id ? '#8b5cf640' : '#e2e8f0'
                }}
              >
                <span>{m.icon}</span>
                {m.name}
              </button>
            ))}
          </div>
        </div>

        {/* Prompt Input */}
        <div style={{ padding: '12px 14px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
            ¿Qué querés generar?
          </div>
          <textarea
            ref={promptRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ej: Un gato astronauta flotando en el espacio con neón..."
            style={{
              width: '100%',
              minHeight: 80,
              padding: '10px',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              fontSize: 11,
              fontFamily: 'system-ui',
              color: '#334155',
              resize: 'vertical',
              outline: 'none',
              transition: 'border-color 0.15s',
            }}
            onFocus={(e) => e.target.style.borderColor = '#8b5cf6'}
            onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
          />

          {/* Connected nodes indicator */}
          {(connectedTextCount > 0 || connectedImageCount > 0) && (
            <div style={{
              marginTop: 8,
              display: 'flex',
              gap: 6,
              flexWrap: 'wrap',
            }}>
              {connectedTextCount > 0 && (
                <div style={{
                  padding: '6px 8px',
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 6,
                  fontSize: 9,
                  color: '#166534',
                }}>
                  📄 {connectedTextCount} nodo{connectedTextCount > 1 ? 's' : ''} con texto
                </div>
              )}
              {connectedImageCount > 0 && (
                <div style={{
                  padding: '6px 8px',
                  background: '#fef3c7',
                  border: '1px solid #fde68a',
                  borderRadius: 6,
                  fontSize: 9,
                  color: '#92400e',
                }}>
                  🖼️ {connectedImageCount} imagen{connectedImageCount > 1 ? 'es' : ''} de referencia
                </div>
              )}
            </div>
          )}
        </div>

        {/* Advanced Options */}
        <div style={{ padding: '0 14px' }}>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            style={{
              width: '100%',
              background: 'none',
              border: 'none',
              padding: '6px 0',
              fontSize: 10,
              fontWeight: 600,
              color: '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Settings size={12} strokeWidth={2} />
            Opciones avanzadas
            {showAdvanced ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          {showAdvanced && (
            <div style={{
              padding: '10px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              marginTop: 6,
            }}>
              {/* Count selector */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>
                  Cantidad de imágenes
                </div>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      onClick={() => setCount(n)}
                      style={{
                        background: count === n ? '#8b5cf6' : '#fff',
                        border: count === n ? '1px solid #8b5cf6' : '1px solid #e2e8f0',
                        borderRadius: 6,
                        width: 32,
                        height: 28,
                        fontSize: 11,
                        fontWeight: 600,
                        color: count === n ? '#fff' : '#64748b',
                        cursor: 'pointer',
                      }}
                    >
                      {n}
                    </button>
                  ))}
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={count}
                    onChange={(e) => setCount(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                    style={{
                      width: 40,
                      height: 28,
                      padding: '0 6px',
                      border: '1px solid #e2e8f0',
                      borderRadius: 6,
                      fontSize: 11,
                      textAlign: 'center',
                    }}
                  />
                </div>
              </div>

              {/* Size selector */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>
                  Resolución
                </div>
                <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                  {SIZES.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setSize(s.id)}
                      style={{
                        background: size === s.id ? '#8b5cf6' : '#fff',
                        border: size === s.id ? '1px solid #8b5cf6' : '1px solid #e2e8f0',
                        borderRadius: 6,
                        padding: '4px 8px',
                        fontSize: 9,
                        fontWeight: 600,
                        color: size === s.id ? '#fff' : '#64748b',
                        cursor: 'pointer',
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Generate Button */}
        <div style={{ padding: '12px 14px 14px' }}>
          <button
            onClick={handleGenerate}
            disabled={state === 'generating' || !prompt.trim()}
            style={{
              width: '100%',
              padding: '10px',
              background: state === 'generating' ? '#e2e8f0' : '#8b5cf6',
              border: state === 'generating' ? '1px solid #cbd5e1' : '1px solid #8b5cf6',
              borderRadius: 8,
              color: state === 'generating' ? '#94a3b8' : '#fff',
              fontSize: 11,
              fontWeight: 700,
              cursor: state === 'generating' ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              opacity: state === 'generating' || !prompt.trim() ? 0.6 : 1,
              transition: 'all 0.15s',
            }}
          >
            {state === 'generating' ? (
              <>
                <span style={{
                  display: 'inline-block',
                  width: 12,
                  height: 12,
                  border: '2px solid #ffffff40',
                  borderTopColor: '#fff',
                  borderRadius: '50%',
                  animation: 'spin 0.6s linear infinite',
                }} />
                Generando...
              </>
            ) : (
              <>
                <Sparkles size={14} strokeWidth={2} />
                Generar {count} imagen{count > 1 ? 'es' : ''}
              </>
            )}
          </button>

          {/* Error state */}
          {state === 'error' && (
            <div style={{
              marginTop: 10,
              padding: '8px 10px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 6,
              fontSize: 10,
              color: '#dc2626',
            }}>
              {error}
            </div>
          )}

          {/* Success state */}
          {state === 'complete' && generatedImages.length > 0 && (
            <div style={{
              marginTop: 10,
              padding: '8px 10px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 6,
              fontSize: 10,
              color: '#166534',
            }}>
              ✓ {generatedImages.length} imagen{generatedImages.length > 1 ? 'es' : ''} generada{generatedImages.length > 1 ? 's' : ''}
            </div>
          )}
        </div>

        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>

        <Handle type="target" position={Position.Left} style={{
          background: '#8b5cf6', border: '2px solid #8b5cf660',
          width: 10, height: 10, borderRadius: '50%',
        }} />

        <Handle type="source" position={Position.Right} style={{
          background: '#8b5cf6', border: '2px solid #8b5cf660',
          width: 10, height: 10, borderRadius: '50%',
        }} />
      </div>
    </>
  )
}

const MemoizedImageGenerationNode = memo(ImageGenerationNode, (prevProps, nextProps) => {
  return (
    prevProps.id === nextProps.id &&
    prevProps.selected === nextProps.selected &&
    prevProps.data.prompt === nextProps.data.prompt &&
    prevProps.data.model === nextProps.data.model &&
    prevProps.data.state === nextProps.data.state
  )
})

MemoizedImageGenerationNode.displayName = 'ImageGenerationNode'

export default MemoizedImageGenerationNode