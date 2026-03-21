export interface Answer {
  id: number
  survey_id: number
  answers_data: AnswerItem[]
  ip_address?: string
  user_agent?: string
  duration?: number
  status: 'completed' | 'incomplete'
  submitted_at: string
}

export interface AnswerItem {
  questionId: string
  value: unknown
  text?: string
}
