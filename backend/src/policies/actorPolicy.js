import { isAuthenticated } from './accessPolicy.js'

export function getAuthenticatedActorPolicy(user, options = {}) {
  if (isAuthenticated(user)) {
    return { allowed: true }
  }

  return {
    allowed: false,
    status: 401,
    body: {
      success: false,
      error: {
        code: options.code || 'NO_TOKEN',
        message: options.message || 'Authentication required'
      }
    }
  }
}
