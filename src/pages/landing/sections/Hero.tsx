import { ArrowDown } from 'lucide-react'
import { Link } from 'react-router'

interface HeroProps {
  accessHref: string
  signedIn: boolean
}

export function Hero({ accessHref, signedIn }: HeroProps) {
  return (
    <section className="hero theme-dark" aria-labelledby="hero-heading">
      <div className="hero__visual" data-visual>
        <img
          src="/media/hero.jpg"
          width="1600"
          height="900"
          fetchPriority="high"
          alt="Dos estudiantes prueban un circuito en un taller escolar."
        />
      </div>
      <div className="hero__content wrap view-enter" data-enter>
        <h1 id="hero-heading">
          <span>Enciende las</span> <span>ganas de</span> <em>aprender.</em>
        </h1>
        <p>
          Explora cursos, practica a tu ritmo y acompaña cada avance en un campus digital con cuatro perfiles de prueba.
        </p>
        <div className="hero__actions">
          <Link className="button button--primary tone-accent" to={accessHref}>
            {signedIn ? 'Ir al campus' : 'Probar el campus'}
          </Link>
          <a className="hero__explore tone-pill" href="#plataforma">
            <ArrowDown size={17} aria-hidden="true" /> Conoce la plataforma
          </a>
        </div>
      </div>
    </section>
  )
}
