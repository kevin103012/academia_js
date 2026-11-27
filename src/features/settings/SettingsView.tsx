import { ExternalLink, Globe, GraduationCap, Palette, Plus, Save, Search, Sparkles, UserRound, Users } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { env } from '../../config/env'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { customRecordToOption, profileService, themeService, type UserProfileDetails } from '../../services'
import type { DemoUser } from '../../types/auth'
import {
  campusLanguages,
  campusPalettes,
  type CampusLanguageId,
  type CampusPaletteId,
  type CustomThemeRecord,
} from '../../types/theme'
import type { Workspace } from '../../types/workspace'
import { createId } from '../../utils/id'
import { emitLanguageChange, useCampusLanguage } from '../../utils/i18n'

interface SettingsViewProps {
  user: DemoUser
  workspace: Workspace
  notify: (message: string) => void
}

type SettingsTab = 'profile' | 'appearance' | 'language'

const settingsTabs = [
  { value: 'profile' as const, label: 'Perfil público', icon: <UserRound size={16} aria-hidden="true" /> },
  { value: 'appearance' as const, label: 'Apariencia', icon: <Palette size={16} aria-hidden="true" /> },
  { value: 'language' as const, label: 'Idioma', icon: <Globe size={16} aria-hidden="true" /> },
]

export function SettingsView({ user, workspace, notify }: SettingsViewProps) {
  const { t } = useCampusLanguage()
  const [tab, setTab] = useState<SettingsTab>('profile')
  const [activePalette, setActivePalette] = useState<CampusPaletteId>(() => themeService.getPalette())
  const [customThemes, setCustomThemes] = useState<CustomThemeRecord[]>(() => themeService.getCustomThemes())
  const [activeLanguage, setActiveLanguage] = useState<CampusLanguageId>(() => themeService.getLanguage())
  const [addingTheme, setAddingTheme] = useState(false)

  const [profile, setProfile] = useState<UserProfileDetails>({
    id: user.id,
    fullName: user.name,
    email: user.email,
    initials: user.initials,
    role: user.role,
    roleLabel: user.roleLabel,
    academicBlock: 'Ing. de Sistemas · Ciclo III',
    institution: 'SENATI · Ingeniería de Sistemas',
    bio: '',
    socialLinks: {},
    publicActivities: [],
    isProfilePublic: user.role === 'student',
    activeCourseIds: [],
    completedCourseIds: [],
  })
  const [activitiesInput, setActivitiesInput] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [directory, setDirectory] = useState<UserProfileDetails[]>([])
  const [directoryQuery, setDirectoryQuery] = useState('')

  const canAddThemes = user.role === 'coordinator' || user.role === 'admin'

  useEffect(() => {
    let active = true
    Promise.all([
      profileService.loadProfile(user),
      profileService.loadPublicDirectory(),
      themeService.loadCustomThemes(),
    ]).then(([loadedProfile, loadedDirectory, loadedThemes]) => {
      if (!active) return
      setProfile(loadedProfile)
      setActivitiesInput(loadedProfile.publicActivities.join(', '))
      setDirectory(loadedDirectory)
      setCustomThemes(loadedThemes)
    })
    return () => {
      active = false
    }
  }, [user])

  const enrolledCourses = workspace.courses.filter((c) => workspace.progress[c.id]?.enrolled && !workspace.progress[c.id]?.certifiedAt)
  const finishedCourses = workspace.courses.filter((c) => workspace.progress[c.id]?.certifiedAt)

  const allThemes = [...campusPalettes, ...customThemes.map(customRecordToOption)]

  function handleSelectPalette(paletteId: CampusPaletteId, name: string) {
    themeService.setPalette(paletteId)
    setActivePalette(paletteId)
    void profileService.savePreferences(user.id, { theme: paletteId })
    notify(`Tema «${name}» aplicado al campus.`)
  }

  async function handleAddCustomTheme(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const name = String(data.get('name') ?? '').trim()
    const description = String(data.get('description') ?? '').trim() || 'Tema personalizado institucional'
    const ivory = String(data.get('ivory') ?? '#f4f6fb')
    const ink = String(data.get('ink') ?? '#182235')
    const surf = String(data.get('surf') ?? '#0ea5e9')
    const isDarkCanvas = data.get('isDarkCanvas') === 'on'
    if (!name) return

    const record: CustomThemeRecord = {
      id: `custom-${createId()}`,
      name,
      description,
      ivory,
      ink,
      surf,
      isDarkCanvas,
    }
    const updated = await themeService.addCustomTheme(record, user.id)
    setCustomThemes(updated)
    setActivePalette(record.id)
    setAddingTheme(false)
    notify(`Tema personalizado «${name}» creado y activado.`)
  }

  function handleSelectLanguage(languageId: CampusLanguageId, label: string) {
    themeService.setLanguage(languageId)
    emitLanguageChange(languageId)
    setActiveLanguage(languageId)
    void profileService.savePreferences(user.id, { language: languageId })
    notify(`Idioma configurado en ${label}.`)
  }

  async function handleSaveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSavingProfile(true)
    const parsedActivities = activitiesInput
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
    const nextProfile: UserProfileDetails = {
      ...profile,
      publicActivities: parsedActivities,
    }
    try {
      await profileService.saveProfile(nextProfile)
      setProfile(nextProfile)
      setDirectory((prev) => {
        const withoutSelf = prev.filter((item) => item.id !== nextProfile.id)
        return nextProfile.isProfilePublic && nextProfile.role === 'student'
          ? [nextProfile, ...withoutSelf]
          : withoutSelf
      })
      notify('Cambios del perfil guardados.')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo guardar el perfil.')
    } finally {
      setSavingProfile(false)
    }
  }

  const filteredDirectory = directory.filter((item) => {
    const term = directoryQuery.trim().toLocaleLowerCase('es')
    if (!term) return true
    return `${item.fullName} ${item.academicBlock} ${item.institution} ${item.publicActivities.join(' ')}`
      .toLocaleLowerCase('es')
      .includes(term)
  })

  return (
    <section className="p-settings" aria-labelledby="settings-heading">
      <header className="p-section-heading">
        <div>
          <h1 id="settings-heading">{t.settingsTitle}</h1>
          <p>{t.settingsLead}</p>
        </div>
      </header>

      <SegmentedControl
        className="p-tabs"
        label="Secciones de configuración"
        options={settingsTabs}
        value={tab}
        onChange={setTab}
      />

      {tab === 'profile' && (
        <div className="p-profile-layout">
          <form className="p-card p-form" onSubmit={handleSaveProfile}>
            <div className="p-card-head">
              <div>
                <h2>Tu perfil visible en la comunidad</h2>
                <p className="p-meta">Comparte dónde estudiaste, cursos y redes sociales.</p>
              </div>
              <span className="p-badge tone-soft-accent">{profile.roleLabel}</span>
            </div>

            <div className="p-form-row">
              <label htmlFor="profile-fullName">
                Nombre completo
                <input
                  id="profile-fullName"
                  name="fullName"
                  value={profile.fullName}
                  required
                  maxLength={80}
                  onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                />
              </label>
              <label htmlFor="profile-academicBlock">
                Bloque / Ciclo
                <input
                  id="profile-academicBlock"
                  name="academicBlock"
                  readOnly={env.hasSupabase}
                  value={profile.academicBlock}
                  maxLength={80}
                  onChange={(e) => setProfile({ ...profile, academicBlock: e.target.value })}
                />
              </label>
            </div>

            <div className="p-form-row">
              <label htmlFor="profile-institution">
                Dónde has estudiado / Institución
                <input
                  id="profile-institution"
                  name="institution"
                  value={profile.institution}
                  placeholder="Ej. SENATI · Ingeniería de Sistemas"
                  maxLength={120}
                  onChange={(e) => setProfile({ ...profile, institution: e.target.value })}
                />
              </label>
              <label htmlFor="profile-activities">
                Actividades / Clubes (por coma)
                <input
                  id="profile-activities"
                  name="publicActivities"
                  placeholder="Hackathon ESP32, Club de Álgebra Lineal"
                  value={activitiesInput}
                  onChange={(e) => setActivitiesInput(e.target.value)}
                />
              </label>
            </div>

            <label htmlFor="profile-bio">
              Sobre ti
              <textarea
                id="profile-bio"
                name="bio"
                rows={2}
                value={profile.bio}
                placeholder="Qué tecnologías estudias o en qué proyectos buscas colaborar."
                maxLength={320}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              />
            </label>

            <div className="p-form-row">
              <label htmlFor="profile-github">
                GitHub
                <input
                  id="profile-github"
                  name="github"
                  type="url"
                  placeholder="https://github.com/usuario"
                  value={profile.socialLinks.github ?? ''}
                  onChange={(e) =>
                    setProfile({ ...profile, socialLinks: { ...profile.socialLinks, github: e.target.value } })
                  }
                />
              </label>
              <label htmlFor="profile-linkedin">
                LinkedIn
                <input
                  id="profile-linkedin"
                  name="linkedin"
                  type="url"
                  placeholder="https://linkedin.com/in/usuario"
                  value={profile.socialLinks.linkedin ?? ''}
                  onChange={(e) =>
                    setProfile({ ...profile, socialLinks: { ...profile.socialLinks, linkedin: e.target.value } })
                  }
                />
              </label>
            </div>

            <div className="p-form-row">
              <label htmlFor="profile-instagram">
                Instagram
                <input
                  id="profile-instagram"
                  name="instagram"
                  type="url"
                  placeholder="https://instagram.com/usuario"
                  value={profile.socialLinks.instagram ?? ''}
                  onChange={(e) =>
                    setProfile({ ...profile, socialLinks: { ...profile.socialLinks, instagram: e.target.value } })
                  }
                />
              </label>
              <label htmlFor="profile-portfolio">
                Portafolio web
                <input
                  id="profile-portfolio"
                  name="portfolio"
                  type="url"
                  placeholder="https://tu-portafolio.dev"
                  value={profile.socialLinks.portfolio ?? ''}
                  onChange={(e) =>
                    setProfile({ ...profile, socialLinks: { ...profile.socialLinks, portfolio: e.target.value } })
                  }
                />
              </label>
            </div>

            <label className="p-checkbox-row" htmlFor="profile-isPublic">
              <input
                id="profile-isPublic"
                name="isProfilePublic"
                type="checkbox"
                checked={profile.isProfilePublic}
                onChange={(e) => setProfile({ ...profile, isProfilePublic: e.target.checked })}
              />
              <span>Visible para compañeros en el directorio público</span>
            </label>

            {user.role === 'student' && (
              <div className="p-profile-courses-box">
                <div>
                  <strong>En progreso ({enrolledCourses.length})</strong>
                  <div className="p-tag-wrap">
                    {enrolledCourses.length ? (
                      enrolledCourses.map((c) => (
                        <span className="p-badge tone-soft-accent" key={c.id}>
                          {c.name}
                        </span>
                      ))
                    ) : (
                      <span className="p-meta">Sin cursos activos.</span>
                    )}
                  </div>
                </div>
                <div>
                  <strong>Finalizados ({finishedCourses.length})</strong>
                  <div className="p-tag-wrap">
                    {finishedCourses.length ? (
                      finishedCourses.map((c) => (
                        <span className="p-badge" key={c.id}>
                          {c.name}
                        </span>
                      ))
                    ) : (
                      <span className="p-meta">Sin certificados aún.</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            <button type="submit" className="p-button p-button-primary" disabled={savingProfile}>
              <Save size={16} aria-hidden="true" /> {savingProfile ? 'Guardando...' : 'Guardar perfil público'}
            </button>
          </form>

          <section className="p-directory-section" aria-labelledby="public-dir-heading">
            <div className="p-manage-bar">
              <div>
                <h2 id="public-dir-heading">
                  <Users size={18} aria-hidden="true" /> Directorio público de estudiantes
                </h2>
                <p className="p-meta">Conecta con compañeros por ciclo, institución, actividades o redes.</p>
              </div>
              <label className="p-search" htmlFor="directory-search">
                <Search size={16} aria-hidden="true" />
                <input
                  id="directory-search"
                  name="directorySearch"
                  type="search"
                  placeholder="Buscar compañero o actividad"
                  value={directoryQuery}
                  onChange={(e) => setDirectoryQuery(e.target.value)}
                />
              </label>
            </div>

            <div className="p-dir-grid">
              {filteredDirectory.map((person) => {
                const peerActiveCourses = workspace.courses.filter((c) => person.activeCourseIds.includes(c.id))
                const peerCompletedCourses = workspace.courses.filter((c) => person.completedCourseIds.includes(c.id))
                return (
                  <article className="p-card p-dir-card" key={person.id}>
                    <div className="p-dir-head">
                      <span className="p-avatar">{person.initials}</span>
                      <div className="p-list-copy">
                        <strong>{person.fullName}</strong>
                        <small>{person.academicBlock}</small>
                      </div>
                    </div>
                    <p className="p-meta">
                      <GraduationCap size={15} aria-hidden="true" /> {person.institution}
                    </p>
                    {person.bio && <p className="p-dir-bio">{person.bio}</p>}
                    {(peerActiveCourses.length > 0 || peerCompletedCourses.length > 0) && (
                      <div className="p-tag-wrap">
                        {peerActiveCourses.map((course) => (
                          <span className="p-badge tone-soft-accent" key={course.id}>
                            Cursando: {course.name}
                          </span>
                        ))}
                        {peerCompletedCourses.map((course) => (
                          <span className="p-badge" key={course.id}>
                            Finalizado: {course.name}
                          </span>
                        ))}
                      </div>
                    )}
                    {person.publicActivities.length > 0 && (
                      <div className="p-tag-wrap">
                        {person.publicActivities.map((act) => (
                          <span className="p-badge" key={act}>
                            {act}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="p-social-row">
                      {person.socialLinks.github && (
                        <a href={person.socialLinks.github} target="_blank" rel="noreferrer" className="p-text-button">
                          GitHub <ExternalLink size={13} aria-hidden="true" />
                        </a>
                      )}
                      {person.socialLinks.linkedin && (
                        <a href={person.socialLinks.linkedin} target="_blank" rel="noreferrer" className="p-text-button">
                          LinkedIn <ExternalLink size={13} aria-hidden="true" />
                        </a>
                      )}
                      {person.socialLinks.instagram && (
                        <a href={person.socialLinks.instagram} target="_blank" rel="noreferrer" className="p-text-button">
                          Instagram <ExternalLink size={13} aria-hidden="true" />
                        </a>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        </div>
      )}

      {tab === 'appearance' && (
        <div className="p-theme-section">
          <div className="p-manage-bar">
            <div className="p-theme-section-head">
              <h2>Apariencia del campus</h2>
              <p>Incluye Original, Zafiro, Porcelana, GTA VI Vice, Minecraft Voxel y Tokyo Night.</p>
            </div>
            {canAddThemes && (
              <button type="button" className="p-button p-button-primary" onClick={() => setAddingTheme(!addingTheme)}>
                <Plus size={16} aria-hidden="true" /> {addingTheme ? 'Cancelar' : 'Añadir tema'}
              </button>
            )}
          </div>

          {addingTheme && canAddThemes && (
            <form className="p-card p-form p-theme-custom-form" onSubmit={handleAddCustomTheme}>
              <h2>
                <Sparkles size={17} aria-hidden="true" /> Crear nuevo tema institucional
              </h2>
              <div className="p-form-workbench">
                <div className="p-form-col">
                  <div className="p-form-row">
                    <label htmlFor="theme-name">
                      Nombre del tema
                      <input id="theme-name" name="name" required maxLength={40} placeholder="Ej. Cyber Neon" />
                    </label>
                    <label htmlFor="theme-desc">
                      Descripción breve
                      <input id="theme-desc" name="description" maxLength={80} placeholder="Azul eléctrico, obsidiana y menta" />
                    </label>
                  </div>
                  <label className="p-checkbox-row" htmlFor="theme-dark">
                    <input id="theme-dark" name="isDarkCanvas" type="checkbox" />
                    <span>Usar modo nocturno en todo el lienzo principal</span>
                  </label>
                </div>
                <div className="p-form-col">
                  <div className="p-color-row">
                    <label htmlFor="theme-ivory">
                      Base
                      <input id="theme-ivory" name="ivory" type="color" defaultValue="#f2f6ff" />
                    </label>
                    <label htmlFor="theme-ink">
                      Sidebar
                      <input id="theme-ink" name="ink" type="color" defaultValue="#111827" />
                    </label>
                    <label htmlFor="theme-surf">
                      Acento
                      <input id="theme-surf" name="surf" type="color" defaultValue="#06b6d4" />
                    </label>
                  </div>
                  <div className="p-actions-row">
                    <button type="submit" className="p-button p-button-primary">
                      Guardar y activar tema
                    </button>
                    <button type="button" className="p-button" onClick={() => setAddingTheme(false)}>
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            </form>
          )}

          <div className="p-theme-grid" role="radiogroup" aria-label="Paleta de colores del campus">
            {allThemes.map((palette) => {
              const selected = activePalette === palette.id
              const { preview } = palette
              return (
                <button
                  key={palette.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className="p-theme-card"
                  onClick={() => handleSelectPalette(palette.id, palette.name)}
                >
                  <div
                    className="p-theme-preview"
                    aria-hidden="true"
                    style={{ background: preview.canvas, borderColor: preview.border }}
                  >
                    <div className="p-tp-sidebar" style={{ background: preview.sidebar }}>
                      <div className="p-tp-brand">
                        <span style={{ background: preview.accent }} />
                        <span style={{ background: preview.sidebarMuted, width: 22 }} />
                      </div>
                      <div className="p-tp-nav">
                        <span style={{ background: preview.sidebarMuted, width: '74%' }} />
                        <span style={{ background: preview.sidebarMuted, width: '62%' }} />
                        <span style={{ background: preview.sidebarMuted, width: '68%' }} />
                      </div>
                    </div>

                    <div className="p-tp-body">
                      <div
                        className="p-tp-topbar"
                        style={{ background: preview.topbar, borderBottomColor: preview.border }}
                      >
                        <span style={{ background: preview.border, width: 28 }} />
                        <span style={{ background: preview.sidebarMuted, width: 5, height: 5, borderRadius: '50%' }} />
                      </div>

                      <div className="p-tp-main">
                        <div className="p-tp-hero" style={{ background: preview.heroBg, borderColor: preview.border }}>
                          <span style={{ background: preview.heroLine, width: '58%', height: 6 }} />
                          <span style={{ background: preview.heroSub, width: '76%', height: 4 }} />
                          <span className="p-tp-cta" style={{ background: preview.accent }} />
                        </div>

                        <div className="p-tp-side" style={{ background: preview.cardBg, borderColor: preview.border }}>
                          <span style={{ background: preview.accent, width: 7, height: 7, borderRadius: '50%' }} />
                          <span style={{ background: preview.heroSub, width: '80%', height: 4 }} />
                          <span style={{ background: preview.border, width: '65%', height: 4 }} />
                        </div>
                      </div>

                      <div className="p-tp-stats" style={{ background: preview.cardBg, borderColor: preview.border }}>
                        <span style={{ background: preview.border }} />
                        <span style={{ background: preview.border }} />
                        <span style={{ background: preview.border }} />
                      </div>
                    </div>
                  </div>

                  <div className="p-theme-card-foot">
                    <div>
                      <strong>
                        {palette.name} {palette.isCustom && <span className="p-badge">Personalizado</span>}
                      </strong>
                      <small>{palette.description}</small>
                    </div>
                    <span className="p-theme-radio" aria-hidden="true">
                      {selected && <i />}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {tab === 'language' && (
        <div className="p-theme-section">
          <div className="p-theme-section-head">
            <h2>{t.languageSectionTitle}</h2>
            <p>{t.languageSectionLead}</p>
          </div>
          <div className="p-lang-grid" role="radiogroup" aria-label="Idioma del campus">
            {campusLanguages.map((lang) => {
              const selected = activeLanguage === lang.id
              return (
                <button
                  key={lang.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className="p-theme-card"
                  onClick={() => handleSelectLanguage(lang.id, lang.label)}
                >
                  <div className="p-theme-card-foot">
                    <div>
                      <strong>{lang.nativeName}</strong>
                      <small>{lang.region}</small>
                    </div>
                    <span className="p-theme-radio" aria-hidden="true">
                      {selected && <i />}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
