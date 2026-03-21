export interface QuestionOption {
  label: string
  value: string
  order?: number
}

export interface Question {
  id: string
  type: string
  title: string
  titleHtml?: string
  description?: string
  required?: boolean
  options?: QuestionOption[]
  optionOrder?: 'none' | 'all' | 'flip' | 'firstFixed' | 'lastFixed'
  validation?: Record<string, unknown>
  logic?: Record<string, unknown>
  examConfig?: { score?: number; correctAnswer?: unknown }
}

export interface SurveySettings {
  showProgress?: boolean
  allowMultipleSubmissions?: boolean
  endTime?: string
  examMode?: boolean
  timeLimit?: number
  submitOnce?: boolean
  randomOrder?: boolean
}

export interface SurveyStyle {
  theme?: string
  backgroundColor?: string
  headerImage?: string
}

export interface Survey {
  id: number
  title: string
  description?: string
  creator_id: number
  questions: Question[]
  settings?: SurveySettings
  style?: SurveyStyle
  share_code?: string
  status: 'draft' | 'published' | 'closed'
  response_count: number
  created_at: string
  updated_at: string
}

export type SurveyForm = Pick<Survey, 'title' | 'description' | 'questions' | 'settings' | 'style'>
