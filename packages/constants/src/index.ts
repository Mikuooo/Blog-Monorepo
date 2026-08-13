export const APPLICATION_NAME = 'Blog Platform'
export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100

export const QUEUE_NAMES = {
  articleCommands: 'article-commands',
  maintenance: 'maintenance',
} as const

export const JOB_NAMES = {
  publishScheduledArticle: 'article.publish-scheduled',
  heartbeat: 'system.heartbeat',
} as const
