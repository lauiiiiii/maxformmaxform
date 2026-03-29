import { throwManagementError, throwManagementPolicyError } from '../http/managementErrors.js'
import { getAdminPolicy } from '../policies/adminPolicy.js'
import questionBankRepository from '../repositories/questionBankRepository.js'
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

async function getRepoOrThrow(repoId) {
  const repo = await questionBankRepository.findRepoById(repoId)
  if (!repo) {
    throwManagementError(404, MANAGEMENT_ERROR_CODES.QUESTION_BANK_REPO_NOT_FOUND, 'Question bank repo not found')
  }
  return repo
}

async function getQuestionOrThrow(repoId, questionId) {
  const question = await questionBankRepository.findQuestionById(questionId, repoId)
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

  const repo = await questionBankRepository.createRepo({
    name: normalizeRepoName(body.name, { required: true }),
    description: normalizeOptionalText(body.description)
  })

  return createQuestionBankRepoDto(repo)
}

export async function updateManagedQuestionBankRepo({ actor, repoId, body = {} }) {
  ensureAdmin(actor)
  await getRepoOrThrow(repoId)

  const repo = await questionBankRepository.updateRepo(repoId, {
    name: normalizeRepoName(body.name),
    description: normalizeOptionalText(body.description)
  })

  return createQuestionBankRepoDto(repo)
}

export async function deleteManagedQuestionBankRepo({ actor, repoId }) {
  ensureAdmin(actor)
  await getRepoOrThrow(repoId)
  await questionBankRepository.deleteRepo(repoId)
}

export async function listManagedQuestionBankQuestions({ actor, repoId }) {
  ensureAdmin(actor)
  await getRepoOrThrow(repoId)
  const questions = await questionBankRepository.listQuestions(repoId)
  return questions.map(item => createQuestionBankQuestionDto(item))
}

export async function createManagedQuestionBankQuestion({ actor, repoId, body = {} }) {
  ensureAdmin(actor)
  await getRepoOrThrow(repoId)

  const question = await questionBankRepository.createQuestion({
    repo_id: Number(repoId),
    title: normalizeQuestionTitle(body.title),
    type: normalizeOptionalText(body.type),
    difficulty: normalizeOptionalText(body.difficulty),
    score: normalizeScore(body.score)
  })

  return createQuestionBankQuestionDto(question)
}

export async function deleteManagedQuestionBankQuestion({ actor, repoId, questionId }) {
  ensureAdmin(actor)
  await getRepoOrThrow(repoId)
  await getQuestionOrThrow(repoId, questionId)
  await questionBankRepository.deleteQuestion(questionId, repoId)
}
