/**
 * getConnectedSources — shared utility for ScriptNode, IdeasNode, RepurposingNode.
 * Walks edges into a node and returns:
 *   { transcripts: [...], documents: [...], brandVoice: object|null, personName: string|null }
 */
export function getConnectedSources(nodeId, getNodes, getEdges) {
  const allNodes = getNodes()
  const allEdges = getEdges()
  const transcripts = []
  const documents = []
  let brandVoice = null
  let personName = null

  allEdges
    .filter(e => e.target === nodeId)
    .forEach(e => {
      const src = allNodes.find(n => n.id === e.source)
      if (!src) return

      // BrandVoiceNode — extract as brandVoice context
      if (src.type === 'brandVoiceNode' && src.data.state === 'ready') {
        brandVoice = src.data.brandVoice || null
        personName = src.data.personName || null
        return
      }

      // ProfileAnalysisNode — use video transcripts
      if (src.type === 'profileAnalysisNode') {
        const platform = (src.data.platform || '').toUpperCase()
        const username = src.data.username || ''
        ;(src.data.videoItems || [])
          .filter(v => v.state === 'listo' && v.transcript)
          .forEach(v => transcripts.push({
            url: v.url || '',
            platform,
            transcript: v.transcript,
            title: v.title || v.url || `Video de @${username}`,
            collection: `@${username}`,
          }))
        return
      }

      // VideoTranscriptNode
      if (src.type === 'videoTranscriptNode' && src.data.state === 'listo') {
        transcripts.push({
          url: src.data.url || '',
          platform: src.data.platform || '',
          transcript: src.data.transcript || '',
          title: src.data.title || src.data.url || '',
          collection: null,
        })
        return
      }

      // GroupNode
      if (src.type === 'groupNode') {
        const collectionName = src.data.title || 'Colección'
        if (e.sourceHandle === 'summary' && src.data.summary) {
          transcripts.push({
            url: '', platform: 'RESUMEN',
            transcript: src.data.summary,
            title: `Resumen: ${collectionName}`,
            collection: collectionName,
          })
        } else {
          allNodes
            .filter(n => n.type === 'videoTranscriptNode' &&
              (n.parentId === src.id || n.data.groupId === src.id) &&
              n.data.state === 'listo')
            .forEach(n => transcripts.push({
              url: n.data.url || '',
              platform: n.data.platform || '',
              transcript: n.data.transcript || '',
              title: n.data.title || '',
              collection: collectionName,
            }))
        }
        return
      }

      // DocumentNode
      if (src.type === 'documentNode' && src.data.state === 'listo') {
        const docData = {
          url: src.data.url || '',
          platform: (src.data.type || 'DOC').toUpperCase(),
          transcript: src.data.text || '',
          title: src.data.name || 'Documento',
          collection: null,
        }
        transcripts.push(docData)
        // Also add to documents for knowledge (PDFs, TXT, MD)
        if (src.data.type === 'pdf' || src.data.type === 'txt' || src.data.type === 'md') {
          documents.push({
            name: src.data.name || 'Documento',
            text: src.data.text || '',
            type: src.data.type || 'doc',
          })
        }
        return
      }

      // TextNode
      if (src.type === 'textNode' && src.data.html?.trim()) {
        const div = document.createElement('div')
        div.innerHTML = src.data.html
        const text = div.textContent || ''
        if (text.trim()) {
          transcripts.push({ url: '', platform: 'TEXTO', transcript: text, title: 'Nota de texto', collection: null })
        }
        return
      }

      // ScriptOutputNode — standalone output node
      if (src.type === 'scriptOutputNode' && src.data.script) {
        transcripts.push({
          url: '', platform: 'SCRIPT',
          transcript: src.data.script,
          title: `Guión: ${src.data.topic || 'Sin título'}`,
          collection: null,
        })
        return
      }

      // RepurposingOutputNode — repurposed content
      if (src.type === 'repurposingOutputNode' && src.data.content) {
        const formatLabels = {
          captionIG: 'Caption Instagram',
          hiloX: 'Hilo X/Twitter',
          email: 'Email',
          carruselOutline: 'Carrusel',
          shortClipIdea: 'Idea de Clip',
          linkedinPost: 'Post LinkedIn',
        }
        transcripts.push({
          url: '', platform: 'REPURPOSE',
          transcript: src.data.content,
          title: `${formatLabels[src.data.format] || src.data.format}: ${src.data.sourceTitle || 'Contenido'}`,
          collection: null,
        })
        return
      }

      // StoryFlowOutputNode — story sequence as context
      if (src.type === 'storyFlowOutputNode' && (src.data.stories || []).length > 0) {
        const lines = [`Story Flow (${src.data.stories.length} historias):`]
        src.data.stories.forEach(s => {
          lines.push(`Historia ${s.story_number} [${s.story_role}]: ${s.on_screen_text || ''} ${s.spoken_line || ''}`.trim())
          if (s.cta) lines.push(`CTA: ${s.cta}`)
        })
        if (src.data.sequenceLogic) lines.push(`Lógica: ${src.data.sequenceLogic}`)
        transcripts.push({
          url: '', platform: 'STORIES',
          transcript: lines.join('\n'),
          title: `Story Flow: ${src.data.topic || src.data.objective || 'Sin título'}`,
          collection: null,
        })
        return
      }
    })

  return { transcripts, documents, brandVoice, personName }
}
