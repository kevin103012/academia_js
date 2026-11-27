import { useState, type FormEvent } from 'react'
import type { CommunityGroup, GroupDetails } from '../../types/community'
import { initials } from '../../utils/text'

interface GroupAdminPanelProps {
  group: CommunityGroup
  userId: string
  onEdit: (details: GroupDetails) => void
  onRemoveMember: (memberId: string) => void
  onDelete: () => void
}

export function GroupAdminPanel({ group, userId, onEdit, onRemoveMember, onDelete }: GroupAdminPanelProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const value = (key: string) => String(data.get(key) ?? '').trim()
    onEdit({ name: value('name'), description: value('description'), pinnedNote: value('pinnedNote') })
  }

  return (
    <div className="comm-admin">
      <form className="p-form p-form-plain" onSubmit={submit}>
        <label>
          Nombre del grupo
          <input name="name" required maxLength={120} defaultValue={group.name} />
        </label>
        <label>
          Descripción
          <textarea name="description" rows={2} required maxLength={300} defaultValue={group.description} />
        </label>
        <label>
          Nota fijada
          <input name="pinnedNote" maxLength={200} defaultValue={group.pinnedNote} />
        </label>
        <button type="submit" className="p-button p-button-primary">
          Guardar cambios
        </button>
      </form>

      <h3>Integrantes registrados ({group.members.length})</h3>
      <div>
        {group.members.map((member) => (
          <div className="p-person" key={member.userId}>
            <span className="p-avatar">{initials(member.name)}</span>
            <div className="p-list-copy">
              <strong>{member.name}</strong>
              {member.userId === userId && <small>Administras este grupo</small>}
            </div>
            {member.userId !== userId && (
              <button
                type="button"
                className="p-button p-button-short tone-danger"
                aria-label={`Quitar a ${member.name}`}
                onClick={() => onRemoveMember(member.userId)}
              >
                Quitar
              </button>
            )}
          </div>
        ))}
      </div>

      {group.createdById === userId && (
        <button
          type="button"
          className="p-button tone-danger"
          onClick={() => (confirmDelete ? onDelete() : setConfirmDelete(true))}
        >
          {confirmDelete ? 'Confirmar: eliminar grupo y sus mensajes' : 'Eliminar grupo'}
        </button>
      )}
    </div>
  )
}
