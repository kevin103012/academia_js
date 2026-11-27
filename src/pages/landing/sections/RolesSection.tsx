import { useState } from 'react'
import { CalendarDays, CircleCheck, Sparkles } from 'lucide-react'
import { Link } from 'react-router'
import { SegmentedControl } from '../../../components/ui/SegmentedControl'
import { roleIcons } from '../../../components/ui/roleIcons'
import { paths } from '../../../routes/paths'
import { landingRoleMeta, rolePreviews } from '../landingContent'

const landingRoleOptions = landingRoleMeta.map((item) => {
  const Icon = roleIcons[item.role]
  return {
    ...item,
    icon: <Icon size={19} aria-hidden="true" />,
  }
})

export function RolesSection() {
  const [selected, setSelected] = useState(0)
  const role = landingRoleOptions[selected].role
  const preview = rolePreviews[role]
  const RoleIcon = roleIcons[role]

  return (
    <section className="roles" id="perfiles" aria-labelledby="roles-heading">
      <div className="wrap">
        <h2 id="roles-heading">Un campus. Cuatro formas de usarlo.</h2>
        <div className="roles__layout">
          <SegmentedControl
            className="roles__controls"
            label="Perfiles de demostración"
            options={landingRoleOptions}
            value={selected}
            onChange={setSelected}
            tabs
          />
          {landingRoleOptions.map((option, index) => (
            <article
              key={option.id}
              className={selected === index ? 'role-panel' : undefined}
              id={option.panelId}
              role="tabpanel"
              aria-labelledby={option.id}
              tabIndex={0}
              hidden={selected !== index}
            >
              {selected === index && (
                <>
                  <div className="role-panel__copy">
                    <h3>{option.label}</h3>
                    <p>{preview.lead}</p>
                    <ul>
                      {preview.items.map((item) => (
                        <li key={item}>
                          <CircleCheck size={16} aria-hidden="true" /> {item}
                        </li>
                      ))}
                    </ul>
                    <Link className="button button--primary tone-accent" to={`${paths.signIn}?perfil=${role}`}>
                      Probar este perfil
                    </Link>
                  </div>
                  <div className="role-preview" data-visual aria-hidden="true">
                    <div className="role-preview__bar theme-dark">
                      <Sparkles size={17} /> Mi campus <CalendarDays size={16} />
                    </div>
                    <div className="role-preview__content">
                      <RoleIcon size={30} strokeWidth={1.6} />
                      <span>{preview.title}</span>
                      <strong>{preview.subtitle}</strong>
                      {role === 'student' && (
                        <div className="role-preview__progress">
                          <i />
                        </div>
                      )}
                      <small>{preview.metric}</small>
                    </div>
                  </div>
                </>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
