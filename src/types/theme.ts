export type CampusPaletteId = 'original' | 'zafiro' | 'porcelana'

export interface CampusPaletteOption {
  id: CampusPaletteId
  name: string
  description: string
  preview: {
    sidebar: string
    sidebarMuted: string
    canvas: string
    topbar: string
    heroBg: string
    heroLine: string
    heroSub: string
    cardBg: string
    border: string
    accent: string
  }
}

export const campusPalettes: CampusPaletteOption[] = [
  {
    id: 'original',
    name: 'Original',
    description: 'Marfil, negro y turquesa',
    preview: {
      sidebar: '#151515',
      sidebarMuted: '#4e4c47',
      canvas: '#eee3cc',
      topbar: '#f7f0e0',
      heroBg: '#151515',
      heroLine: '#eee3cc',
      heroSub: '#6b675f',
      cardBg: '#f6efdf',
      border: '#d5cbb5',
      accent: '#00c2b5',
    },
  },
  {
    id: 'zafiro',
    name: 'Zafiro',
    description: 'Azul zafiro, perla y naranja',
    preview: {
      sidebar: '#0f2447',
      sidebarMuted: '#475e85',
      canvas: '#f1f0ec',
      topbar: '#faf9f7',
      heroBg: '#faf9f7',
      heroLine: '#0f2447',
      heroSub: '#737c8d',
      cardBg: '#faf9f7',
      border: '#d6dce6',
      accent: '#ff5a12',
    },
  },
  {
    id: 'porcelana',
    name: 'Porcelana',
    description: 'Blanco, pizarra y violeta',
    preview: {
      sidebar: '#f1f4f9',
      sidebarMuted: '#8592a6',
      canvas: '#ffffff',
      topbar: '#f8fafc',
      heroBg: '#ede9fe',
      heroLine: '#1e293b',
      heroSub: '#64748b',
      cardBg: '#ffffff',
      border: '#dfe5f0',
      accent: '#7c3aed',
    },
  },
]
