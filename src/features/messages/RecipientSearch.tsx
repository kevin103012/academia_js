import { UsersRound } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { MessageContact, MessageGroup } from '../../types/messaging'
import { initials, normalizeSearchText } from '../../utils/text'

export const roleLabels: Record<MessageContact['role'], string> = { teacher: 'Docente', student: 'Estudiante' }

type Option = { kind: 'group'; group: MessageGroup } | { kind: 'person'; contact: MessageContact }

interface RecipientSearchProps {
  contacts: MessageContact[]
  groups: MessageGroup[]
  onSelect: (contact: MessageContact) => void
  onSelectGroup: (group: MessageGroup) => void
  /** Cambia cada vez que se pide un mensaje nuevo, para llevar el foco al buscador. */
  focusRequest: number
}

export function RecipientSearch({ contacts, groups, onSelect, onSelectGroup, focusRequest }: RecipientSearchProps) {
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLUListElement>(null)

  // Cada palabra buscada debe aparecer en el nombre, correo, rol o curso. Los grupos van primero.
  const terms = normalizeSearchText(query).split(/\s+/).filter(Boolean)
  const matches: Option[] = [
    ...groups
      .filter((group) => {
        const text = normalizeSearchText(`${group.label} ${group.description} grupo`)
        return terms.every((term) => text.includes(term))
      })
      .map((group): Option => ({ kind: 'group', group })),
    ...contacts
      .filter((contact) => {
        const text = normalizeSearchText(
          [contact.name, contact.email ?? '', roleLabels[contact.role], ...contact.courseNames].join(' '),
        )
        return terms.every((term) => text.includes(term))
      })
      .map((contact): Option => ({ kind: 'person', contact })),
  ]
  const active = Math.min(highlight, matches.length - 1)

  useEffect(() => {
    if (focusRequest) input.current?.focus()
  }, [focusRequest])

  const choose = (option: Option) => (option.kind === 'group' ? onSelectGroup(option.group) : onSelect(option.contact))

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      if (!matches.length) return
      const next = (active + step + matches.length) % matches.length
      setHighlight(next)
      list.current?.children[next]?.scrollIntoView({ block: 'nearest' })
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (matches[active]) choose(matches[active])
    } else if (event.key === 'Escape') {
      setQuery('')
      setHighlight(0)
    }
  }

  return (
    <div className="comm-recipient">
      <label className="comm-recipient-field">
        <span>Para:</span>
        <input
          ref={input}
          type="text"
          role="combobox"
          aria-expanded={matches.length > 0}
          aria-controls="message-recipients"
          aria-autocomplete="list"
          aria-activedescendant={matches[active] ? `recipient-${active}` : undefined}
          autoComplete="off"
          placeholder="Escribe un nombre, grupo o curso"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setHighlight(0)
          }}
          onKeyDown={onKeyDown}
        />
      </label>
      <ul className="comm-recipient-list" id="message-recipients" role="listbox" aria-label="Personas y grupos de tus cursos" ref={list}>
        {matches.map((option, index) => (
          <li
            key={option.kind === 'group' ? `group:${option.group.id}` : option.contact.id}
            id={`recipient-${index}`}
            role="option"
            aria-selected={index === active}
            onMouseMove={() => setHighlight(index)}
            onClick={() => choose(option)}
          >
            {option.kind === 'group' ? (
              <>
                <span className="p-avatar comm-group-avatar" aria-hidden="true">
                  <UsersRound size={16} />
                </span>
                <span className="comm-recipient-copy">
                  <strong>{option.group.label}</strong>
                  <small>{option.group.description}</small>
                </span>
                <span className="p-badge">Grupo</span>
              </>
            ) : (
              <>
                <span className="p-avatar" aria-hidden="true">
                  {initials(option.contact.name)}
                </span>
                <span className="comm-recipient-copy">
                  <strong>{option.contact.name}</strong>
                  {option.contact.email && <small>{option.contact.email}</small>}
                  <small>{option.contact.courseNames.join(' · ')}</small>
                </span>
                <span className="p-badge">{roleLabels[option.contact.role]}</span>
              </>
            )}
          </li>
        ))}
      </ul>
      {!matches.length && (
        <p className="comm-recipient-empty" role="status">
          No hay personas ni grupos de tus cursos que coincidan.
        </p>
      )}
    </div>
  )
}
