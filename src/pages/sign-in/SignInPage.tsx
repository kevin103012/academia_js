import { useState, type FormEvent } from 'react'
import { ArrowLeft, Eye, EyeOff, LogIn } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Brand } from '../../components/ui/Brand'
import { LoadingMark } from '../../components/ui/LoadingMark'
import { demoPassword, demoUsers } from '../../data/demoUsers'
import { useAuth } from '../../hooks/useAuth'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { paths } from '../../routes/paths'
import type { DemoUser } from '../../types/auth'
import { DemoAccounts } from './DemoAccounts'

export function SignInPage() {
  useDocumentTitle('Iniciar sesión | Junior’s Sparks')
  const { user, signIn } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const presetRole = searchParams.get('perfil')
  const initialAccount = demoUsers.find((account) => account.role === presetRole)
  const [email, setEmail] = useState(initialAccount?.email ?? '')
  const [password, setPassword] = useState(initialAccount ? demoPassword : '')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function selectAccount(account: DemoUser) {
    setEmail(account.email)
    setPassword(demoPassword)
    setError('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading) return
    setError('')
    setLoading(true)

    try {
      const authenticated = await signIn(email, password)
      if (authenticated) {
        navigate(paths.campus)
        return
      }
      setError('El correo o la contraseña no coinciden. Selecciona una cuenta de prueba para cargar sus datos.')
    } catch {
      setError('No pudimos validar tu acceso en este momento. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="access-page">
      <aside className="access-visual theme-dark">
        <img className="access-visual__image" src="/media/hero.jpg" alt="" width="1600" height="900" />
        <Brand />
        <div className="access-visual__copy">
          <p>El aprendizaje empieza con una chispa.</p>
        </div>
      </aside>
      <main className="access-main" id="contenido">
        <div className="access-content tonal-panel view-enter">
          <Link className="access-back" to={paths.home}>
            <ArrowLeft size={18} aria-hidden="true" /> Volver al inicio
          </Link>
          <h1>Iniciar sesión</h1>
          <p className="access-lead">Entra al campus con una cuenta de prueba.</p>

          {user && (
            <div className="access-session">
              Sesión actual: {user.name}.{' '}
              <Link className="text-link" to={paths.campus}>
                Ir al campus
              </Link>
            </div>
          )}

          <form className="access-form" onSubmit={handleSubmit} aria-busy={loading}>
            <label htmlFor="email">Correo electrónico</label>
            <input
              className="tonal-input"
              type="email"
              id="email"
              name="email"
              placeholder="tu@correo.com"
              autoComplete="username"
              value={email}
              required
              disabled={loading}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'access-error' : undefined}
              onChange={(event) => {
                setEmail(event.target.value)
                setError('')
              }}
            />
            <label htmlFor="password">Contraseña</label>
            <div className="access-password">
              <input
                className="tonal-input"
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                placeholder="Ingresa tu contraseña"
                autoComplete="current-password"
                value={password}
                required
                disabled={loading}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'access-error' : undefined}
                onChange={(event) => {
                  setPassword(event.target.value)
                  setError('')
                }}
              />
              <button
                className="tactile"
                type="button"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>
            {error && (
              <p className="access-error" id="access-error" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="button button--primary tone-accent" disabled={loading}>
              {loading ? (
                <LoadingMark label="Entrando al campus" compact />
              ) : (
                <>
                  <LogIn size={18} aria-hidden="true" /> Entrar al campus
                </>
              )}
            </button>
          </form>

          <DemoAccounts selectedEmail={email} loading={loading} onSelect={selectAccount} />
        </div>
      </main>
    </div>
  )
}
