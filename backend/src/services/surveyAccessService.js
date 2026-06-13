import { isAdmin } from '../policies/accessPolicy.js'
import surveyRepository from '../repositories/surveyRepository.js'
import userRepository from '../repositories/userRepository.js'
import {
  getManageSurveyPolicy,
  getPublicSurveyPolicy,
  getSurveyAccessMeta,
  isSurveyExpired
} from '../policies/surveyPolicy.js'
import { SURVEY_ERROR_CODES, SURVEY_STATUS } from '../../../shared/survey.contract.js'
import { createHttpError, createResponseError, throwPolicyError } from '../http/errors.js'

export async function resolveRequestedSurveyCreatorId({ actor, query = {} }) {
  const { creator_id, createdBy } = query
  if (!isAdmin(actor)) return actor.sub
  if (creator_id !== undefined) return Number(creator_id)
  if (createdBy) {
    const user = await userRepository.findByUsername(String(createdBy))
    return user ? user.id : -1
  }
  return undefined
}

export async function getSurveyOrThrow(identifier, options = {}) {
  const survey = await surveyRepository.findByIdentifier(identifier, options)
  if (!survey) {
    throw createHttpError(404, SURVEY_ERROR_CODES.NOT_FOUND, 'Survey not found')
  }
  return survey
}

export async function getSharedSurveyOrThrow(shareCode, options = {}) {
  const normalizedShareCode = String(shareCode || '').trim()
  if (!normalizedShareCode || /^\d+$/.test(normalizedShareCode)) {
    throw createHttpError(404, SURVEY_ERROR_CODES.NOT_FOUND, 'Survey not found')
  }

  const survey = await surveyRepository.findByShareCode(normalizedShareCode, options)
  if (!survey) {
    throw createHttpError(404, SURVEY_ERROR_CODES.NOT_FOUND, 'Survey not found')
  }
  return survey
}

export async function getSurveyForManagement({ actor, identifier, includeDeleted = false }) {
  const survey = await getSurveyOrThrow(identifier, { includeDeleted })
  throwPolicyError(getManageSurveyPolicy(actor, survey))
  return survey
}

export async function getSurveyForPublicView({ actor, identifier }) {
  const survey = await getSurveyOrThrow(identifier)
  throwPolicyError(getPublicSurveyPolicy(actor, survey))
  return survey
}

export async function getSharedSurveyForPublicView({ actor, shareCode }) {
  const survey = await getSharedSurveyOrThrow(shareCode)
  throwPolicyError(getPublicSurveyPolicy(actor, survey))
  return survey
}

export async function getSurveyForSubmission(identifier) {
  const survey = await getSurveyOrThrow(identifier)
  if (survey.status !== SURVEY_STATUS.PUBLISHED) {
    throw createResponseError(400, {
      success: false,
      error: { code: SURVEY_ERROR_CODES.NOT_PUBLISHED, message: 'Survey is not published' }
    })
  }
  if (isSurveyExpired(survey)) {
    throw createResponseError(403, {
      success: false,
      error: { code: SURVEY_ERROR_CODES.SURVEY_EXPIRED, message: 'Survey has expired' },
      data: getSurveyAccessMeta(survey)
    })
  }
  return survey
}
