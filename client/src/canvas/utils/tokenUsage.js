/**
 * tokenUsage.js — Daily AI usage tracker stored in localStorage.
 *
 * Tracks two types of calls:
 *  - LLM (text generation): prompt_tokens + completion_tokens → cost from models.js catalog
 *  - Whisper (transcription): audio_seconds → $0.006 per minute
 *
 * Key format: `token-usage-YYYY-MM-DD`
 */

import { calcModelCost } from './models'

const PREFIX = 'token-usage-'

// Whisper: $0.006 per minute (billed per second)
const WHISPER_PRICE_PER_MIN = 0.006

export function calcLLMCost(model, promptTokens, completionTokens) {
  return calcModelCost(model, promptTokens, completionTokens)
}

export function calcWhisperCost(audioSeconds) {
  if (!audioSeconds) return 0
  return (audioSeconds / 60) * WHISPER_PRICE_PER_MIN
}

// Keep old export name for backward compat
export const calcCost = calcLLMCost

function todayKey() {
  return PREFIX + new Date().toISOString().slice(0, 10)
}

function readDay(key) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function writeDay(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch {}
}

function emptyDay(dateStr) {
  return {
    date: dateStr,
    calls: [],
    totals: {
      prompt_tokens:     0,
      completion_tokens: 0,
      total_tokens:      0,
      audio_seconds:     0,
      cost_usd:          0,
    },
  }
}

/**
 * Record one LLM call.
 * usage = { model, prompt_tokens, completion_tokens, total_tokens }
 */
export function recordUsage(usage) {
  if (!usage) return

  // Route to correct recorder by model
  if (usage.model === 'whisper-1') {
    recordWhisperUsage(usage)
    return
  }

  if (!usage.total_tokens) return

  const key = todayKey()
  const day = readDay(key) || emptyDay(key.replace(PREFIX, ''))
  const cost = calcLLMCost(usage.model, usage.prompt_tokens, usage.completion_tokens)

  day.calls.push({
    ts:                new Date().toISOString(),
    type:              'llm',
    model:             usage.model,
    prompt_tokens:     usage.prompt_tokens,
    completion_tokens: usage.completion_tokens,
    total_tokens:      usage.total_tokens,
    cost_usd:          cost,
  })

  day.totals.prompt_tokens     += usage.prompt_tokens
  day.totals.completion_tokens += usage.completion_tokens
  day.totals.total_tokens      += usage.total_tokens
  day.totals.cost_usd          += cost

  writeDay(key, day)
}

/**
 * Record one Whisper transcription.
 * usage = { model: 'whisper-1', audio_seconds: number }
 */
export function recordWhisperUsage(usage) {
  if (!usage || !usage.audio_seconds) return

  const key  = todayKey()
  const day  = readDay(key) || emptyDay(key.replace(PREFIX, ''))
  const cost = calcWhisperCost(usage.audio_seconds)

  day.calls.push({
    ts:            new Date().toISOString(),
    type:          'whisper',
    model:         'whisper-1',
    audio_seconds: usage.audio_seconds,
    cost_usd:      cost,
  })

  day.totals.audio_seconds += usage.audio_seconds
  day.totals.cost_usd      += cost

  writeDay(key, day)
}

export function getTodayUsage() {
  return readDay(todayKey())
}

export function getRecentUsage(days = 7) {
  const result = []
  for (let i = 0; i < days; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key  = PREFIX + d.toISOString().slice(0, 10)
    const data = readDay(key)
    if (data) result.push(data)
  }
  return result
}

export function clearAllUsage() {
  Object.keys(localStorage)
    .filter(k => k.startsWith(PREFIX))
    .forEach(k => localStorage.removeItem(k))
}
