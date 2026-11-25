import { useAuth } from '../../hooks/useAuth'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { paths } from '../../routes/paths'
import { Hero } from './sections/Hero'
import { PlatformSection } from './sections/PlatformSection'
import { RolesSection } from './sections/RolesSection'
import { SiteFooter } from './sections/SiteFooter'
import { SiteHeader } from './sections/SiteHeader'

export function LandingPage() {
  useDocumentTitle('Junior’s Sparks | Campus digital')
  const { user } = useAuth()
  const signedIn = Boolean(user)
  const accessHref = signedIn ? paths.campus : paths.signIn

  return (
    <>
      <a className="skip-link" href="#contenido">Saltar al contenido</a>
      <SiteHeader accessHref={accessHref} signedIn={signedIn} />
      <main id="contenido">
        <Hero accessHref={accessHref} signedIn={signedIn} />
        <PlatformSection />
        <RolesSection />
      </main>
      <SiteFooter accessHref={accessHref} signedIn={signedIn} />
    </>
  )
}
