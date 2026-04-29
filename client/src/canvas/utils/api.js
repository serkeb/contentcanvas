import { recordUsage } from './tokenUsage'
import { loadApiKeys } from './storage'
import { supportsReasoning } from './models'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

async function parseResponse(res, fallbackMsg) {
  const text = await res.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error(
      'El backend no está respondiendo en localhost:5000. ' +
      'Corré: python3 server.py'
    )
  }
  if (!res.ok) throw new Error(data.error || fallbackMsg)
  return data
}

export async function transcribeUrl(url) {
  let res
  try {
    res = await fetch(`${BASE_URL}/transcribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    })
  } catch {
    throw new Error('No se pudo conectar con el backend en localhost:5000. Corré: python3 server.py')
  }
  const data = await parseResponse(res, 'Error al transcribir')
  if (data.usage) recordUsage(data.usage)
  return data
}

export async function analyzeTranscript(transcript, platform) {
  let res
  try {
    res = await fetch(`${BASE_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript, platform })
    })
  } catch {
    throw new Error('No se pudo conectar con el backend en localhost:5000. Corré: python3 server.py')
  }
  return parseResponse(res, 'Error al analizar')
}

export async function runLLM(messages, transcripts, model, documents = [], reasoningLevel = null, customPrompt = null) {
  const api_keys = loadApiKeys()
  let res
  try {
    const body = { messages, transcripts, model, documents, api_keys }
    if (reasoningLevel && supportsReasoning(model)) {
      body.reasoning = { effort: reasoningLevel }
    }
    if (customPrompt && customPrompt.trim().length > 0) {
      body.system_prompt = customPrompt.trim()
    }
    res = await fetch(`${BASE_URL}/llm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
  } catch {
    throw new Error('No se pudo conectar con el backend en localhost:5000. Corré: python3 server.py')
  }
  const data = await parseResponse(res, 'Error al procesar')
  if (data.usage) recordUsage(data.usage)
  return data
}

export async function extractDocumentFile(file) {
  const formData = new FormData()
  formData.append('file', file)
  let res
  try {
    res = await fetch(`${BASE_URL}/extract-doc`, { method: 'POST', body: formData })
  } catch {
    throw new Error('No se pudo conectar con el backend en localhost:5000. Corré: python3 server.py')
  }
  return parseResponse(res, 'Error al extraer el documento')
}

export async function extractGoogleDoc(url) {
  let res
  try {
    res = await fetch(`${BASE_URL}/extract-doc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
  } catch {
    throw new Error('No se pudo conectar con el backend en localhost:5000. Corré: python3 server.py')
  }
  return parseResponse(res, 'Error al obtener el documento')
}

export function isGoogleDocsUrl(url) {
  return /docs\.google\.com\/document\/d\//.test(url)
}

export async function checkHealth() {
  try {
    const res = await fetch(`${BASE_URL}/health`, { signal: AbortSignal.timeout(3000) })
    if (!res.ok) return { ok: false }
    const data = await res.json()
    return { ok: true, ...data }
  } catch {
    return { ok: false }
  }
}

export function detectPlatform(url) {
  if (/youtube\.com|youtu\.be/.test(url)) return 'YouTube'
  if (/instagram\.com/.test(url)) return 'Instagram'
  if (/tiktok\.com/.test(url)) return 'TikTok'
  return null
}

export function isVideoUrl(url) {
  return detectPlatform(url) !== null
}

export async function scrapeProfile(platform, username, amount = 10, sortBy = 'recent', igUser = '', igPass = '') {
  let res
  try {
    res = await fetch(`${BASE_URL}/scrape-profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform, username, amount, sort_by: sortBy, ig_user: igUser, ig_pass: igPass })
    })
  } catch {
    throw new Error('No se pudo conectar con el backend en localhost:5000. Corré: python3 server.py')
  }
  return parseResponse(res, 'Error al scrapear el perfil')
}

export async function analyzeProfile(platform, username, amount = 10) {
  let res
  try {
    res = await fetch(`${BASE_URL}/analyze-profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform, username, amount })
    })
  } catch {
    throw new Error('No se pudo conectar con el backend en localhost:5000. Corré: python3 server.py')
  }
  return parseResponse(res, 'Error al analizar el perfil')
}

// Paths that are NOT user profiles on Instagram
const INSTAGRAM_NON_PROFILE = /instagram\.com\/(p|reel|tv|stories|explore|accounts|direct|ar|challenges|hashtag|shoppingbag)\//

export function isProfileUrl(url) {
  // TikTok: https://www.tiktok.com/@username — but NOT video URLs like @user/video/123
  if (/tiktok\.com\/@[\w.-]+/.test(url) && !/tiktok\.com\/@[\w.-]+\/video\//.test(url)) return 'tiktok'

  // Instagram profile: instagram.com/username — but not posts, reels, explore, etc.
  if (/instagram\.com\/[\w.-]+/.test(url) && !INSTAGRAM_NON_PROFILE.test(url)) return 'instagram'

  return null
}

export function extractUsernameFromProfile(url) {
  // TikTok
  const tiktokMatch = url.match(/tiktok\.com\/@([\w.-]+)/)
  if (tiktokMatch) return tiktokMatch[1]

  // Instagram — grab the first path segment (the username)
  const instaMatch = url.match(/instagram\.com\/([\w.-]+)/)
  if (instaMatch) return instaMatch[1]

  // Raw username with or without @
  if (url.startsWith('@')) return url.slice(1)

  return url
}

export async function generateScriptWithKnowledge(config) {
  let res
  try {
    res = await fetch(`${BASE_URL}/script-with-knowledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    })
  } catch {
    throw new Error('No se pudo conectar con el backend en localhost:5000. Corré: python3 server.py')
  }
  return parseResponse(res, 'Error al generar guión con conocimiento')
}

export async function analyzeImage(imageBase64, fileName) {
  const api_keys = loadApiKeys()
  let res
  try {
    res = await fetch(`${BASE_URL}/analyze-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageBase64, filename: fileName, api_keys })
    })
  } catch {
    throw new Error('No se pudo conectar con el backend en localhost:5000. Corré: python3 server.py')
  }
  const data = await parseResponse(res, 'Error al analizar la imagen')
  if (data.usage) recordUsage(data.usage)
  return data
}

export async function generateImage({ prompt, model, count, size, text_context, reference_images }) {
  const api_keys = loadApiKeys()
  let res
  try {
    res = await fetch(`${BASE_URL}/generate-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        model,
        count,
        size,
        text_context,
        reference_images,
        api_keys
      })
    })
  } catch {
    throw new Error('No se pudo conectar con el backend en localhost:5000. Corré: python3 server.py')
  }
  const data = await parseResponse(res, 'Error al generar imagen')
  if (data.usage) recordUsage(data.usage)
  return data
}
