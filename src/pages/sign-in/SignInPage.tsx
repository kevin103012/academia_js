import { useState, type FormEvent } from 'react'
import { ArrowLeft, CheckCircle2, Clock3, Eye, EyeOff, LogIn, UserPlus } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Brand } from '../../components/ui/Brand'
import { LoadingMark } from '../../components/ui/LoadingMark'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { demoPassword, demoUsers } from '../../data/demoUsers'
import { env } from '../../config/env'
import { completeCampusInvitation } from '../../services/auth/authService'
import { useAuth } from '../../hooks/useAuth'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { paths } from '../../routes/paths'
import type { DemoRole, DemoUser } from '../../types/auth'
import { DemoAccounts } from './DemoAccounts'

type AccessMode = 'login' | 'register'

const modeOptions = [
  { value: 'login' as const, label: 'Iniciar sesión', icon: <LogIn size={16} aria-hidden="true" /> },
  { value: 'register' as const, label: 'Solicitar acceso', icon: <UserPlus size={16} aria-hidden="true" /> },
]

const academicBlocks = [
  'Ing. de Sistemas · Ciclo III',
  'Ing. de Sistemas · Ciclo IV',
  'Ing. de Sistemas · Ciclo V',
  'Ing. de Sistemas · Ciclo VI',
]

export function SignInPage() {
  useDocumentTitle('Acceso al campus | Junior’s Sparks')
  const { user, signInDetailed, submitAccessRequest } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const presetRole = searchParams.get('perfil')
  const managed = env.hasSupabase && env.managedAuth
  const activating = managed && searchParams.get('activar') === '1'
  const initialAccount = managed ? undefined : demoUsers.find((account) => account.role === presetRole)

  const [mode, setMode] = useState<AccessMode>('login')
  const [email, setEmail] = useState(initialAccount?.email ?? '')
  const [password, setPassword] = useState(initialAccount ? demoPassword : '')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [statusNotice, setStatusNotice] = useState<{ kind: 'pending' | 'success'; message: string }>()

  const [fullName, setFullName] = useState('')
  const [reqEmail, setReqEmail] = useState('')
  const [requestedRole, setRequestedRole] = useState<DemoRole>('student')
  const [academicBlock, setAcademicBlock] = useState(academicBlocks[0])
  const [motivation, setMotivation] = useState('')

  function selectAccount(account: DemoUser) {
    setMode('login')
    setEmail(account.email)
    setPassword(demoPassword)
    setError('')
    setStatusNotice(undefined)
  }

  async function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading) return
    setError('')
    setStatusNotice(undefined)
    setLoading(true)

    try {
      const result = await signInDetailed(email, password)
      if (result.status === 'authenticated') {
        navigate(paths.campus)
        return
      }
      if (result.status === 'pending_approval') {
        setStatusNotice({
          kind: 'pending',
          message:
            'Tu registro está en espera de aprobación por Administración. Cuando sea aprobado recibirás tus credenciales de acceso.',
        })
        return
      }
      if (result.status === 'rejected') {
        setError('Tu solicitud de acceso fue rechazada. Comunícate con Administración para revisarla.')
        return
      }
      setError(managed ? 'El correo o la contraseña no coinciden.' : 'El correo o la contraseña no coinciden. Verifica tus credenciales emitidas o usa una cuenta de prueba.')
    } catch {
      setError('No pudimos validar tu acceso en este momento. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  async function handleRegisterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading) return
    setError('')
    setStatusNotice(undefined)
    setLoading(true)

    try {
      const result = await submitAccessRequest({
        fullName,
        email: reqEmail,
        requestedRole,
        academicBlock,
        motivation,
      })

      if (result.status === 'already_registered') {
        setError(result.message)
        return
      }

      setStatusNotice({
        kind: 'success',
        message: managed
          ? `Solicitud registrada para ${result.request.email}. Cuando la aprueben, recibirás un enlace para crear tu contraseña.`
          : `Solicitud registrada para ${result.request.email}. Administración la revisará para aprobarla y emitir tu contraseña temporal.`,
      })
      setFullName('')
      setReqEmail('')
      setMotivation('')
    } catch {
      setError('No pudimos enviar tu solicitud en este momento. Revisa los datos e intenta otra vez.')
    } finally {
      setLoading(false)
    }
  }

  async function activate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading) return
    const form = new FormData(event.currentTarget)
    const value = String(form.get('newPassword') ?? '')
    if (value.length < 10 || value !== form.get('confirmPassword')) {
      setError('Usa al menos 10 caracteres y verifica que ambas contraseñas coincidan.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await completeCampusInvitation(value)
      window.location.replace(paths.campus)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo activar la cuenta.')
    } finally {
      setLoading(false)
    }
  }

  if (activating) return <main className="access-page">
    <aside className="access-visual theme-dark"><Brand /></aside>
    <div className="access-main">
      <form className="access-form" onSubmit={activate}>
        <h1>Activa tu cuenta</h1>
        <p>Elige la contraseña que usarás para entrar al campus.</p>
        <label>Nueva contraseña<input autoComplete="new-password" type="password" name="newPassword" required minLength={10} maxLength={72} /></label>
        <label>Confirma tu contraseña<input autoComplete="new-password" type="password" name="confirmPassword" required minLength={10} maxLength={72} /></label>
        {error && <p role="alert">{error}</p>}
        <button type="submit" className="button button--primary tone-accent" disabled={loading}>{loading ? 'Activando…' : 'Activar e ingresar'}</button>
        <Link to={paths.signIn}>Volver al acceso</Link>
      </form>
    </div>
  </main>

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
          <h1>{mode === 'login' ? 'Iniciar sesión' : 'Solicitar acceso'}</h1>
          <p className="access-lead">
            {mode === 'login'
              ? 'Ingresa con tus credenciales institucionales o selecciona una cuenta de prueba.'
              : 'Regístrate con tu correo y espera la aprobación de Administración para recibir tus credenciales.'}
          </p>

          <SegmentedControl
            className="access-tabs"
            label="Modo de acceso"
            options={modeOptions}
            value={mode}
            onChange={(next) => {
              setMode(next)
              setError('')
              setStatusNotice(undefined)
            }}
          />

          {user && (
            <div className="access-session">
              Sesión actual: {user.name}.{' '}
              <Link className="text-link" to={paths.campus}>
                Ir al campus
              </Link>
            </div>
          )}

          {statusNotice && (
            <div className={`access-status access-status--${statusNotice.kind}`} role="status">
              {statusNotice.kind === 'pending' ? <Clock3 size={18} aria-hidden="true" /> : <CheckCircle2 size={18} aria-hidden="true" />}
              <span>{statusNotice.message}</span>
            </div>
          )}

          {mode === 'login' ? (
            <form className="access-form" onSubmit={handleLoginSubmit} aria-busy={loading}>
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
          ) : (
            <form className="access-form" onSubmit={handleRegisterSubmit} aria-busy={loading}>
              <label htmlFor="req-name">Nombre completo</label>
              <input
                className="tonal-input"
                type="text"
                id="req-name"
                placeholder="Ej. Valeria Quispe"
                value={fullName}
                required
                maxLength={80}
                disabled={loading}
                onChange={(event) => {
                  setFullName(event.target.value)
                  setError('')
                }}
              />
              <label htmlFor="req-email">Correo electrónico</label>
              <input
                className="tonal-input"
                type="email"
                id="req-email"
                placeholder="nombre@correo.com"
                value={reqEmail}
                required
                disabled={loading}
                onChange={(event) => {
                  setReqEmail(event.target.value)
                  setError('')
                }}
              />
              <div className="access-row">
                <div>
                  <label htmlFor="req-role">Perfil solicitado</label>
                  <select
                    className="tonal-input"
                    id="req-role"
                    value={requestedRole}
                    disabled={loading}
                    onChange={(event) => setRequestedRole(event.target.value as DemoRole)}
                  >
                    <option value="student">Estudiante</option>
                    <option value="teacher">Docente</option>
                    <option value="coordinator">Coordinación</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="req-block">Bloque / Ciclo</label>
                  <select
                    className="tonal-input"
                    id="req-block"
                    value={academicBlock}
                    disabled={loading}
                    onChange={(event) => setAcademicBlock(event.target.value)}
                  >
                    {academicBlocks.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <label htmlFor="req-motivation">Objetivo de ingreso (opcional)</label>
              <input
                className="tonal-input"
                type="text"
                id="req-motivation"
                placeholder="Ej. Curso de React 19, ESP32 o Álgebra Lineal"
                value={motivation}
                maxLength={140}
                disabled={loading}
                onChange={(event) => setMotivation(event.target.value)}
              />
              {error && (
                <p className="access-error" id="access-error" role="alert">
                  {error}
                </p>
              )}
              <button type="submit" className="button button--primary tone-accent" disabled={loading}>
                {loading ? (
                  <LoadingMark label="Enviando solicitud" compact />
                ) : (
                  <>
                    <UserPlus size={18} aria-hidden="true" /> Enviar solicitud de acceso
                  </>
                )}
              </button>
            </form>
          )}

          {!managed && <DemoAccounts selectedEmail={email} loading={loading} onSelect={selectAccount} />}
        </div>
      </main>
    </div>
  )
}
