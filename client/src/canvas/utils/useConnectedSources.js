import { useMemo } from 'react'
import { useStore, useReactFlow } from '@xyflow/react'
import { getConnectedSources } from './getConnectedSources'

/**
 * Reactive version of getConnectedSources.
 * Re-runs only when edges TO this node change, or when the state/data
 * of connected source nodes changes — NOT on every position drag.
 */
export function useConnectedSources(nodeId) {
  const { getNodes, getEdges } = useReactFlow()

  // Build a stable fingerprint from only the data we care about.
  // Changes when: edges connect/disconnect, or source node state/content changes.
  const fingerprint = useStore(s => {
    const inEdges = s.edges.filter(e => e.target === nodeId)
    return inEdges
      .map(e => {
        const n = s.nodes.find(n => n.id === e.source)
        if (!n) return e.id
        const d = n.data || {}
        return [
          e.id,
          n.type,
          d.state ?? '',
          d.transcript ? '1' : '',
          d.html       ? '1' : '',
          d.text       ? '1' : '',
          d.summary    ? '1' : '',
          d.brandVoice ? '1' : '',
          d.documents  ? (d.documents || []).length.toString() : '0',
          // For profileAnalysisNode: number of ready videos
          n.type === 'profileAnalysisNode'
            ? (d.videoItems || []).filter(v => v.state === 'listo').length
            : '',
          // For storyFlowOutputNode: number of stories
          n.type === 'storyFlowOutputNode'
            ? (d.stories || []).length.toString()
            : '',
        ].join(':')
      })
      .sort()
      .join('|')
  })

  return useMemo(
    () => getConnectedSources(nodeId, getNodes, getEdges),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nodeId, fingerprint]
    // getNodes/getEdges are stable refs but always return current store data when called
  )
}
