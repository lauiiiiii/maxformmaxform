import AuditLog from '../models/AuditLog.js'
import Message from '../models/Message.js'
import transactionManager from '../db/transaction.js'

export async function recordAudit({ actor, action, targetType, targetId, detail }, options = {}) {
  return AuditLog.create({
    actor_id: actor?.sub ?? null,
    actor_username: actor?.username || null,
    action,
    target_type: targetType,
    target_id: targetId,
    detail
  }, options)
}

export async function createAuditMessage({ recipientId, title, content, entityType, entityId, level = 'info', createdBy }, options = {}) {
  return Message.create({
    recipient_id: recipientId,
    type: 'audit',
    level,
    title,
    content,
    entity_type: entityType,
    entity_id: entityId,
    created_by: createdBy
  }, options)
}

export async function createSystemMessage({ recipientId, title, content, entityType, entityId, level = 'info', createdBy }, options = {}) {
  return Message.create({
    recipient_id: recipientId,
    type: 'system',
    level,
    title,
    content,
    entity_type: entityType,
    entity_id: entityId,
    created_by: createdBy
  }, options)
}

export async function recordManagementAction({ actor, audit, message }, options = {}) {
  if (audit) {
    await recordAudit({
      actor,
      action: audit.action,
      targetType: audit.targetType,
      targetId: audit.targetId,
      detail: audit.detail
    }, options)
  }

  if (message) {
    await createAuditMessage({
      recipientId: message.recipientId,
      title: message.title,
      content: message.content,
      entityType: message.entityType,
      entityId: message.entityId,
      level: message.level,
      createdBy: message.createdBy ?? actor?.sub ?? null
    }, options)
  }
}

export async function runManagementTransaction(callback, options = {}) {
  return transactionManager.run(callback, options)
}
