import test from 'node:test'
import assert from 'node:assert/strict'
import QuestionBankRepo from '../src/models/QuestionBankRepo.js'

function createBaseQueryBuilder({ rows = [], firstRow = null } = {}) {
  const state = {
    whereCalls: [],
    andWhereCalls: [],
    orderByCalls: []
  }

  const builder = {
    select() {
      return builder
    },
    count() {
      return builder
    },
    leftJoin() {
      return builder
    },
    groupBy() {
      return builder
    },
    where(...args) {
      state.whereCalls.push(args)
      return builder
    },
    andWhere(...args) {
      state.andWhereCalls.push(args)
      return builder
    },
    orderBy(...args) {
      state.orderByCalls.push(args)
      return builder
    },
    async first() {
      return firstRow
    },
    then(resolve, reject) {
      return Promise.resolve(rows).then(resolve, reject)
    }
  }

  return { builder, state }
}

function createFakeDb(queryBuilder) {
  return Object.assign(() => queryBuilder, {
    fn: {
      now: () => '2026-04-01T00:00:00.000Z'
    }
  })
}

test('QuestionBankRepo.findById applies creator scope when creator_id is provided', async () => {
  const { builder, state } = createBaseQueryBuilder({
    firstRow: {
      id: 6,
      creator_id: 2,
      name: 'Scoped repo',
      question_count: 1
    }
  })

  const repo = await QuestionBankRepo.findById(6, {
    db: createFakeDb(builder),
    creator_id: 2
  })

  assert.deepEqual(state.whereCalls, [['r.id', 6]])
  assert.deepEqual(state.andWhereCalls, [['r.creator_id', 2]])
  assert.equal(repo?.id, 6)
  assert.equal(repo?.creator_id, 2)
})

test('QuestionBankRepo.findById leaves creator scope unset for admin-style lookups', async () => {
  const { builder, state } = createBaseQueryBuilder({
    firstRow: {
      id: 6,
      creator_id: 9,
      name: 'Unscoped repo',
      question_count: 0
    }
  })

  await QuestionBankRepo.findById(6, {
    db: createFakeDb(builder)
  })

  assert.deepEqual(state.whereCalls, [['r.id', 6]])
  assert.deepEqual(state.andWhereCalls, [])
})
