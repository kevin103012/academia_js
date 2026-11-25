import { demoUsers } from '../../data/demoUsers'
import type { DemoRole } from '../../types/auth'

export interface RolePreview {
  title: string
  subtitle: string
  lead: string
  metric: string
  items: string[]
}

export const rolePreviews: Record<DemoRole, RolePreview> = {
  student: {
    title: 'Tu próxima lección',
    subtitle: 'Pensamiento computacional',
    lead: 'Retoma lo que estabas aprendiendo, practica a tu ritmo y consulta tus resultados.',
    metric: '2 de 4 lecciones',
    items: ['Explora el catálogo', 'Sigue tu progreso', 'Descarga tus certificados'],
  },
  teacher: {
    title: 'Tus cursos',
    subtitle: 'Taller de proyectos',
    lead: 'Organiza los materiales de tu clase y prepara las evaluaciones desde un solo lugar.',
    metric: 'Vista docente',
    items: ['Prepara tus clases', 'Edita tus materiales', 'Consulta tus grupos'],
  },
  coordinator: {
    title: 'Panorama académico',
    subtitle: 'Seguimiento del aprendizaje',
    lead: 'Consulta indicadores y detecta qué grupos necesitan acompañamiento.',
    metric: 'Vista de coordinación',
    items: ['Filtra por grupo', 'Revisa las alertas', 'Exporta indicadores'],
  },
  admin: {
    title: 'Gestión del campus',
    subtitle: 'Personas y catálogos',
    lead: 'Administra usuarios, consulta el catálogo y revisa el registro de actividad.',
    metric: 'Vista de administración',
    items: ['Gestiona los perfiles', 'Mantén el catálogo', 'Revisa la auditoría'],
  },
}

export const landingRoleMeta = demoUsers.map((user, index) => ({
  value: index,
  role: user.role,
  label: user.roleLabel,
  shortLabel: user.role === 'coordinator' ? 'Coord.' : user.role === 'admin' ? 'Admin.' : undefined,
  id: `role-${user.role}`,
  panelId: `role-panel-${user.role}`,
}))
