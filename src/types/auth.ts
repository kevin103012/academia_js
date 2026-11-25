export type DemoRole = 'student' | 'teacher' | 'coordinator' | 'admin'

export interface DemoUser {
  id: string
  name: string
  email: string
  role: DemoRole
  roleLabel: string
  initials: string
}
