export { aiService, computeNextEpoch, type AiService } from './ai/aiService'
export { apiClient, ApiError } from './http/apiClient'
export { localStore } from './storage/localStore'
export { authService, type AuthService } from './auth/authService'
export { communityService, type CommunityService } from './community/communityService'
export { themeService } from './theme/themeService'
export { workspaceService, type WorkspaceService } from './workspace/workspaceService'
export {
  completedLessonCount,
  courseLessons,
  courseMaterial,
  isOrientation,
  learningService,
  passingScore,
  type LearningService,
} from './learning/learningService'
export { getActiveModelsForRole, tutorService, type TutorService } from './tutor/tutorService'
