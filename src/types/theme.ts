export type BuiltInPaletteId = 'original' | 'zafiro' | 'porcelana' | 'gta-vi' | 'minecraft' | 'tokyo-night'
export type CampusPaletteId = BuiltInPaletteId | (string & {})

export type CampusLanguageId = 'es' | 'en' | 'pt'

export interface CampusLanguageOption {
  id: CampusLanguageId
  label: string
  nativeName: string
  region: string
}

export const campusLanguages: CampusLanguageOption[] = [
  { id: 'es', label: 'Español', nativeName: 'Español (Latinoamérica)', region: 'Idioma principal de cursos y comunidad' },
  { id: 'en', label: 'English', nativeName: 'English (International)', region: 'Technical terms and interface labels' },
  { id: 'pt', label: 'Português', nativeName: 'Português (Brasil)', region: 'Compatível com intercâmbio acadêmico' },
]

export interface CampusPaletteOption {
  id: CampusPaletteId
  name: string
  description: string
  isCustom?: boolean
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

export interface CustomThemeRecord {
  id: string
  name: string
  description: string
  ivory: string
  ink: string
  surf: string
  isDarkCanvas?: boolean
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
  {
    id: 'gta-vi',
    name: 'GTA VI Vice',
    description: 'Ocaso neón magenta, púrpura y cian',
    preview: {
      sidebar: '#1b102c',
      sidebarMuted: '#8d6bb8',
      canvas: '#f9eff7',
      topbar: '#fff7fc',
      heroBg: '#23133b',
      heroLine: '#ffe3f6',
      heroSub: '#b894d6',
      cardBg: '#ffffff',
      border: '#ead3e9',
      accent: '#ff2e93',
    },
  },
  {
    id: 'minecraft',
    name: 'Minecraft Voxel',
    description: 'Piedra musgo, roble y esmeralda',
    preview: {
      sidebar: '#23201b',
      sidebarMuted: '#787166',
      canvas: '#edf2e8',
      topbar: '#f6f9f2',
      heroBg: '#273524',
      heroLine: '#f2f7ec',
      heroSub: '#8ca183',
      cardBg: '#f9fbf6',
      border: '#ccd8c1',
      accent: '#2fb84d',
    },
  },
  {
    id: 'tokyo-night',
    name: 'Tokyo Night',
    description: 'Pizarra nocturna, azul neón y lavanda',
    preview: {
      sidebar: '#16161e',
      sidebarMuted: '#565f89',
      canvas: '#1a1b26',
      topbar: '#1f2335',
      heroBg: '#24283b',
      heroLine: '#c0caf5',
      heroSub: '#7aa2f7',
      cardBg: '#1f2335',
      border: '#2f3549',
      accent: '#7aa2f7',
    },
  },
]
