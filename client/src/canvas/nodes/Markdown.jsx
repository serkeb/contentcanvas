/**
 * Markdown.jsx — renders markdown with clean styles.
 * Font size is controlled per-instance via CSS custom properties,
 * so all heading/text sizes scale proportionally (they use `em` units).
 */
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// Shared CSS injected once — uses CSS variables set per-instance on the wrapper div
const SHARED_CSS = `
  .md-body {
    font-family: system-ui, -apple-system, sans-serif;
    font-size: var(--md-fs, 13px);
    line-height: var(--md-lh, 1.7);
    color: var(--md-color, #1e293b);
    user-select: text;
    cursor: text;
  }
  .md-body h1 { font-size: 1.45em; font-weight: 800; margin: .9em 0 .35em; color: #0f172a; line-height: 1.25; border-bottom: 1.5px solid #e2e8f0; padding-bottom: .25em; }
  .md-body h2 { font-size: 1.18em; font-weight: 700; margin: .8em 0 .3em; color: #1e293b; }
  .md-body h3 { font-size: 1.04em; font-weight: 700; margin: .7em 0 .25em; color: #334155; }
  .md-body h4 { font-size: .95em; font-weight: 600; margin: .6em 0 .2em; color: #475569; }
  .md-body h1:first-child, .md-body h2:first-child, .md-body h3:first-child { margin-top: 0; }
  .md-body p { margin: 0 0 .6em; }
  .md-body p:last-child { margin-bottom: 0; }
  .md-body strong { font-weight: 700; color: #0f172a; }
  .md-body em { font-style: italic; color: #334155; }
  .md-body del { text-decoration: line-through; color: #94a3b8; }
  .md-body ul, .md-body ol { margin: .25em 0 .6em 1.25em; padding: 0; }
  .md-body li { margin: .15em 0; }
  .md-body li > p { margin: 0; }
  .md-body ul { list-style: disc; }
  .md-body ol { list-style: decimal; }
  .md-body ul ul { list-style: circle; margin: .1em 0 .1em 1.1em; }
  .md-body code {
    background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 4px;
    padding: 1px 4px; font-size: .87em;
    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
    color: #7c3aed;
  }
  .md-body pre {
    background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;
    padding: 10px 12px; overflow-x: auto; margin: .4em 0 .65em;
    font-size: .85em; line-height: 1.55;
  }
  .md-body pre code { background: none; border: none; padding: 0; color: #334155; font-size: 1em; }
  .md-body blockquote {
    border-left: 3px solid #6366f1; margin: .4em 0 .65em;
    padding: .25em .75em .25em .85em; background: #eef2ff;
    border-radius: 0 6px 6px 0; color: #3730a3;
  }
  .md-body blockquote p { margin: 0; }
  .md-body hr { border: none; border-top: 1.5px solid #e2e8f0; margin: .7em 0; }
  .md-body table { border-collapse: collapse; width: 100%; margin: .4em 0 .65em; font-size: .91em; }
  .md-body th { background: #f1f5f9; border: 1px solid #e2e8f0; padding: 5px 9px; font-weight: 700; text-align: left; color: #334155; }
  .md-body td { border: 1px solid #e2e8f0; padding: 4px 9px; color: #475569; }
  .md-body tr:nth-child(even) td { background: #f8fafc; }
  .md-body a { color: #6366f1; text-decoration: underline; text-underline-offset: 2px; }
  .md-body a:hover { color: #4338ca; }
  .md-body input[type="checkbox"] { margin-right: 4px; accent-color: #6366f1; }
`

let cssInjected = false

export default function Markdown({ children, fontSize = 13, lineHeight = 1.7, color, style = {} }) {
  if (!cssInjected) {
    const tag = document.createElement('style')
    tag.textContent = SHARED_CSS
    document.head.appendChild(tag)
    cssInjected = true
  }

  if (!children) return null

  const vars = {
    '--md-fs':    `${fontSize}px`,
    '--md-lh':    String(lineHeight),
    '--md-color': color || '#1e293b',
    ...style,
  }

  return (
    <div className="md-body" style={vars}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {children}
      </ReactMarkdown>
    </div>
  )
}
