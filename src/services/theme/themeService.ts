import type { CampusPaletteId } from '../../types/theme'
import { localStore } from '../storage/localStore'

const PALETTE_KEY = 'junior-sparks:palette:v1'

function isPaletteId(value: string | null): value is CampusPaletteId {
  return value === 'original' || value === 'zafiro' || value === 'porcelana'
}

export const themeService = {
  getPalette(): CampusPaletteId {
    const saved = localStore.getText(PALETTE_KEY)
    return isPaletteId(saved) ? saved : 'original'
  },

  setPalette(palette: CampusPaletteId): CampusPaletteId {
    localStore.setText(PALETTE_KEY, palette)
    document.documentElement.dataset.palette = palette
    return palette
  },

  init(): CampusPaletteId {
    const current = this.getPalette()
    document.documentElement.dataset.palette = current
    return current
  },
}
