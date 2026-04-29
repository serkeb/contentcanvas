import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { ArrowRight, Mail, Lock, User } from 'lucide-react'

interface TypographyAuthScreenProps {
  onAuthenticated: () => void
}

export default function TypographyAuthScreen({ onAuthenticated }: TypographyAuthScreenProps) {
  const { signIn, signUp, loading } = useAuth()
  const [isSignUp, setIsSignUp] = useState(false)
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
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-white text-2xl font-light tracking-wider animate-pulse">
          Loading...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-black via-gray-900 to-black"></div>
        <div className="absolute top-20 left-20 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-2xl relative z-10">
        {/* Large typography header */}
        <div className="mb-16 text-center">
          <h1 className="text-7xl md:text-8xl lg:text-9xl font-bold text-white tracking-tighter mb-4">
            {isSignUp ? 'Join' : 'Welcome'}
          </h1>
          <p className="text-xl md:text-2xl text-gray-400 font-light tracking-wide">
            {isSignUp ? 'Start creating today' : 'Sign in to continue'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {isSignUp && (
            <div className="group">
              <input
                id="name"
                name="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="block w-full px-0 py-4 bg-transparent border-0 border-b-2 border-gray-800 text-white text-3xl font-light placeholder-gray-600 focus:outline-none focus:border-white transition-colors duration-200"
                placeholder="Your name"
              />
            </div>
          )}

          <div className="group">
            <div className="relative">
              <Mail className="absolute left-0 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-600 group-focus-within:text-white transition-colors duration-200" />
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-10 pr-0 py-4 bg-transparent border-0 border-b-2 border-gray-800 text-white text-3xl font-light placeholder-gray-600 focus:outline-none focus:border-white transition-colors duration-200"
                placeholder="your@email.com"
              />
            </div>
          </div>

          <div className="group">
            <div className="relative">
              <Lock className="absolute left-0 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-600 group-focus-within:text-white transition-colors duration-200" />
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-0 py-4 bg-transparent border-0 border-b-2 border-gray-800 text-white text-3xl font-light placeholder-gray-600 focus:outline-none focus:border-white transition-colors duration-200"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <div className="py-3 border-l-2 border-red-500">
              <p className="text-red-400 text-lg font-light">{error}</p>
            </div>
          )}

          <div className="pt-8">
            <button
              type="submit"
              disabled={isLoading}
              className="group w-full flex items-center justify-between py-5 px-8 border-2 border-white text-white text-2xl font-light hover:bg-white hover:text-black transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{isLoading ? 'Processing...' : (isSignUp ? 'Create account' : 'Sign in')}</span>
              <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform duration-300" />
            </button>
          </div>
        </form>

        {/* Toggle */}
        <div className="mt-12 text-center">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-gray-500 hover:text-white text-lg font-light transition-colors duration-200"
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Join"}
          </button>
        </div>

        {/* Footer branding */}
        <div className="mt-16 text-center">
          <p className="text-gray-600 text-sm font-light tracking-wider">
            CONTENT RESEARCH CANVAS
          </p>
        </div>
      </div>

      {/* Side decoration */}
      <div className="hidden lg:block absolute right-12 top-1/2 -translate-y-1/2 space-y-4">
        <div className="w-px h-24 bg-gradient-to-b from-transparent to-white/20"></div>
        <div className="w-px h-24 bg-white/20"></div>
        <div className="w-px h-24 bg-white/20"></div>
        <div className="w-px h-24 bg-gradient-to-t from-white/20 to-transparent"></div>
      </div>

      <div className="hidden lg:block absolute left-12 top-1/2 -translate-y-1/2 space-y-4">
        <div className="w-px h-24 bg-gradient-to-b from-transparent to-white/20"></div>
        <div className="w-px h-24 bg-white/20"></div>
        <div className="w-px h-24 bg-white/20"></div>
        <div className="w-px h-24 bg-gradient-to-t from-white/20 to-transparent"></div>
      </div>
    </div>
  )
}