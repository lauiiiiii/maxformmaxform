import { throwManagementError, throwManagementPolicyError } from '../http/managementErrors.js'
import { getAdminPolicy } from '../policies/adminPolicy.js'
import questionBankRepository from '../repositories/questionBankRepository.js'
import { recordManagementAction, runManagementTransaction } from './activity.js'
import {
  createQuestionBankQuestionDto,
  createQuestionBankRepoDto,
  MANAGEMENT_ERROR_CODES
} from '../../../shared/management.contract.js'

function ensureAdmin(actor) {
  throwManagementPolicyError(getAdminPolicy(actor))
}

function normalizeRepoName(name, { required = false } = {}) {
  if (name === undefined) {
    if (required) {
      throwManagementError(400, MANAGEMENT_ERROR_CODES.QUESTION_BANK_REPO_NAME_REQUIRED, 'Question bank repo name is required')
    }
    return undefined
  }

  const normalized = String(name || '').trim()
  if (!normalized) {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.QUESTION_BANK_REPO_NAME_REQUIRED, 'Question bank repo name is required')
  }

  return normalized
}

function normalizeOptionalText(value) {
  if (value === undefined) return undefined
  return value == null ? null : (String(value).trim() || null)
}

function normalizeQuestionTitle(title) {
  const normalized = String(title || '').trim()
  if (!normalized) {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.QUESTION_BANK_QUESTION_TITLE_REQUIRED, 'Question title is required')
  }
  return normalized
}

function normalizeScore(score) {
  if (score === undefined || score === null || score === '') return null
  const normalized = Number(score)
  if (!Number.isFinite(normalized)) {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.QUESTION_BANK_QUESTION_SCORE_INVALID, 'Question score is invalid')
  }
  return normalized
}

async function getRepoOrThrow(repoId, options = {}) {
  const repo = await questionBankRepository.findRepoById(repoId, options)
  if (!repo) {
    throwManagementError(404, MANAGEMENT_ERROR_CODES.QUESTION_BANK_REPO_NOT_FOUND, 'Question bank repo not found')
  }
  return repo
}

async function getQuestionOrThrow(repoId, questionId, options = {}) {
  const question = await questionBankRepository.findQuestionById(questionId, repoId, options)
  if (!question) {
    throwManagementError(404, MANAGEMENT_ERROR_CODES.QUESTION_BANK_QUESTION_NOT_FOUND, 'Question bank question not found')
  }
  return question
}

export async function listManagedQuestionBankRepos({ actor }) {
  ensureAdmin(actor)
  const repos = await questionBankRepository.listRepos()
  return repos.map(item => createQuestionBankRepoDto(item))
}

export async function createManagedQuestionBankRepo({ actor, body = {} }) {
  ensureAdmin(actor)

  return runManagementTransaction(async db => {
    const repo = await questionBankRepository.createRepo({
      name: normalizeRepoName(body.name, { required: true }),
      description: normalizeOptionalText(body.description)
    }, { db })

    await recordManagementAction({
      actor,
      audit: {
        action: 'question_bank.repo.create',
        targetType: 'question_bank_repo',
        targetId: repo.id,
        detail: `Created question bank repo ${repo.name}`
      },
      message: {
        recipientId: actor.sub,
        title: 'Question bank repo created',
        content: `Question bank repo "${repo.name}" was created.`,
        entityType: 'question_bank_repo',
        entityId: repo.id
      }
    }, { db })

    return createQuestionBankRepoDto(repo)
  })
}

export async function updateManagedQuestionBankRepo({ actor, repoId, body = {} }) {
  ensureAdmin(actor)
  return runManagementTransaction(async db => {
    await getRepoOrThrow(repoId, { db })

    const repo = await questionBankRepository.updateRepo(repoId, {
      name: normalizeRepoName(body.name),
      description: normalizeOptionalText(body.description)
    }, { db })

    await recordManagementAction({
      actor,
      audit: {
        action: 'question_bank.repo.update',
        targetType: 'question_bank_repo',
        targetId: repo.id,
        detail: `Updated question bank repo ${repo.name}`
      },
      message: {
        recipientId: actor.sub,
        title: 'Question bank repo updated',
        content: `Question bank repo "${repo.name}" was updated.`,
        entityType: 'question_bank_repo',
        entityId: repo.id
      }
    }, { db })

    return createQuestionBankRepoDto(repo)
  })
}

export async function deleteManagedQuestionBankRepo({ actor, repoId }) {
  ensureAdmin(actor)
  await runManagementTransaction(async db => {
    const repo = await getRepoOrThrow(repoId, { db })
    await questionBankRepository.deleteRepo(repoId, { db })
    await recordManagementAction({
      actor,
      audit: {
        action: 'question_bank.repo.delete',
        targetType: 'question_bank_repo',
        targetId: repo.id,
        detail: `Deleted question bank repo ${repo.name}`
      },
      message: {
        recipientId: actor.sub,
        title: 'Question bank repo deleted',
        content: `Question bank repo "${repo.name}" was deleted.`,
        entityType: 'question_bank_repo',
        entityId: repo.id
      }
    }, { db })
  })
}

export async function listManagedQuestionBankQuestions({ actor, repoId }) {
  ensureAdmin(actor)
  await getRepoOrThrow(repoId)
  const questions = await questionBankRepository.listQuestions(repoId)
  return questions.map(item => createQuestionBankQuestionDto(item))
}

export async function createManagedQuestionBankQuestion({ actor, repoId, body = {} }) {
  ensureAdmin(actor)
  return runManagementTransaction(async db => {
    const repo = await getRepoOrThrow(repoId, { db })

    const question = await questionBankRepository.createQuestion({
      repo_id: Number(repoId),
      title: normalizeQuestionTitle(body.title),
      type: normalizeOptionalText(body.type),
      difficulty: normalizeOptionalText(body.difficulty),
      score: normalizeScore(body.score)
    }, { db })

    await recordManagementAction({
      actor,
      audit: {
        action: 'question_bank.question.create',
        targetType: 'question_bank_question',
        targetId: question.id,
        detail: `Created question "${question.title}" in repo ${repo.name}`
      },
      message: {
        recipientId: actor.sub,
        title: 'Question created',
        content: `Question "${question.title}" was added to "${repo.name}".`,
        entityType: 'question_bank_question',
        entityId: question.id
      }
    }, { db })

    return createQuestionBankQuestionDto(question)
  })
}

export async function deleteManagedQuestionBankQuestion({ actor, repoId, questionId }) {
  ensureAdmin(actor)
  await runManagementTransaction(async db => {
    const repo = await getRepoOrThrow(repoId, { db })
    const question = await getQuestionOrThrow(repoId, questionId, { db })
    await questionBankRepository.deleteQuestion(questionId, repoId, { db })
    await recordManagementAction({
      actor,
      audit: {
        action: 'question_bank.question.delete',
        targetType: 'question_bank_question',
        targetId: question.id,
        detail: `Deleted question "${question.title}" from repo ${repo.name}`
      },
      message: {
        recipientId: actor.sub,
        title: 'Question deleted',
        content: `Question "${question.title}" was removed from "${repo.name}".`,
        entityType: 'question_bank_question',
        entityId: question.id
      }
    }, { db })
  })
}
