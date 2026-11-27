export { aiService, computeNextEpoch, type AiService } from './ai/aiService'
export { apiClient, ApiError } from './http/apiClient'
export { localStore } from './storage/localStore'
export {
  listContacts,
  maxMessageChars,
  messagingService,
  onMessagesChanged,
  type MessagingService,
} from './messaging/messagingService'
export { listGroups } from './messaging/messagingGroups'
export { checkGroupSend, groupLimits, groupSendTimes, MessageRuleError } from './messaging/messagingRules'
export { authService, type AuthService } from './auth/authService'
export { communityService, type CommunityService } from './community/communityService'
export * from './community/communityRules'
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
export * from './learning/lessonRules'
export { getActiveModelsForRole, tutorService, type TutorService } from './tutor/tutorService'
