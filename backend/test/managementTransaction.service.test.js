import test from 'node:test'
import assert from 'node:assert/strict'
import AuditLog from '../src/models/AuditLog.js'
import Flow from '../src/models/Flow.js'
import Message from '../src/models/Message.js'
import transactionManager from '../src/db/transaction.js'
import { createManagedFlow } from '../src/services/flowService.js'

test('transactionManager.run reuses an existing db handle instead of opening a new transaction', async () => {
  const existingDb = { kind: 'outer-transaction' }
  const result = await transactionManager.run(async db => {
    assert.equal(db, existingDb)
    return 'ok'
  }, { db: existingDb })

  assert.equal(result, 'ok')
})

test('createManagedFlow propagates the caller db through repository, audit, and message writes', async () => {
  const actor = {
    sub: 1,
    username: 'admin',
    roleCode: 'admin'
  }
  const existingDb = {
    kind: 'outer-transaction',
    fn: {
      now: () => '2026-04-01T00:00:00.000Z'
    }
  }

  let transactionCalls = 0
  let flowCreateDb = null
  let auditCreateDb = null
  let messageCreateDb = null

  const originalRun = transactionManager.run
  const originalFlowCreate = Flow.create
  const originalAuditCreate = AuditLog.create
  const originalMessageCreate = Message.create

  transactionManager.run = async (callback, options = {}) => {
    transactionCalls += 1
    return originalRun(callback, options)
  }
  Flow.create = async (payload, options = {}) => {
    flowCreateDb = options.db
    return {
      id: 8,
      ...payload
    }
  }
  AuditLog.create = async (payload, options = {}) => {
    auditCreateDb = options.db
    return { id: 1, ...payload }
  }
  Message.create = async (payload, options = {}) => {
    messageCreateDb = options.db
    return { id: 2, ...payload }
  }

  try {
    const result = await createManagedFlow({
      actor,
      body: {
        name: 'Security review',
        status: 'active',
        description: 'Two-step approval flow'
      }
    }, { db: existingDb })

    assert.equal(transactionCalls, 1)
    assert.equal(flowCreateDb, existingDb)
    assert.equal(auditCreateDb, existingDb)
    assert.equal(messageCreateDb, existingDb)
    assert.equal(result.name, 'Security review')
    assert.equal(result.status, 'active')
  } finally {
    transactionManager.run = originalRun
    Flow.create = originalFlowCreate
    AuditLog.create = originalAuditCreate
    Message.create = originalMessageCreate
  }
})
