import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ChevronRight,
  Github,
  Chrome
} from 'lucide-react'

interface DarkAuthScreenProps {
  onAuthenticated: () => void
}

export default function DarkAuthScreen({ onAuthenticated }: DarkAuthScreenProps) {
  const { signIn, signUp, loading } = useAuth()
  const [isSignUp, setIsSignUp] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      if (isSignUp) {
        await signUp(email, password, name.trim())
        onAuthenticated()
      } else {
        await signIn(email, password)
        onAuthenticated()
      }
    } catch (err: any) {
      setError(err.message || 'Error en la autenticación')
    } finally {
      setIsLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-gray-800 border-t-indigo-500 rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-400 text-sm font-medium">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-gray-950 to-gray-950"></div>

        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

        {/* Floating orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-2xl shadow-indigo-500/20 mb-4 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl blur-xl opacity-50 animate-pulse"></div>
            <svg className="relative w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {isSignUp ? 'Únete al equipo' : 'Bienvenido'}
          </h1>
          <p className="text-gray-400 text-sm">
            {isSignUp ? 'Crea tu cuenta gratis' : 'Inicia sesión en tu cuenta'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-2xl shadow-2xl p-8">
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {isSignUp && (
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-gray-300 block">
                  Nombre
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                    placeholder="Juan Pérez"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-300 block">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                  placeholder="tu@email.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-gray-300 block">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="group w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 blur-lg"></div>
              <span className="relative flex items-center gap-2 font-medium">
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Procesando...
                  </>
                ) : (
                  <>
                    {isSignUp ? 'Crear cuenta' : 'Iniciar sesión'}
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                  </>
                )}
              </span>
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-900/50 text-gray-500">O continúa con</span>
            </div>
          </div>

          {/* Social buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-all duration-200"
            >
              <Github className="w-5 h-5" />
              <span className="text-sm font-medium">GitHub</span>
            </button>
            <button
              type="button"
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-all duration-200"
            >
              <Chrome className="w-5 h-5" />
              <span className="text-sm font-medium">Google</span>
            </button>
          </div>

          {/* Toggle */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-gray-400 hover:text-white transition-colors duration-200 inline-flex items-center gap-1"
            >
              {isSignUp ? (
                <>
                  ¿Ya tienes cuenta?
                  <span className="text-indigo-400 hover:text-indigo-300 font-medium">Inicia sesión</span>
                </>
              ) : (
                <>
                  ¿No tienes cuenta?
                  <span className="text-indigo-400 hover:text-indigo-300 font-medium">Regístrate</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Features */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">∞</div>
            <div className="text-xs text-gray-500 mt-1">Tableros</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">☁️</div>
            <div className="text-xs text-gray-500 mt-1">Cloud</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">🔒</div>
            <div className="text-xs text-gray-500 mt-1">Seguro</div>
          </div>
        </div>
      </div>
    </div>
  )
}