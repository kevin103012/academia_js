import {
  BookOpen,
  Boxes,
  BrainCircuit,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  ClipboardCheck,
  ClipboardList,
  LayoutDashboard,
  Megaphone,
  Settings2,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import type { DemoRole } from '../../types/auth'

export type AiSectionId = 'ai-neural' | 'ai-trained' | 'ai-access'

export type CampusPageId =
  | 'home'
  | 'learning'
  | 'activities'
  | 'attendance'
  | 'calendar'
  | 'notices'
  | 'manage'
  | AiSectionId
  | 'reports'
  | 'tutor'

export interface CampusViewItem {
  id: CampusPageId
  label: string
  fullLabel?: string
  groupLabel?: string
  icon: LucideIcon
}

export interface CampusNavGroup {
  id: string
  label: string
  icon: LucideIcon
  children: CampusViewItem[]
}

export type CampusNavNode =
  | { kind: 'item'; item: CampusViewItem }
  | { kind: 'group'; group: CampusNavGroup }

export type CampusNavigate = (page: CampusPageId, courseId?: string) => void

export const homeView: CampusViewItem = { id: 'home', label: 'Resumen', icon: LayoutDashboard }
const learningView: CampusViewItem = { id: 'learning', label: 'Cursos', icon: BookOpen }
const activitiesView: CampusViewItem = { id: 'activities', label: 'Actividades', icon: ClipboardList }
const attendanceView: CampusViewItem = { id: 'attendance', label: 'Asistencia', icon: ClipboardCheck }
const calendarView: CampusViewItem = { id: 'calendar', label: 'Calendario', icon: CalendarDays }
const noticesView: CampusViewItem = { id: 'notices', label: 'Avisos', icon: Megaphone }
const reportsView: CampusViewItem = { id: 'reports', label: 'Reportes', icon: ChartNoAxesColumnIncreasing }
const manageView: CampusViewItem = { id: 'manage', label: 'Administración', icon: Settings2 }
const tutorView: CampusViewItem = { id: 'tutor', label: 'Tutor de estudio', icon: Sparkles }

const aiNeuralView: CampusViewItem = {
  id: 'ai-neural',
  label: 'Entrenamiento',
  fullLabel: 'Entrenamiento neuronal',
  groupLabel: 'Motor de IA',
  icon: BrainCircuit,
}
const aiTrainedView: CampusViewItem = {
  id: 'ai-trained',
  label: 'Modelos entrenados',
  groupLabel: 'Motor de IA',
  icon: Boxes,
}
const aiAccessView: CampusViewItem = {
  id: 'ai-access',
  label: 'Acceso por rol',
  fullLabel: 'Acceso alumnos y docentes',
  groupLabel: 'Motor de IA',
  icon: ShieldCheck,
}

const aiGroup: CampusNavGroup = {
  id: 'ai-group',
  label: 'Motor de IA',
  icon: BrainCircuit,
  children: [aiNeuralView, aiTrainedView, aiAccessView],
}

const itemNode = (item: CampusViewItem): CampusNavNode => ({ kind: 'item', item })
const groupNode = (group: CampusNavGroup): CampusNavNode => ({ kind: 'group', group })

export const navTreeByRole: Record<DemoRole, CampusNavNode[]> = {
  student: [homeView, learningView, activitiesView, tutorView, calendarView, noticesView].map(itemNode),
  teacher: [
    homeView,
    { ...manageView, label: 'Gestión de cursos' },
    activitiesView,
    attendanceView,
    calendarView,
    noticesView,
  ].map(itemNode),
  coordinator: [homeView, reportsView, learningView, activitiesView, attendanceView, calendarView, noticesView].map(
    itemNode,
  ),
  admin: [
    itemNode(homeView),
    itemNode(manageView),
    groupNode(aiGroup),
    itemNode(reportsView),
    itemNode(learningView),
    itemNode(activitiesView),
    itemNode(attendanceView),
    itemNode(calendarView),
    itemNode(noticesView),
  ],
}

export const viewsByRole: Record<DemoRole, CampusViewItem[]> = {
  student: navTreeByRole.student.flatMap((node) => (node.kind === 'item' ? [node.item] : node.group.children)),
  teacher: navTreeByRole.teacher.flatMap((node) => (node.kind === 'item' ? [node.item] : node.group.children)),
  coordinator: navTreeByRole.coordinator.flatMap((node) => (node.kind === 'item' ? [node.item] : node.group.children)),
  admin: navTreeByRole.admin.flatMap((node) => (node.kind === 'item' ? [node.item] : node.group.children)),
}
