import { Link } from 'react-router'
import { paths } from '../../routes/paths'
import { SparksWordmark } from './SparksLogo'

export function Brand({ className = '' }: { className?: string }) {
  return (
    <Link to={paths.home} className={`brand ${className}`} aria-label="Junior’s Sparks, inicio">
      <SparksWordmark />
    </Link>
  )
}
