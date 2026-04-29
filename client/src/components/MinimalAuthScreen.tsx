import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import {
  Mail,
  Lock,
  User,
  ArrowRight,
  X,
  Check
} from 'lucide-react'

interface MinimalAuthScreenProps {
  onAuthenticated: () => void
}

export default function MinimalAuthScreen({ onAuthenticated }: MinimalAuthScreenProps) {
  const { signIn, signUp, loading } = useAuth()
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [focusedField, setFocusedField] = useState<string | null>(null)
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-gray-200 border-t-indigo-600 rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-600 text-sm font-medium">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-100 rounded-full blur-3xl opacity-30 -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-100 rounded-full blur-3xl opacity-30 translate-y-1/2 -translate-x-1/2"></div>
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl shadow-lg mb-4">
            <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isSignUp ? 'Crear cuenta' : 'Iniciar sesión'}
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            {isSignUp ? 'Comienza gratis, sin tarjeta de crédito' : 'Bienvenido de nuevo'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          {/* Tabs */}
          <div className="flex gap-2 mb-6 p-1 bg-gray-100 rounded-xl">
            <button
              type="button"
              onClick={() => setIsSignUp(false)}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                !isSignUp
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              onClick={() => setIsSignUp(true)}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                isSignUp
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Crear cuenta
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-gray-700 block">
                  Nombre completo
                </label>
                <div className={`relative transition-all duration-200 ${
                  focusedField === 'name' ? 'scale-[1.02]' : ''
                }`}>
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className={`h-5 w-5 transition-colors duration-200 ${
                      focusedField === 'name' ? 'text-indigo-600' : 'text-gray-400'
                    }`} />
                  </div>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onFocus={() => setFocusedField('name')}
                    onBlur={() => setFocusedField(null)}
                    className="block w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all duration-200"
                    placeholder="Juan Pérez"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-700 block">
                Email
              </label>
              <div className={`relative transition-all duration-200 ${
                focusedField === 'email' ? 'scale-[1.02]' : ''
              }`}>
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className={`h-5 w-5 transition-colors duration-200 ${
                    focusedField === 'email' ? 'text-indigo-600' : 'text-gray-400'
                  }`} />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  className="block w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all duration-200"
                  placeholder="tu@email.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-gray-700 block">
                Contraseña
              </label>
              <div className={`relative transition-all duration-200 ${
                focusedField === 'password' ? 'scale-[1.02]' : ''
              }`}>
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className={`h-5 w-5 transition-colors duration-200 ${
                    focusedField === 'password' ? 'text-indigo-600' : 'text-gray-400'
                  }`} />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  className="block w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all duration-200"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <X className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Procesando...
                </>
              ) : (
                <>
                  {isSignUp ? 'Crear cuenta' : 'Iniciar sesión'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Benefits */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="space-y-2">
              {isSignUp ? (
                <>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span>Sincronización entre dispositivos</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span>Almacenamiento ilimitado en la nube</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span>Sin tarjeta de crédito requerida</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span>Acceso a todos tus tableros</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span>Continúa donde lo dejaste</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span>100% seguro y privado</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center mt-6 text-sm text-gray-500">
          Al continuar, aceptas nuestros{' '}
          <a href="#" className="text-indigo-600 hover:text-indigo-700 font-medium">
            Términos de servicio
          </a>{' '}
          y{' '}
          <a href="#" className="text-indigo-600 hover:text-indigo-700 font-medium">
            Política de privacidad
          </a>
        </p>
      </div>
    </div>
  )
}