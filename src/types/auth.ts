export type DemoRole = 'student' | 'teacher' | 'coordinator' | 'admin'

export interface DemoUser {
  id: string
  name: string
  email: string
  role: DemoRole
  roleLabel: string
  initials: string
  academicBlock?: string
}

export type AuthFailureReason = 'pending_approval' | 'rejected' | 'invalid_credentials'

export type SignInResult =
  | { status: 'authenticated'; user: DemoUser }
  | { status: AuthFailureReason; requestedAt?: string }

export interface AccessRequestSubmission {
  fullName: string
  email: string
  requestedRole: DemoRole
  academicBlock: string
  motivation?: string
}

export type SubmitAccessRequestResult =
  | {
      status: 'submitted'
      request: {
        id: string
        name: string
        email: string
        requestedRole: DemoRole
        roleLabel: string
        group: string
        motivation: string
        status: 'pending' | 'approved' | 'rejected'
        requestedAt: string
      }
    }
  | { status: 'already_registered'; message: string }
