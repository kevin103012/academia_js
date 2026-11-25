import { BookOpen, ChartNoAxesCombined, GraduationCap } from 'lucide-react'

export function PlatformSection() {
  return (
    <section className="platform theme-dark" id="plataforma" aria-labelledby="platform-heading">
      <div className="wrap platform__layout">
        <div className="platform__intro">
          <h2 id="platform-heading">Un curso, de principio a fin.</h2>
          <p>Cada curso conecta lecciones, práctica y evaluación para que siempre sepas qué aprendiste y qué sigue.</p>
          <a className="text-link" href="#perfiles">Explora los perfiles</a>
        </div>
        <div className="platform__steps">
          <div>
            <BookOpen aria-hidden="true" />
            <p>
              <strong>Elige un curso</strong>
              <span>Encuentra temas que te interesen e inscríbete desde el catálogo.</span>
            </p>
          </div>
          <div>
            <ChartNoAxesCombined aria-hidden="true" />
            <p>
              <strong>Ve tu progreso</strong>
              <span>Completa lecciones, practica con evaluaciones y revisa tus resultados.</span>
            </p>
          </div>
          <div>
            <GraduationCap aria-hidden="true" />
            <p>
              <strong>Celebra lo aprendido</strong>
              <span>Descarga un certificado de demostración al completar un curso.</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
