import { BookOpen, ChartNoAxesCombined, GraduationCap, ShieldCheck } from 'lucide-react'
import type { DemoRole } from '../../types/auth'

export const roleIcons = {
  student: GraduationCap,
  teacher: BookOpen,
  coordinator: ChartNoAxesCombined,
  admin: ShieldCheck,
} satisfies Record<DemoRole, typeof BookOpen>
