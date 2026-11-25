import { Bell, ChevronDown, ClipboardCheck, LogOut, Menu, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { LoadingMark } from '../../../components/ui/LoadingMark'
import { useAuth } from '../../../hooks/useAuth'
import { useWorkspace } from '../../../hooks/useWorkspace'
import { paths } from '../../../routes/paths'
import type { LearningEntry } from '../../../types/learning'
import { ActivityView } from '../../activities/ActivityView'
import { AiControlView } from '../../ai/AiControlView'
import { AttendanceView } from '../../community/AttendanceView'
import { CalendarView } from '../../community/CalendarView'
import { CommunityView } from '../../community/CommunityView'
import { NoticesView } from '../../community/NoticesView'
import Learning from '../../learning/Learning'
import { ManageView } from '../../management/ManageView'
import { ReportsView } from '../../management/ReportsView'
import { SettingsView } from '../../settings/SettingsView'
import Tutor from '../../tutor/Tutor'
import { HomeView } from '../home/HomeView'
import { homeView, navTreeByRole, viewsByRole, type AiSectionId, type CampusPageId, type CommunitySectionId } from '../navigation'
import '../../../styles/portal.css'

interface CampusShellProps {
  notice?: string
  onNotify: (message?: string) => void
}

export function CampusShell({ notice, onNotify }: CampusShellProps) {
  const { user, signOut } = useAuth()
  const { workspace, loaded, storageError, commit } = useWorkspace()
  const navigateRouter = useNavigate()
  const [page, setPage] = useState<CampusPageId>(() =>
    window.location.hash === '#configuracion' ? 'settings' : 'home',
  )
  const [courseSelection, setCourseSelection] = useState<string>()
  const [menuOpen, setMenuOpen] = useState(false)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ 'ai-group': true, 'community-group': true })
  const mainRef = useRef<HTMLElement>(null)
  const menuRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => onNotify(undefined), 4400)
    return () => window.clearTimeout(timer)
  }, [notice, onNotify])

  useEffect(() => {
    if (!menuOpen) return
    function dismiss(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      setMenuOpen(false)
      menuRef.current?.focus()
    }
    window.addEventListener('keydown', dismiss)
    return () => window.removeEventListener('keydown', dismiss)
  }, [menuOpen])

  if (!user) return null
  if (!loaded) {
    return (
      <main className="campus-loading">
        <LoadingMark label="Cargando el campus" />
      </main>
    )
  }

  const views = viewsByRole[user.role] ?? [homeView]
  const navTree = navTreeByRole[user.role] ?? [{ kind: 'item', item: homeView }]
  const currentView = views.find((view) => view.id === page) ?? homeView

  function navigate(next: CampusPageId, courseId?: string) {
    if (!views.some((view) => view.id === next)) return
    setPage(next)
    setCourseSelection(courseId)
    setMenuOpen(false)
    if (next.startsWith('ai-')) {
      setOpenGroups((prev) => ({ ...prev, 'ai-group': true }))
    }
    if (next.startsWith('community-')) {
      setOpenGroups((prev) => ({ ...prev, 'community-group': true }))
    }
    if (next === 'settings') {
      window.history.replaceState(null, '', '#configuracion')
    } else if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname)
    }
    window.scrollTo({ top: 0, behavior: 'instant' })
    mainRef.current?.focus({ preventScroll: true })
  }

  function toggleGroup(groupId: string) {
    setOpenGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }))
  }

  async function handleLogout() {
    await signOut()
    navigateRouter(paths.signIn)
  }

  function saveProgress(courseId: string, entry: LearningEntry) {
    const name = workspace.courses.find((course) => course.id === courseId)?.name ?? 'un curso'
    const before = workspace.progress[courseId]
    const description =
      entry.certifiedAt && !before?.certifiedAt
        ? 'Obtuvo un certificado en '
        : !before?.enrolled
          ? 'Se matriculó en '
          : 'Actualizó su progreso en '
    commit(description + name, (current) => ({
      ...current,
      progress: { ...current.progress, [courseId]: entry },
    }))
  }

  const sharedProps = { user, workspace, commit }
  const renderAiSection = (section: AiSectionId) => (
    <AiControlView
      section={section}
      onNavigateSection={(next) => navigate(next)}
      commit={commit}
      notify={(message) => onNotify(message)}
    />
  )

  const renderCommunitySection = (section: CommunitySectionId) => (
    <CommunityView
      user={user}
      section={section}
      onNavigateSection={(next) => navigate(next)}
      commit={commit}
      notify={(message) => onNotify(message)}
    />
  )

  const content = {
    home: <HomeView user={user} workspace={workspace} navigate={navigate} />,
    learning: (
      <Learning
        key={courseSelection ?? 'catalog'}
        courses={workspace.courses}
        progress={workspace.progress}
        onProgress={saveProgress}
        canLearn={user.role === 'student'}
        studentName={user.name}
        initialCourse={courseSelection}
        notify={(message) => onNotify(message)}
      />
    ),
    activities: <ActivityView {...sharedProps} />,
    attendance: <AttendanceView {...sharedProps} />,
    calendar: <CalendarView {...sharedProps} />,
    notices: <NoticesView {...sharedProps} />,
    manage: <ManageView {...sharedProps} />,
    'ai-neural': renderAiSection('ai-neural'),
    'ai-trained': renderAiSection('ai-trained'),
    'ai-access': renderAiSection('ai-access'),
    'community-discover': renderCommunitySection('community-discover'),
    'community-mine': renderCommunitySection('community-mine'),
    reports: <ReportsView workspace={workspace} />,
    tutor: <Tutor user={user} />,
    settings: <SettingsView notify={(message) => onNotify(message)} />,
  }[currentView.id]

  return (
    <div className="p-shell">
      <a className="p-skip" href="#portal-content">
        Saltar al contenido
      </a>
      <aside className={`p-sidebar theme-dark${menuOpen ? ' p-sidebar-open' : ''}`} id="portal-sidebar">
        <button className="p-brand" aria-label="Junior’s Sparks, volver a resumen" onClick={() => navigate('home')}>
          <img src="/media/mark.png" alt="" width="43" height="43" />
          <span>
            Junior’s
            <br />
            Sparks
          </span>
        </button>
        <nav aria-label="Espacio académico">
          {navTree.map((node) => {
            if (node.kind === 'item') {
              const { id, label, icon: Icon } = node.item
              return (
                <button
                  className="p-nav"
                  key={id}
                  aria-current={currentView.id === id ? 'page' : undefined}
                  onClick={() => navigate(id)}
                >
                  <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
                  <span>{label}</span>
                </button>
              )
            }

            const { group } = node
            const GroupIcon = group.icon
            const hasActiveChild = group.children.some((child) => child.id === currentView.id)
            const isOpen = openGroups[group.id] ?? hasActiveChild

            return (
              <div className="p-nav-group" key={group.id}>
                <button
                  type="button"
                  className="p-nav p-nav-group-trigger"
                  aria-expanded={isOpen}
                  aria-controls={group.id}
                  data-group-active={hasActiveChild || undefined}
                  onClick={() => toggleGroup(group.id)}
                >
                  <GroupIcon size={19} strokeWidth={1.8} aria-hidden="true" />
                  <span>{group.label}</span>
                  <ChevronDown size={16} className="p-nav-chevron" aria-hidden="true" />
                </button>
                <div className="p-nav-sub" id={group.id} hidden={!isOpen}>
                  {group.children.map((child) => {
                    const ChildIcon = child.icon
                    return (
                      <button
                        type="button"
                        className="p-nav p-nav-sub-item"
                        key={child.id}
                        aria-current={currentView.id === child.id ? 'page' : undefined}
                        onClick={() => navigate(child.id)}
                      >
                        <ChildIcon size={16} strokeWidth={1.8} aria-hidden="true" />
                        <span>{child.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </nav>
        <div className="p-sidebar-bottom">
          <div className="p-demo-label">
            <span /> Entorno de prueba
          </div>
          <button className="p-nav p-sign-out" onClick={handleLogout}>
            <LogOut size={19} aria-hidden="true" /> Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="p-main">
        <header className="p-topbar">
          <div className="p-breadcrumb">
            <button
              ref={menuRef}
              className="p-icon-button p-menu-button"
              aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
              aria-controls="portal-sidebar"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <span>Espacio académico</span>
            {currentView.groupLabel && (
              <>
                <span className="p-breadcrumb-line" aria-hidden="true" />
                <span>{currentView.groupLabel}</span>
              </>
            )}
            <span className="p-breadcrumb-line" aria-hidden="true" />
            <strong>{currentView.fullLabel ?? currentView.label}</strong>
          </div>
          <div className="p-top-actions">
            <button className="p-icon-button p-notification" aria-label="Ver avisos" onClick={() => navigate('notices')}>
              <Bell size={20} aria-hidden="true" />
              {workspace.notices.length > 0 && <span />}
            </button>
            <div className="p-user">
              <span className="p-avatar" aria-hidden="true">
                {user.initials}
              </span>
              <div>
                <strong>{user.name}</strong>
                <small>{user.roleLabel}</small>
              </div>
            </div>
            <button className="p-icon-button p-mobile-logout" onClick={handleLogout} aria-label="Cerrar sesión">
              <LogOut size={19} />
            </button>
          </div>
        </header>
        <main className="p-main-content" id="portal-content" tabIndex={-1} ref={mainRef}>
          {storageError && (
            <p className="p-warning" role="alert">
              El navegador no permite guardar los cambios. Conserva esta pestaña abierta para seguir trabajando.
            </p>
          )}
          <div className="view-enter" key={currentView.id}>
            {content}
          </div>
        </main>
      </div>
      {notice && (
        <div className="p-toast theme-dark" role="status">
          <ClipboardCheck size={20} aria-hidden="true" />
          <span>{notice}</span>
          <button className="p-icon-button" aria-label="Cerrar aviso" onClick={() => onNotify(undefined)}>
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
