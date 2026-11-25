import { LockKeyhole } from 'lucide-react'
import { roleIcons } from '../../components/ui/roleIcons'
import { demoUsers } from '../../data/demoUsers'
import type { DemoUser } from '../../types/auth'

interface DemoAccountsProps {
  selectedEmail: string
  loading: boolean
  onSelect: (account: DemoUser) => void
}

export function DemoAccounts({ selectedEmail, loading, onSelect }: DemoAccountsProps) {
  return (
    <section className="demo-accounts" aria-labelledby="demo-heading">
      <h2 id="demo-heading">Cuentas de prueba</h2>
      <p>Selecciona un perfil para completar el formulario.</p>
      <div className="grid grid-cols-2 gap-2.5">
        {demoUsers.map((account) => {
          const Icon = roleIcons[account.role]
          return (
            <button
              className="demo-account tone-pill"
              type="button"
              disabled={loading}
              key={account.id}
              aria-pressed={selectedEmail === account.email}
              onClick={() => onSelect(account)}
            >
              <Icon size={17} aria-hidden="true" />
              <span>{account.roleLabel}</span>
            </button>
          )
        })}
      </div>
      <small>
        <LockKeyhole size={14} aria-hidden="true" /> El acceso y los datos de prueba se guardan en este navegador.
      </small>
    </section>
  )
}
