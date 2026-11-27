import { env } from '../../config/env'
import {
  campusPalettes,
  type CampusLanguageId,
  type CampusPaletteId,
  type CampusPaletteOption,
  type CustomThemeRecord,
} from '../../types/theme'
import { localStore } from '../storage/localStore'
import { getSupabaseClient } from '../supabase/supabaseClient'

const PALETTE_KEY = 'junior-sparks:palette:v2'
const CUSTOM_THEMES_KEY = 'junior-sparks:custom-themes:v1'
const LANGUAGE_KEY = 'junior-sparks:language:v1'

const builtInIds = new Set(campusPalettes.map((p) => p.id))

function applyCustomVars(theme: CustomThemeRecord | null) {
  const root = document.documentElement
  if (!theme) {
    root.style.removeProperty('--ivory')
    root.style.removeProperty('--ink')
    root.style.removeProperty('--surf')
    return
  }
  root.style.setProperty('--ivory', theme.ivory)
  root.style.setProperty('--ink', theme.ink)
  root.style.setProperty('--surf', theme.surf)
}

export function customRecordToOption(record: CustomThemeRecord): CampusPaletteOption {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    isCustom: true,
    preview: {
      sidebar: record.ink,
      sidebarMuted: record.ivory,
      canvas: record.ivory,
      topbar: record.ivory,
      heroBg: record.ink,
      heroLine: record.ivory,
      heroSub: record.surf,
      cardBg: '#ffffff',
      border: '#cbd5e1',
      accent: record.surf,
    },
  }
}

export const themeService = {
  getCustomThemes(): CustomThemeRecord[] {
    const saved = localStore.getJson<CustomThemeRecord[]>(CUSTOM_THEMES_KEY)
    return Array.isArray(saved) ? saved : []
  },

  async loadCustomThemes(): Promise<CustomThemeRecord[]> {
    const cached = this.getCustomThemes()
    const supabase = env.hasSupabase ? getSupabaseClient() : null
    if (!supabase) return cached

    const { data, error } = await supabase.from('custom_themes').select('*').eq('is_active', true)
    if (error || !data) return cached

    const remote: CustomThemeRecord[] = data.map((row) => {
      const palette = (row.palette ?? {}) as Partial<CustomThemeRecord>
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        ivory: palette.ivory || '#f4f6fb',
        ink: palette.ink || '#182235',
        surf: palette.surf || '#0ea5e9',
        isDarkCanvas: Boolean(palette.isDarkCanvas),
      }
    })
    localStore.setJson(CUSTOM_THEMES_KEY, remote)
    return remote
  },

  async addCustomTheme(record: CustomThemeRecord, createdBy?: string): Promise<CustomThemeRecord[]> {
    const existing = this.getCustomThemes().filter((item) => item.id !== record.id)
    const next = [...existing, record]
    localStore.setJson(CUSTOM_THEMES_KEY, next)

    const supabase = env.hasSupabase ? getSupabaseClient() : null
    if (supabase) {
      await supabase.from('custom_themes').upsert(
        {
          id: record.id,
          name: record.name,
          description: record.description,
          palette: { ivory: record.ivory, ink: record.ink, surf: record.surf, isDarkCanvas: record.isDarkCanvas },
          created_by: createdBy ?? null,
          is_active: true,
        },
        { onConflict: 'id' },
      )
    }

    this.setPalette(record.id)
    return next
  },

  getPalette(): CampusPaletteId {
    const saved = localStore.getText(PALETTE_KEY)
    if (!saved) return 'original'
    if (builtInIds.has(saved)) return saved
    if (this.getCustomThemes().some((t) => t.id === saved)) return saved
    return 'original'
  },

  setPalette(palette: CampusPaletteId): CampusPaletteId {
    localStore.setText(PALETTE_KEY, palette)
    const root = document.documentElement

    if (builtInIds.has(palette)) {
      applyCustomVars(null)
      root.dataset.palette = palette
      return palette
    }

    const custom = this.getCustomThemes().find((t) => t.id === palette)
    if (custom) {
      root.dataset.palette = custom.isDarkCanvas ? 'tokyo-night' : 'original'
      applyCustomVars(custom)
      return palette
    }

    applyCustomVars(null)
    root.dataset.palette = 'original'
    return 'original'
  },

  init(): CampusPaletteId {
    const current = this.getPalette()
    return this.setPalette(current)
  },

  getLanguage(): CampusLanguageId {
    const saved = localStore.getText(LANGUAGE_KEY)
    if (saved === 'es' || saved === 'en' || saved === 'pt') return saved
    return 'es'
  },

  setLanguage(lang: CampusLanguageId): CampusLanguageId {
    localStore.setText(LANGUAGE_KEY, lang)
    document.documentElement.lang = lang
    return lang
  },
}
