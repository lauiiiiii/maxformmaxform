import { throwManagementError, throwManagementPolicyError } from '../http/managementErrors.js'
import { getAuthenticatedActorPolicy } from '../policies/actorPolicy.js'
import messageRepository from '../repositories/messageRepository.js'
import {
  createMessageDto,
  MANAGEMENT_ERROR_CODES,
  normalizeMessageListQuery
} from '../../../shared/management.contract.js'

function ensureAuthenticated(actor) {
  throwManagementPolicyError(getAuthenticatedActorPolicy(actor))
}

export async function listActorMessages({ actor, query = {} }) {
  ensureAuthenticated(actor)
  const normalized = normalizeMessageListQuery(query)
  const list = await messageRepository.list({
    recipient_id: actor.sub,
    page: normalized.page,
    pageSize: normalized.pageSize,
    unread: normalized.unread,
    types: normalized.types
  })

  return list.map(item => createMessageDto(item))
}

export async function markActorMessageRead({ actor, messageId }) {
  ensureAuthenticated(actor)
  const message = await messageRepository.markRead(messageId, actor.sub)
  if (!message) {
    throwManagementError(404, MANAGEMENT_ERROR_CODES.MESSAGE_NOT_FOUND, 'Message not found')
  }

  return createMessageDto(message)
}
