import { reactive, ref, computed } from 'vue'
import { createSurvey, updateSurvey, getSurvey, publishSurvey as publishSurveyApi } from '../api/surveys'
import { ElMessage } from 'element-plus'
import type { Survey, Question, SurveySettings } from '../types/survey'

export function useSurveyEditor() {
  const surveyForm = reactive({
    title: '',
    description: '',
    settings: {} as SurveySettings,
    questions: [] as Question[]
  })

  const currentSurveyId = ref<number | null>(null)
  const shareCode = ref('')
  const saving = ref(false)

  const canPublish = computed(() => {
    return surveyForm.title.trim() !== '' && surveyForm.questions.length > 0
  })

  async function loadSurvey(id: number | string) {
    const s = await getSurvey(id)
    surveyForm.title = s.title || ''
    surveyForm.description = s.description || ''
    surveyForm.settings = s.settings || {}
    surveyForm.questions = Array.isArray(s.questions) ? s.questions : []
    currentSurveyId.value = s.id
    shareCode.value = s.share_code || ''
    return s
  }

  async function saveDraft() {
    saving.value = true
    try {
      const payload = {
        title: surveyForm.title,
        description: surveyForm.description,
        questions: surveyForm.questions,
        settings: surveyForm.settings
      }
      let result: Survey
      if (currentSurveyId.value) {
        result = await updateSurvey(currentSurveyId.value, payload)
      } else {
        result = await createSurvey(payload)
        currentSurveyId.value = result.id
        shareCode.value = result.share_code || ''
      }
      ElMessage.success('保存成功')
      return result
    } catch {
      ElMessage.error('保存失败')
      return null
    } finally {
      saving.value = false
    }
  }

  async function publishSurvey() {
    if (!currentSurveyId.value) {
      const saved = await saveDraft()
      if (!saved) return null
    }
    try {
      const result = await publishSurveyApi(currentSurveyId.value!)
      ElMessage.success('发布成功')
      return result
    } catch {
      return null
    }
  }

  function addQuestion(question: Question) {
    surveyForm.questions.push(question)
  }

  function removeQuestion(index: number) {
    surveyForm.questions.splice(index, 1)
  }

  function moveQuestion(from: number, to: number) {
    if (to < 0 || to >= surveyForm.questions.length) return
    const [item] = surveyForm.questions.splice(from, 1)
    surveyForm.questions.splice(to, 0, item)
  }

  return {
    surveyForm,
    currentSurveyId,
    shareCode,
    saving,
    canPublish,
    loadSurvey,
    saveDraft,
    publishSurvey,
    addQuestion,
    removeQuestion,
    moveQuestion
  }
}
