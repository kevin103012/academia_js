import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { Link } from 'react-router'
import { Brand } from '../../../components/ui/Brand'

interface SiteHeaderProps {
  accessHref: string
  signedIn: boolean
}

export function SiteHeader({ accessHref, signedIn }: SiteHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="site-header theme-dark" id="inicio">
      <div className="site-header__inner wrap">
        <Brand />
        <button
          type="button"
          className="site-menu-toggle tone-pill"
          aria-expanded={menuOpen}
          aria-controls="site-nav"
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X /> : <Menu />}
        </button>
        <nav className={`site-nav${menuOpen ? ' site-nav--open' : ''}`} id="site-nav" aria-label="Navegación principal">
          <a href="#plataforma" onClick={() => setMenuOpen(false)}>La plataforma</a>
          <a href="#perfiles" onClick={() => setMenuOpen(false)}>Perfiles</a>
          <Link className="button button--header tone-pill" to={accessHref} onClick={() => setMenuOpen(false)}>
            {signedIn ? 'Ir al campus' : 'Iniciar sesión'}
          </Link>
        </nav>
      </div>
    </header>
  )
}
