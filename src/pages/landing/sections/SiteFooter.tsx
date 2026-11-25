import { Link } from 'react-router'
import { Brand } from '../../../components/ui/Brand'

interface SiteFooterProps {
  accessHref: string
  signedIn: boolean
}

export function SiteFooter({ accessHref, signedIn }: SiteFooterProps) {
  return (
    <footer className="site-footer theme-dark">
      <div className="wrap site-footer__inner">
        <Brand />
        <span>Campus digital de demostración</span>
        <Link to={accessHref}>{signedIn ? 'Ir al campus' : 'Iniciar sesión'}</Link>
      </div>
    </footer>
  )
}
