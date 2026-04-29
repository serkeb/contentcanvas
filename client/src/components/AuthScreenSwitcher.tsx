import { useState } from 'react'
import AuthScreen from './AuthScreen'
import MinimalAuthScreen from './MinimalAuthScreen'
import DarkAuthScreen from './DarkAuthScreen'
import TypographyAuthScreen from './TypographyAuthScreen'
import { Palette, Minimal, Moon, Type } from 'lucide-react'

interface AuthScreenSwitcherProps {
  onAuthenticated: () => void
}

type AuthStyle = 'glassmorphism' | 'minimal' | 'dark' | 'typography'

export default function AuthScreenSwitcher({ onAuthenticated }: AuthScreenSwitcherProps) {
  const [currentStyle, setCurrentStyle] = useState<AuthStyle>('glassmorphism')

  const styles = [
    {
      id: 'glassmorphism' as AuthStyle,
      name: 'Glassmorphism',
      description: 'Colorido y vibrante con efectos de cristal',
      icon: Palette,
      gradient: 'from-indigo-500 via-purple-500 to-pink-500'
    },
    {
      id: 'minimal' as AuthStyle,
      name: 'Minimalista',
      description: 'Limpio y profesional estilo enterprise',
      icon: Minimal,
      gradient: 'from-gray-100 to-gray-200'
    },
    {
      id: 'dark' as AuthStyle,
      name: 'Dark Mode',
      description: 'Modo oscuro moderno para developers',
      icon: Moon,
      gradient: 'from-gray-800 to-gray-900'
    },
    {
      id: 'typography' as AuthStyle,
      name: 'Typography',
      description: 'Diseño audaz con tipografía grande',
      icon: Type,
      gradient: 'from-black to-gray-900'
    }
  ]

  return (
    <div className="relative">
      {/* Style selector (solo visible en desarrollo) */}
      {import.meta.env.DEV && (
        <div className="fixed top-4 right-4 z-50">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-2xl">
            <p className="text-white text-xs font-medium mb-3">Selecciona estilo:</p>
            <div className="space-y-2">
              {styles.map((style) => {
                const Icon = style.icon
                return (
                  <button
                    key={style.id}
                    onClick={() => setCurrentStyle(style.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 ${
                      currentStyle === style.id
                        ? 'bg-white/20 text-white'
                        : 'bg-transparent text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${style.gradient}`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium">{style.name}</p>
                      <p className="text-xs opacity-70">{style.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Render current style */}
      {currentStyle === 'glassmorphism' && <AuthScreen onAuthenticated={onAuthenticated} />}
      {currentStyle === 'minimal' && <MinimalAuthScreen onAuthenticated={onAuthenticated} />}
      {currentStyle === 'dark' && <DarkAuthScreen onAuthenticated={onAuthenticated} />}
      {currentStyle === 'typography' && <TypographyAuthScreen onAuthenticated={onAuthenticated} />}
    </div>
  )
}

// Hook personalizado para cambiar estilos programáticamente
export function useAuthStyle() {
  const [style, setStyle] = useState<AuthStyle>(
    (localStorage.getItem('authStyle') as AuthStyle) || 'glassmorphism'
  )

  const changeStyle = (newStyle: AuthStyle) => {
    setStyle(newStyle)
    localStorage.setItem('authStyle', newStyle)
  }

  return { style, changeStyle }
}