import { createResponseError } from '../http/errors.js'
import answerRepository from '../repositories/answerRepository.js'
import surveyAggregateRepository from '../repositories/surveyAggregateRepository.js'
import { removeUploadedFile } from '../utils/uploadStorage.js'
import { getManagedSurveyForAnswerRequest } from './answerQueryService.js'
import { SURVEY_ERROR_CODES } from '../../../shared/survey.contract.js'

function cleanupStoredFiles(files = []) {
  if (!Array.isArray(files) || files.length === 0) return

  for (const file of files) {
    try {
      removeUploadedFile(file?.url || file)
    } catch (error) {
      console.error('Failed to remove uploaded file:', error.message)
    }
  }
}

export async function deleteAnswersBatch({ actor, ids = [] }) {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw createResponseError(400, {
      success: false,
      error: { code: SURVEY_ERROR_CODES.VALIDATION, message: 'ids is required' }
    })
  }

  const existingAnswers = await answerRepository.findByIds(ids)
  if (existingAnswers.length === 0) {
    return { deleted: 0 }
  }

  const surveyIds = [...new Set(existingAnswers.map(item => item.survey_id))]
  await Promise.all(surveyIds.map(surveyId => getManagedSurveyForAnswerRequest({ actor, surveyId })))

  const answerIds = existingAnswers
    .map(item => Number(item.id))
    .filter(id => Number.isFinite(id) && id > 0)

  const { deleted, filesToCleanup } = await surveyAggregateRepository.deleteAnswersBatch({
    answerIds,
    surveyIds
  })

  cleanupStoredFiles(filesToCleanup)
  return { deleted }
}
