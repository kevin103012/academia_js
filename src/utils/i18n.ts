import { useEffect, useState } from 'react'
import { themeService } from '../services'
import type { CampusLanguageId } from '../types/theme'

const LANGUAGE_EVENT = 'sparks:language-change'

const translations: Record<
  CampusLanguageId,
  {
    workspaceBreadcrumb: string
    signOut: string
    nav: Record<string, string>
    hello: string
    settingsTitle: string
    settingsLead: string
    languageSectionTitle: string
    languageSectionLead: string
    communitySpotlightTitle: string
    goToCommunity: string
  }
> = {
  es: {
    workspaceBreadcrumb: 'Espacio académico',
    signOut: 'Cerrar sesión',
    nav: {
      home: 'Resumen',
      learning: 'Cursos',
      activities: 'Actividades',
      calendar: 'Calendario',
      messages: 'Mensajería',
      notices: 'Avisos',
      manage: 'Administración',
      reports: 'Reportes',
      tutor: 'Tutor de estudio',
      settings: 'Configuración',
      'ai-group': 'Motor de IA',
      'ai-neural': 'Entrenamiento',
      'ai-trained': 'Modelos entrenados',
      'ai-access': 'Acceso por rol',
      'community-group': 'Comunidad',
      'community-discover': 'Buscar comunidad',
      'community-mine': 'Mi comunidad',
    },
    hello: 'Hola',
    settingsTitle: 'Configuración',
    settingsLead: 'Administra tu perfil público, apariencia del campus e idioma.',
    languageSectionTitle: 'Idioma de la plataforma',
    languageSectionLead: 'Selecciona el idioma de preferencia para tu perfil y el navegador.',
    communitySpotlightTitle: 'Comunidad técnica · Mensaje más reciente',
    goToCommunity: 'Ir a Comunidad',
  },
  en: {
    workspaceBreadcrumb: 'Academic Workspace',
    signOut: 'Sign out',
    nav: {
      home: 'Overview',
      learning: 'Courses',
      activities: 'Activities',
      calendar: 'Calendar',
      messages: 'Messages',
      notices: 'Notices',
      manage: 'Administration',
      reports: 'Reports',
      tutor: 'Study Tutor',
      settings: 'Settings',
      'ai-group': 'AI Engine',
      'ai-neural': 'Training',
      'ai-trained': 'Trained Models',
      'ai-access': 'Role Access',
      'community-group': 'Community',
      'community-discover': 'Discover Community',
      'community-mine': 'My Community',
    },
    hello: 'Hello',
    settingsTitle: 'Settings',
    settingsLead: 'Manage your public profile, campus appearance, and language.',
    languageSectionTitle: 'Platform Language',
    languageSectionLead: 'Choose the display language for your profile and workspace.',
    communitySpotlightTitle: 'Tech Community · Latest message',
    goToCommunity: 'Open Community',
  },
  pt: {
    workspaceBreadcrumb: 'Espaço Acadêmico',
    signOut: 'Sair',
    nav: {
      home: 'Resumo',
      learning: 'Cursos',
      activities: 'Atividades',
      calendar: 'Calendário',
      messages: 'Mensagens',
      notices: 'Avisos',
      manage: 'Administração',
      reports: 'Relatórios',
      tutor: 'Tutor de Estudo',
      settings: 'Configurações',
      'ai-group': 'Motor de IA',
      'ai-neural': 'Treinamento',
      'ai-trained': 'Modelos Treinados',
      'ai-access': 'Acesso por Perfil',
      'community-group': 'Comunidade',
      'community-discover': 'Explorar Comunidade',
      'community-mine': 'Minha Comunidade',
    },
    hello: 'Olá',
    settingsTitle: 'Configurações',
    settingsLead: 'Gerencie seu perfil público, aparência do campus e idioma.',
    languageSectionTitle: 'Idioma da plataforma',
    languageSectionLead: 'Escolha o idioma preferido para seu perfil e navegação.',
    communitySpotlightTitle: 'Comunidade técnica · Mensagem mais recente',
    goToCommunity: 'Ir para Comunidade',
  },
}

export function emitLanguageChange(lang: CampusLanguageId) {
  window.dispatchEvent(new CustomEvent(LANGUAGE_EVENT, { detail: lang }))
}

export function useCampusLanguage() {
  const [language, setLanguage] = useState<CampusLanguageId>(() => themeService.getLanguage())

  useEffect(() => {
    function handleChange(event: Event) {
      const next = (event as CustomEvent<CampusLanguageId>).detail
      if (next === 'es' || next === 'en' || next === 'pt') {
        setLanguage(next)
      }
    }
    window.addEventListener(LANGUAGE_EVENT, handleChange)
    return () => window.removeEventListener(LANGUAGE_EVENT, handleChange)
  }, [])

  return {
    language,
    t: translations[language],
  }
}
