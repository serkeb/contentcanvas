import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

interface AuthScreenProps {
  onAuthenticated: () => void
}

export default function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const { signIn, signUp, loading } = useAuth()
  const [isSignUp, setIsSignUp]     = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [name, setName]             = useState('')
  const [error, setError]           = useState('')
  const [success, setSuccess]       = useState('')
  const [submitting, setSubmitting] = useState(false)

  const toggleMode = () => {
    setIsSignUp(v => !v)
    setError('')
    setSuccess('')
  }

  const validateForm = () => {
    if (!email || !email.includes('@')) {
      setError('Ingresá un email válido')
      return false
    }
    if (!password || password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return false
    }
    if (isSignUp && !name.trim()) {
      setError('Ingresá tu nombre')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!validateForm()) return
    setSubmitting(true)
    try {
      if (isSignUp) {
        await signUp(email, password, name.trim())
        setSuccess('¡Cuenta creada! Revisá tu email para confirmar')
        setTimeout(() => onAuthenticated(), 2000)
      } else {
        await signIn(email, password)
        onAuthenticated()
      }
    } catch (err: any) {
      setError(err.message || 'Error en la autenticación')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div style={styles.loadingWrap}>
        <div style={styles.spinner} />
      </div>
    )
  }

  return (
    <>
      <style>{css}</style>
      <div style={styles.page}>
        <div style={styles.card}>

          {/* ── Left panel ─────────────────────────────── */}
          <div style={styles.left}>
            <span style={styles.logoMarkLeft}>✳</span>

            <div style={styles.leftTagline}>
              <p style={styles.leftSmall}>Con Bolasina podés</p>
              <p style={styles.leftBig}>
                Crear contenido que conecta y convierte, con IA que entiende tu marca
              </p>
            </div>
          </div>

          {/* ── Right panel ────────────────────────────── */}
          <div style={styles.right}>
            <span style={styles.logoMarkRight}>✳</span>

            <h1 style={styles.heading}>
              {isSignUp ? 'Creá tu cuenta' : 'Bienvenido de nuevo'}
            </h1>
            <p style={styles.subheading}>
              {isSignUp
                ? 'Accedé a tus tableros y proyectos desde cualquier lugar, en cualquier momento.'
                : 'Iniciá sesión para continuar creando contenido con IA.'}
            </p>

            <form onSubmit={handleSubmit} style={styles.form}>

              {isSignUp && (
                <div style={styles.field}>
                  <label style={styles.label}>Tu nombre</label>
                  <input
                    className="a-input"
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Juan Pérez"
                    required
                  />
                </div>
              )}

              <div style={styles.field}>
                <label style={styles.label}>Tu email</label>
                <input
                  className="a-input"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  autoComplete="email"
                  required
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Contraseña</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="a-input"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••"
                    autoComplete={isSignUp ? 'new-password' : 'current-password'}
                    required
                    style={{ paddingRight: 44 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    style={styles.eyeBtn}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? (
                      /* eye-off */
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      /* eye */
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {error   && <p style={styles.errorMsg}>{error}</p>}
              {success && <p style={styles.successMsg}>{success}</p>}

              <button
                className="a-btn"
                type="submit"
                disabled={submitting}
                style={{ marginTop: 8 }}
              >
                {submitting
                  ? 'Procesando...'
                  : isSignUp ? 'Comenzar' : 'Iniciar sesión'}
              </button>
            </form>

            <p style={styles.switchLine}>
              {isSignUp ? '¿Ya tenés cuenta? ' : '¿No tenés cuenta? '}
              <button className="a-switch" type="button" onClick={toggleMode}>
                {isSignUp ? 'Iniciá sesión' : 'Registrate gratis'}
              </button>
            </p>
          </div>

        </div>
      </div>
    </>
  )
}

/* ─── Styles ──────────────────────────────────────────────────────────────── */

const INDIGO = '#4f46e5'

const styles: Record<string, React.CSSProperties> = {
  loadingWrap: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#ecedf8',
  },
  spinner: {
    width: 30,
    height: 30,
    borderRadius: '50%',
    border: '2.5px solid #ddd6fe',
    borderTopColor: INDIGO,
    animation: 'a-spin 0.75s linear infinite',
  },
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#ecedf8',
    padding: '24px',
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  card: {
    display: 'flex',
    width: '100%',
    maxWidth: 880,
    borderRadius: 26,
    overflow: 'hidden',
    boxShadow: '0 24px 80px rgba(79, 70, 229, 0.14)',
  },
  /* Left */
  left: {
    width: '42%',
    flexShrink: 0,
    background: `
      radial-gradient(ellipse 100% 80% at 5% 5%,  rgba(72, 100, 255, 0.95), transparent 60%),
      radial-gradient(ellipse 70%  70% at 80% 55%, rgba(168, 85, 247, 0.88), transparent 60%),
      radial-gradient(ellipse 80%  80% at 35% 95%, rgba(49, 116, 255, 0.75), transparent 60%),
      #3730a3
    `,
    padding: '40px 36px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  logoMarkLeft: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 26,
    lineHeight: 1,
  },
  leftTagline: {
    marginTop: 'auto',
  },
  leftSmall: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13,
    margin: '0 0 10px',
    fontWeight: 400,
  },
  leftBig: {
    color: '#fff',
    fontSize: 21,
    fontWeight: 700,
    lineHeight: 1.35,
    margin: 0,
  },
  /* Right */
  right: {
    flex: 1,
    background: '#fff',
    padding: '52px 48px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  logoMarkRight: {
    color: INDIGO,
    fontSize: 22,
    lineHeight: 1,
    marginBottom: 20,
    display: 'block',
  },
  heading: {
    fontSize: 28,
    fontWeight: 700,
    color: '#111',
    margin: '0 0 8px',
    letterSpacing: '-0.3px',
  },
  subheading: {
    fontSize: 14,
    color: '#6b7280',
    margin: '0 0 32px',
    lineHeight: 1.55,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 7,
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: '#374151',
  },
  eyeBtn: {
    position: 'absolute',
    right: 14,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#9ca3af',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    lineHeight: 1,
  },
  errorMsg: {
    fontSize: 13,
    color: '#dc2626',
    margin: 0,
  },
  successMsg: {
    fontSize: 13,
    color: '#16a34a',
    margin: 0,
  },
  switchLine: {
    textAlign: 'center',
    fontSize: 13,
    color: '#6b7280',
    marginTop: 24,
  },
}

const css = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap');

@keyframes a-spin { to { transform: rotate(360deg); } }

.a-input {
  width: 100%;
  box-sizing: border-box;
  padding: 11px 14px;
  border: 1.5px solid #e5e7eb;
  border-radius: 10px;
  font-size: 14px;
  font-family: 'DM Sans', system-ui, sans-serif;
  color: #111;
  background: #fff;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.a-input:focus {
  border-color: ${INDIGO};
  box-shadow: 0 0 0 3px rgba(79,70,229,0.1);
}
.a-input::placeholder { color: #c4c4cc; }

.a-btn {
  width: 100%;
  padding: 13px;
  background: ${INDIGO};
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  font-family: 'DM Sans', system-ui, sans-serif;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
  letter-spacing: 0.01em;
}
.a-btn:hover:not(:disabled) { background: #4338ca; }
.a-btn:active:not(:disabled) { transform: scale(0.99); }
.a-btn:disabled { opacity: 0.55; cursor: not-allowed; }

.a-switch {
  background: none;
  border: none;
  cursor: pointer;
  color: ${INDIGO};
  font-weight: 600;
  font-size: 13px;
  font-family: 'DM Sans', system-ui, sans-serif;
  padding: 0;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.a-switch:hover { color: #4338ca; }
`
