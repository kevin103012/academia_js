import { useState } from 'react'
import { LogOut, MessageSquare, Search, UserPlus, Users } from 'lucide-react'
import { isManager, isMember } from '../../services'
import type { DemoUser } from '../../types/auth'
import type { CommunityGroup } from '../../types/community'
import { courseCategories, type CourseCategoryId } from '../../types/workspace'
import { normalizeSearchText } from '../../utils/text'

interface DiscoverCommunitiesSubmoduleProps {
  user: DemoUser
  groups: CommunityGroup[]
  onJoinGroup: (groupId: string) => void
  onLeaveGroup: (groupId: string) => void
  onOpenChat: (groupId: string) => void
}

export function DiscoverCommunitiesSubmodule({
  user,
  groups,
  onJoinGroup,
  onLeaveGroup,
  onOpenChat,
}: DiscoverCommunitiesSubmoduleProps) {
  const [categoryFilter, setCategoryFilter] = useState<'all' | CourseCategoryId>('all')
  const [onlyAvailable, setOnlyAvailable] = useState(false)
  const [query, setQuery] = useState('')

  const normalized = normalizeSearchText(query.trim())
  const filtered = groups.filter((group) => {
    const matchesCat = categoryFilter === 'all' || group.category === categoryFilter
    const matchesAvail = !onlyAvailable || !isMember(group, user.id)
    const matchesQuery =
      !normalized ||
      normalizeSearchText(`${group.name} ${group.description} ${group.tags.join(' ')} ${group.categoryLabel}`).includes(
        normalized,
      )
    return matchesCat && matchesAvail && matchesQuery
  })

  return (
    <div className="comm-root">
      <div className="comm-filter-bar">
        <div className="comm-category-pills" role="group" aria-label="Filtrar comunidades por categoría">
          <button
            type="button"
            className={`comm-pill-btn ${categoryFilter === 'all' ? 'tone-soft-accent' : 'tone-pill'}`}
            aria-pressed={categoryFilter === 'all'}
            onClick={() => setCategoryFilter('all')}
          >
            Todas ({groups.length})
          </button>
          {courseCategories.map((cat) => {
            const count = groups.filter((g) => g.category === cat.id).length
            return (
              <button
                key={cat.id}
                type="button"
                className={`comm-pill-btn ${categoryFilter === cat.id ? 'tone-soft-accent' : 'tone-pill'}`}
                aria-pressed={categoryFilter === cat.id}
                onClick={() => setCategoryFilter(cat.id)}
              >
                {cat.shortLabel} ({count})
              </button>
            )
          })}
          <button
            type="button"
            className={`comm-pill-btn ${onlyAvailable ? 'tone-soft-accent' : 'tone-pill'}`}
            aria-pressed={onlyAvailable}
            onClick={() => setOnlyAvailable((v) => !v)}
          >
            Disponibles para unirse
          </button>
        </div>

        <label className="comm-search-box">
          <Search size={15} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar grupo, tema o #tag"
            aria-label="Buscar grupo o tema"
          />
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="p-card p-empty">
          <Users size={26} aria-hidden="true" />
          <p>No encontramos comunidades con ese filtro.</p>
          <button
            type="button"
            className="p-button tone-pill"
            onClick={() => {
              setCategoryFilter('all')
              setOnlyAvailable(false)
              setQuery('')
            }}
          >
            Mostrar todas
          </button>
        </div>
      ) : (
        <div className="comm-grid">
          {filtered.map((group) => (
            <article className="comm-card" key={group.id}>
              <div>
                <div className="comm-card-head">
                  <span className="p-badge tone-soft-accent">
                    {courseCategories.find((c) => c.id === group.category)?.shortLabel ?? group.categoryLabel}
                  </span>
                  {group.period && <span className="p-badge">Curso · {group.period}</span>}
                  {isManager(group, user) && <span className="p-badge">Administras</span>}
                  <span className="comm-online">
                    <i aria-hidden="true" /> {group.onlineCount} en línea
                  </span>
                </div>
                <h2 style={{ marginTop: 8 }}>{group.name}</h2>
                <p style={{ marginTop: 4 }}>{group.description}</p>
              </div>

              <div className="comm-tags">
                {group.tags.map((tag) => (
                  <span className="comm-tag" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>

              <div>
                <div className="comm-meta-row">
                  <span>{group.memberCount} miembros</span>
                  <span>Mentor: {group.mentorName}</span>
                </div>
                <div className="comm-card-actions" style={{ marginTop: 10 }}>
                  {isMember(group, user.id) ? (
                    <>
                      <button
                        type="button"
                        className="p-button tone-soft-accent"
                        onClick={() => onOpenChat(group.id)}
                      >
                        <MessageSquare size={15} aria-hidden="true" /> Ir al chat
                      </button>
                      {!isManager(group, user) && (
                        <button
                          type="button"
                          className="p-button p-button-short tone-pill"
                          onClick={() => onLeaveGroup(group.id)}
                        >
                          <LogOut size={14} aria-hidden="true" /> Salir
                        </button>
                      )}
                    </>
                  ) : (
                    <button
                      type="button"
                      className="p-button tone-accent"
                      onClick={() => onJoinGroup(group.id)}
                    >
                      <UserPlus size={15} aria-hidden="true" /> Unirme al grupo
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
