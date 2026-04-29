import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { User, Settings, LogOut } from 'lucide-react'

interface UserMenuProps {
  onOpenConfig?: () => void
  onOpenProfile?: () => void
}

export default function UserMenu({ onOpenConfig, onOpenProfile }: UserMenuProps) {
  const { user, signOut } = useAuth()
  const [isOpen, setIsOpen] = useState(false)

  const handleSignOut = async () => {
    try {
      await signOut()
      window.location.reload() // Recargar para limpiar estado
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    }
  }

  if (!user) return null

  return (
    <div className="relative">
      {/* User button — solo avatar, sin email ni texto */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        title={user.email}
        style={{
          width: 34, height: 34, borderRadius: 10, border: 'none', cursor: 'pointer',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          color: '#fff', fontSize: 14, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(99,102,241,0.35)',
          flexShrink: 0,
        }}
      >
        {user.email?.[0].toUpperCase()}
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div className="absolute right-0 top-full mt-2 w-56 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl overflow-hidden z-20 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* User info */}
            <div className="px-4 py-3 border-b border-white/10">
              <p className="text-white text-sm font-medium truncate">
                {user.email}
              </p>
              <p className="text-white/60 text-xs mt-0.5">
                Plan Gratuito
              </p>
            </div>

            {/* Menu items */}
            <div className="py-2">
              <button
                onClick={() => { setIsOpen(false); onOpenProfile?.() }}
                className="w-full flex items-center gap-3 px-4 py-2 text-white/90 hover:bg-white/10 transition-colors duration-150"
              >
                <User className="w-4 h-4" />
                <span className="text-sm">Perfil</span>
              </button>

              <button
                onClick={() => { setIsOpen(false); onOpenConfig?.() }}
                className="w-full flex items-center gap-3 px-4 py-2 text-white/90 hover:bg-white/10 transition-colors duration-150"
              >
                <Settings className="w-4 h-4" />
                <span className="text-sm">Configuración</span>
              </button>
            </div>

            {/* Divider */}
            <div className="border-t border-white/10"></div>

            {/* Sign out */}
            <div className="py-2">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-2 text-red-400 hover:bg-red-500/10 transition-colors duration-150"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-medium">Cerrar sesión</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}