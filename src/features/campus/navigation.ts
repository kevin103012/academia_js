import {
  BookOpen,
  Boxes,
  BrainCircuit,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  ClipboardList,
  Compass,
  LayoutDashboard,
  Mail,
  Megaphone,
  MessageSquare,
  Settings,
  Settings2,
  ShieldCheck,
  Sparkles,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import type { DemoRole } from '../../types/auth'

export type AiSectionId = 'ai-neural' | 'ai-trained' | 'ai-access'
export type CommunitySectionId = 'community-discover' | 'community-mine'

export type CampusPageId =
  | 'home'
  | 'learning'
  | 'activities'
  | 'calendar'
  | 'notices'
  | 'manage'
  | AiSectionId
  | CommunitySectionId
  | 'reports'
  | 'tutor'
  | 'settings'
  | 'messages'

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
const calendarView: CampusViewItem = { id: 'calendar', label: 'Calendario', icon: CalendarDays }
const noticesView: CampusViewItem = { id: 'notices', label: 'Avisos', icon: Megaphone }
const reportsView: CampusViewItem = { id: 'reports', label: 'Reportes', icon: ChartNoAxesColumnIncreasing }
const manageView: CampusViewItem = { id: 'manage', label: 'Administración', icon: Settings2 }
const tutorView: CampusViewItem = { id: 'tutor', label: 'Tutor de estudio', icon: Sparkles }
const settingsView: CampusViewItem = { id: 'settings', label: 'Configuración', icon: Settings }

const messagesView: CampusViewItem = { id: 'messages', label: 'Mensajes', icon: Mail }

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

const communityDiscoverView: CampusViewItem = {
  id: 'community-discover',
  label: 'Buscar comunidad',
  groupLabel: 'Comunidad',
  icon: Compass,
}

const communityMineView: CampusViewItem = {
  id: 'community-mine',
  label: 'Mi comunidad',
  groupLabel: 'Comunidad',
  icon: MessageSquare,
}

const communityGroup: CampusNavGroup = {
  id: 'community-group',
  label: 'Comunidad',
  icon: UsersRound,
  children: [communityDiscoverView, communityMineView],
}

const itemNode = (item: CampusViewItem): CampusNavNode => ({ kind: 'item', item })
const groupNode = (group: CampusNavGroup): CampusNavNode => ({ kind: 'group', group })

export const navTreeByRole: Record<DemoRole, CampusNavNode[]> = {
  student: [
    itemNode(homeView),
    itemNode(learningView),
    itemNode(activitiesView),
    itemNode(tutorView),
    itemNode(messagesView),
    groupNode(communityGroup),
    itemNode(calendarView),
    itemNode(noticesView),
    itemNode(settingsView),
  ],
  teacher: [
    itemNode(homeView),
    itemNode({ ...manageView, label: 'Gestión de cursos' }),
    itemNode(activitiesView),
    itemNode(messagesView),
    groupNode(communityGroup),
    itemNode(calendarView),
    itemNode(noticesView),
    itemNode(settingsView),
  ],
  coordinator: [
    itemNode(homeView),
    itemNode(reportsView),
    itemNode(learningView),
    itemNode(activitiesView),
    groupNode(communityGroup),
    itemNode(calendarView),
    itemNode(noticesView),
    itemNode(settingsView),
  ],
  admin: [
    itemNode(homeView),
    itemNode(manageView),
    groupNode(aiGroup),
    itemNode(reportsView),
    itemNode(learningView),
    itemNode(activitiesView),
    groupNode(communityGroup),
    itemNode(calendarView),
    itemNode(noticesView),
    itemNode(settingsView),
  ],
}

export const viewsByRole: Record<DemoRole, CampusViewItem[]> = {
  student: navTreeByRole.student.flatMap((node) => (node.kind === 'item' ? [node.item] : node.group.children)),
  teacher: navTreeByRole.teacher.flatMap((node) => (node.kind === 'item' ? [node.item] : node.group.children)),
  coordinator: navTreeByRole.coordinator.flatMap((node) => (node.kind === 'item' ? [node.item] : node.group.children)),
  admin: navTreeByRole.admin.flatMap((node) => (node.kind === 'item' ? [node.item] : node.group.children)),
}
