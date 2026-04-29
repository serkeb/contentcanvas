import { useState, useEffect } from 'react'
import { useAuth } from './hooks/useAuth'
import AuthScreen from './components/AuthScreen'
import ContentCanvas from './canvas/ContentCanvas'

export default function App() {
  const { user, loading } = useAuth()
  const [showAuth, setShowAuth] = useState(false)

  useEffect(() => {
    // Mostrar pantalla de autenticación si no hay usuario
    if (!loading && !user) {
      setShowAuth(true)
    }
  }, [loading, user])

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin"></div>
      </div>
    )
  }

  // Auth screen
  if (!user) {
    return <AuthScreen onAuthenticated={() => setShowAuth(false)} />
  }

  // Main app
  return <ContentCanvas />
}
