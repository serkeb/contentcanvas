# Ejemplo de Integración de Autenticación en App.jsx

```jsx
// client/src/App.jsx
import { useState, useEffect } from 'react'
import { useAuth } from './hooks/useAuth'
import LoginScreen from './components/LoginScreen'
import ContentCanvas from './canvas/ContentCanvas'

export default function App() {
  const { user, loading } = useAuth()
  const [showLogin, setShowLogin] = useState(false)

  // Mostrar login si no hay usuario
  useEffect(() => {
    if (!loading && !user) {
      setShowLogin(true)
    }
  }, [loading, user])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!user) {
    return <LoginScreen onAuthenticated={() => setShowLogin(false)} />
  }

  return <ContentCanvas />
}
```

---

# Integración en ContentCanvas.jsx

```jsx
// client/src/canvas/ContentCanvas.jsx
import { useEffect } from 'react'
import { getCurrentUser } from '../lib/supabase'
import * as cloudStorage from './utils/cloudStorage'

// Reemplazar las importaciones de localStorage:
import { saveBoard, loadBoard, saveBrandVoice, loadBrandVoices } from './utils/cloudStorage'

// En el componente, agregar useEffect para inicializar usuario
useEffect(() => {
  const initializeUser = async () => {
    try {
      await getCurrentUser()
      // Usuario inicializado, ahora podemos usar cloudStorage
    } catch (error) {
      console.error('Usuario no autenticado')
      // Redirigir a login
    }
  }

  initializeUser()
}, [])
```

---

# Modificación en useBoards.js

```jsx
// client/src/canvas/utils/useBoards.js
import { useState, useEffect, useRef } from 'react'
import {
  listBoards,
  saveBoards,
  getCurrentBoardId,
  setCurrentBoardId,
  saveBoard,
  loadBoard,
  deleteBoardData,
  createBoard as createCloudBoard,
  renameBoard as renameCloudBoard,
} from './cloudStorage'

export function useBoards(setNodes, setEdges) {
  const [boards, setBoardsState] = useState(() => {
    // Cargar boards desde Supabase
    listBoards().then(setBoardsState)
    return []
  })

  const [currentBoardId, setCurrentBoardIdState] = useState(() => {
    // Cargar ID actual desde localStorage
    return localStorage.getItem('canvas-current-board-v1') || 'default'
  })

  const nodesRef = useRef([])
  const edgesRef = useRef([])

  // Cargar el board inicial
  useEffect(() => {
    loadBoard(currentBoardId).then(({ nodes, edges }) => {
      setNodes(nodes)
      setEdges(edges)
    })
  }, [currentBoardId, setNodes, setEdges])

  async function switchBoard(id) {
    if (id === currentBoardId) return

    // Guardar board actual
    saveBoard(currentBoardId, nodesRef.current, edgesRef.current)

    // Cargar nuevo board
    const { nodes, edges } = await loadBoard(id)
    setNodes(nodes)
    setEdges(edges)
    setCurrentBoardId(id)
    setCurrentBoardIdState(id)
  }

  async function createBoard(name) {
    const id = await createCloudBoard(name || `Tablero ${boards.length + 1}`)
    await switchBoard(id)

    // Actualizar lista de boards
    const updated = await listBoards()
    setBoardsState(updated)
  }

  async function renameBoard(id, name) {
    await renameCloudBoard(id, name)

    // Actualizar lista de boards
    const updated = await listBoards()
    setBoardsState(updated)
  }

  async function deleteBoard(id) {
    if (boards.length <= 1) return

    await deleteBoardData(id)

    // Actualizar lista de boards
    const updated = await listBoards()
    setBoardsState(updated)

    if (currentBoardId === id) {
      const newId = updated[0].id
      const { nodes, edges } = await loadBoard(newId)
      setNodes(nodes)
      setEdges(edges)
      setCurrentBoardId(newId)
      setCurrentBoardIdState(newId)
    }
  }

  return {
    boards,
    currentBoardId,
    nodesRef,
    edgesRef,
    switchBoard,
    createBoard,
    renameBoard,
    deleteBoard
  }
}
```

---

# Integración en API para caché

```jsx
// client/src/canvas/utils/api.js
import { getCachedTranscript, saveCachedTranscript } from '../../services/cacheService'

export async function transcribeUrl(url, apiKeys) {
  // Verificar caché primero
  const cached = await getCachedTranscript(url)
  if (cached) {
    console.log('Usando transcripción cacheada')
    return {
      transcript: cached.transcript,
      language: cached.language,
      source: 'cache'
    }
  }

  // Si no está en caché, transcribir
  const response = await fetch('http://localhost:5000/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, api_keys: apiKeys })
  })

  const result = await response.json()

  // Guardar en caché
  await saveCachedTranscript({
    url,
    transcript: result.transcript,
    language: result.language,
    source: result.source || 'whisper',
    audio_seconds: result.usage?.audio_seconds
  })

  return result
}
```

---

# Configuración de package.json

Asegúrate de tener las dependencias necesarias:

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }
}
```

Instalar:

```bash
npm install @supabase/supabase-js
```