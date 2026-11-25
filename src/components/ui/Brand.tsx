import { Link } from 'react-router'
import { paths } from '../../routes/paths'

export function Brand({ className = '' }: { className?: string }) {
  return (
    <Link to={paths.home} className={`brand ${className}`} aria-label="Junior’s Sparks, inicio">
      <img src="/media/logo.png" alt="Junior’s Sparks" width="1220" height="250" />
    </Link>
  )
}
