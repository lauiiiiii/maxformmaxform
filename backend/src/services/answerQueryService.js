import { createHttpError, createResponseError } from '../http/errors.js'
import { isAdmin } from '../policies/accessPolicy.js'
import answerRepository from '../repositories/answerRepository.js'
import { getSurveyForManagement } from './surveyQueryService.js'
import {
  createAnswerDto,
  createAnswerPageResult,
  normalizeAnswerListQuery,
  SURVEY_ERROR_CODES
} from '../../../shared/survey.contract.js'

export async function getManagedSurveyForAnswerRequest({ actor, surveyId }) {
  if (!surveyId) {
    throw createResponseError(400, {
      success: false,
      error: { code: SURVEY_ERROR_CODES.VALIDATION, message: 'survey_id is required' }
    })
  }

  return getSurveyForManagement({ actor, identifier: surveyId })
}

export async function listAnswers({ actor, query = {} }) {
  const normalized = normalizeAnswerListQuery(query)

  if (!normalized.survey_id && !isAdmin(actor)) {
    throw createResponseError(400, {
      success: false,
      error: { code: SURVEY_ERROR_CODES.VALIDATION, message: 'survey_id is required' }
    })
  }

  let survey = null
  if (normalized.survey_id) {
    survey = await getManagedSurveyForAnswerRequest({ actor, surveyId: normalized.survey_id })
  }

  const result = await answerRepository.list({
    survey_id: survey?.id,
    page: normalized.page,
    pageSize: normalized.pageSize,
    startTime: normalized.startTime,
    endTime: normalized.endTime
  })

  return createAnswerPageResult({
    ...result,
    page: normalized.page,
    pageSize: normalized.pageSize
  })
}

export async function countAnswers({ actor, query = {} }) {
  const survey = await getManagedSurveyForAnswerRequest({
    actor,
    surveyId: query.survey_id
  })

  const count = await answerRepository.countBySurveyId(survey.id)
  return { count }
}

export async function getAnswerForManagement({ actor, answerId }) {
  const answer = await answerRepository.findById(answerId)
  if (!answer) {
    throw createHttpError(404, SURVEY_ERROR_CODES.NOT_FOUND, 'Answer not found')
  }

  await getSurveyForManagement({ actor, identifier: answer.survey_id })
  return createAnswerDto(answer)
}
