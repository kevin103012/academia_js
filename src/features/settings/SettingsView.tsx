import { useState } from 'react'
import { themeService } from '../../services'
import { campusPalettes, type CampusPaletteId } from '../../types/theme'

interface SettingsViewProps {
  notify: (message: string) => void
}

export function SettingsView({ notify }: SettingsViewProps) {
  const [activePalette, setActivePalette] = useState<CampusPaletteId>(() => themeService.getPalette())

  function handleSelectPalette(paletteId: CampusPaletteId, name: string) {
    themeService.setPalette(paletteId)
    setActivePalette(paletteId)
    notify(`Paleta «${name}» aplicada al campus.`)
  }

  return (
    <section className="p-settings" aria-labelledby="settings-heading">
      <header className="p-section-heading">
        <div>
          <h1 id="settings-heading">Configuración</h1>
          <p>Personaliza la apariencia visual y las preferencias de tu espacio académico.</p>
        </div>
      </header>

      <div className="p-theme-section">
        <div className="p-theme-section-head">
          <h2>Apariencia</h2>
          <p>Elige la paleta de colores de tu campus.</p>
        </div>

        <div className="p-theme-grid" role="radiogroup" aria-label="Paleta de colores del campus">
          {campusPalettes.map((palette) => {
            const selected = activePalette === palette.id
            const { preview } = palette
            return (
              <button
                key={palette.id}
                type="button"
                role="radio"
                aria-checked={selected}
                className="p-theme-card"
                onClick={() => handleSelectPalette(palette.id, palette.name)}
              >
                <div
                  className="p-theme-preview"
                  aria-hidden="true"
                  style={{ background: preview.canvas, borderColor: preview.border }}
                >
                  <div className="p-tp-sidebar" style={{ background: preview.sidebar }}>
                    <div className="p-tp-brand">
                      <span style={{ background: preview.accent }} />
                      <span style={{ background: preview.sidebarMuted, width: 22 }} />
                    </div>
                    <div className="p-tp-nav">
                      <span style={{ background: preview.sidebarMuted, width: '74%' }} />
                      <span style={{ background: preview.sidebarMuted, width: '62%' }} />
                      <span style={{ background: preview.sidebarMuted, width: '68%' }} />
                    </div>
                  </div>

                  <div className="p-tp-body">
                    <div
                      className="p-tp-topbar"
                      style={{ background: preview.topbar, borderBottomColor: preview.border }}
                    >
                      <span style={{ background: preview.border, width: 28 }} />
                      <span style={{ background: preview.sidebarMuted, width: 5, height: 5, borderRadius: '50%' }} />
                    </div>

                    <div className="p-tp-main">
                      <div
                        className="p-tp-hero"
                        style={{ background: preview.heroBg, borderColor: preview.border }}
                      >
                        <span style={{ background: preview.heroLine, width: '58%', height: 6 }} />
                        <span style={{ background: preview.heroSub, width: '76%', height: 4 }} />
                        <span
                          className="p-tp-cta"
                          style={{ background: preview.accent }}
                        />
                      </div>

                      <div
                        className="p-tp-side"
                        style={{ background: preview.cardBg, borderColor: preview.border }}
                      >
                        <span style={{ background: preview.accent, width: 7, height: 7, borderRadius: '50%' }} />
                        <span style={{ background: preview.heroSub, width: '80%', height: 4 }} />
                        <span style={{ background: preview.border, width: '65%', height: 4 }} />
                      </div>
                    </div>

                    <div
                      className="p-tp-stats"
                      style={{ background: preview.cardBg, borderColor: preview.border }}
                    >
                      <span style={{ background: preview.border }} />
                      <span style={{ background: preview.border }} />
                      <span style={{ background: preview.border }} />
                    </div>
                  </div>
                </div>

                <div className="p-theme-card-foot">
                  <div>
                    <strong>{palette.name}</strong>
                    <small>{palette.description}</small>
                  </div>
                  <span className="p-theme-radio" aria-hidden="true">
                    {selected && <i />}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
