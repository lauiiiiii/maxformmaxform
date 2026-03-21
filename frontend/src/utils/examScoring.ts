// 答案评分计算器 - 基于Java AnswerScoreEvaluator转换

// 临时类型定义，等待完整类型系统
interface SurveySchema {
  id?: string
  title?: string
  type?: number
  children?: SurveySchema[]
  examConfig?: ExamConfig
}

interface Question {
  id: string
  type: number
  title: string
  examConfig?: ExamConfig
}

export interface ExamConfig {
  score: number
  correctAnswer: any
  explanation?: string
}

export interface QuestionScore {
  questionId: string
  score: number
  maxScore: number
  correct: boolean
  userAnswer: any
  correctAnswer: any
}

export class AnswerScoreEvaluator {
  private schema: SurveySchema
  private answers: Record<string, any>
  private questionScores: QuestionScore[] = []

  constructor(schema: SurveySchema, answers: Record<string, any>) {
    this.schema = schema
    this.answers = answers
  }

  // 计算总分 - 对应Java中的eval()方法
  eval(): number {
    this.questionScores = []
    let totalScore = 0
    let maxTotalScore = 0

    this.flattenQuestions(this.schema).forEach(question => {
      const questionScore = this.evaluateQuestion(question)
      if (questionScore) {
        this.questionScores.push(questionScore)
        totalScore += questionScore.score
        maxTotalScore += questionScore.maxScore
      }
    })

    return maxTotalScore > 0 ? (totalScore / maxTotalScore) * 100 : 0
  }

  // 获取每题得分详情
  getQuestionScore(): QuestionScore[] {
    return this.questionScores
  }

  // 评估单个问题得分
  private evaluateQuestion(question: Question): QuestionScore | null {
    const examConfig = question.examConfig
    if (!examConfig || examConfig.score <= 0) {
      return null
    }

    const userAnswer = this.answers[question.id]
    const isCorrect = this.isAnswerCorrect(userAnswer, examConfig.correctAnswer, question.type)
    
    return {
      questionId: question.id,
      score: isCorrect ? examConfig.score : 0,
      maxScore: examConfig.score,
      correct: isCorrect,
      userAnswer,
      correctAnswer: examConfig.correctAnswer
    }
  }

  // 判断答案是否正确 - 对应Java中的答案比较逻辑
  private isAnswerCorrect(userAnswer: any, correctAnswer: any, questionType: number): boolean {
    if (!userAnswer || !correctAnswer) {
      return false
    }

    switch (questionType) {
      case 3: // 单选题
        return this.compareSingleChoice(userAnswer, correctAnswer)
      
      case 4: // 多选题
        return this.compareMultipleChoice(userAnswer, correctAnswer)
      
      case 1: // 填空题
      case 2: // 简答题
        return this.compareFillBlank(userAnswer, correctAnswer)
      
      case 5: // 判断题
        return this.compareBoolean(userAnswer, correctAnswer)
      
      case 20: // 矩阵单选
        return this.compareMatrixSingle(userAnswer, correctAnswer)
      
      case 21: // 矩阵多选
        return this.compareMatrixMultiple(userAnswer, correctAnswer)
      
      default:
        return false
    }
  }

  // 单选题比较
  private compareSingleChoice(userAnswer: any, correctAnswer: any): boolean {
    // 用户答案格式: {questionId: {optionId: value}}
    if (typeof userAnswer === 'object' && userAnswer !== null) {
      const userOptions = Object.keys(userAnswer)
      const correctOptions = Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer]
      return userOptions.length === correctOptions.length && 
             userOptions.every(option => correctOptions.includes(option))
    }
    return userAnswer === correctAnswer
  }

  // 多选题比较
  private compareMultipleChoice(userAnswer: any, correctAnswer: any): boolean {
    if (typeof userAnswer === 'object' && userAnswer !== null) {
      const userOptions = Object.keys(userAnswer).filter(key => userAnswer[key])
      const correctOptions = Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer]
      
      return userOptions.length === correctOptions.length &&
             userOptions.every(option => correctOptions.includes(option)) &&
             correctOptions.every(option => userOptions.includes(option))
    }
    return false
  }

  // 填空题比较
  private compareFillBlank(userAnswer: any, correctAnswer: any): boolean {
    if (typeof userAnswer === 'object' && userAnswer !== null) {
      // 提取实际填写的文本
      const userText = Object.values(userAnswer).join('').trim().toLowerCase()
      const correctText = String(correctAnswer).trim().toLowerCase()
      
      // 支持多个正确答案，用|分隔
      const correctAnswers = correctText.split('|').map(ans => ans.trim())
      return correctAnswers.some(correct => 
        this.fuzzyMatch(userText, correct)
      )
    }
    
    const userText = String(userAnswer || '').trim().toLowerCase()
    const correctText = String(correctAnswer).trim().toLowerCase()
    return this.fuzzyMatch(userText, correctText)
  }

  // 判断题比较
  private compareBoolean(userAnswer: any, correctAnswer: any): boolean {
    const userBool = this.toBooleanValue(userAnswer)
    const correctBool = this.toBooleanValue(correctAnswer)
    return userBool === correctBool
  }

  // 矩阵单选比较
  private compareMatrixSingle(userAnswer: any, correctAnswer: any): boolean {
    if (typeof userAnswer !== 'object' || typeof correctAnswer !== 'object') {
      return false
    }

    const userRows = Object.keys(userAnswer)
    const correctRows = Object.keys(correctAnswer)
    
    if (userRows.length !== correctRows.length) {
      return false
    }

    return userRows.every(row => {
      const userRowAnswer = userAnswer[row]
      const correctRowAnswer = correctAnswer[row]
      return this.compareSingleChoice(userRowAnswer, correctRowAnswer)
    })
  }

  // 矩阵多选比较
  private compareMatrixMultiple(userAnswer: any, correctAnswer: any): boolean {
    if (typeof userAnswer !== 'object' || typeof correctAnswer !== 'object') {
      return false
    }

    const userRows = Object.keys(userAnswer)
    const correctRows = Object.keys(correctAnswer)
    
    if (userRows.length !== correctRows.length) {
      return false
    }

    return userRows.every(row => {
      const userRowAnswer = userAnswer[row]
      const correctRowAnswer = correctAnswer[row]
      return this.compareMultipleChoice(userRowAnswer, correctRowAnswer)
    })
  }

  // 模糊匹配 - 支持忽略空格、大小写等
  private fuzzyMatch(userText: string, correctText: string): boolean {
    // 完全匹配
    if (userText === correctText) return true
    
    // 移除标点符号和空格后匹配
    const cleanUser = userText.replace(/[^\w\u4e00-\u9fa5]/g, '')
    const cleanCorrect = correctText.replace(/[^\w\u4e00-\u9fa5]/g, '')
    
    if (cleanUser === cleanCorrect) return true
    
    // 包含匹配（适用于关键词题）
    if (correctText.length <= 10 && cleanUser.includes(cleanCorrect)) {
      return true
    }
    
    // 编辑距离匹配（适用于长文本）
    if (correctText.length > 10) {
      const similarity = this.calculateSimilarity(cleanUser, cleanCorrect)
      return similarity > 0.8 // 80%相似度
    }
    
    return false
  }

  // 计算字符串相似度
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1
    
    if (longer.length === 0) return 1.0
    
    const editDistance = this.levenshteinDistance(longer, shorter)
    return (longer.length - editDistance) / longer.length
  }

  // 计算编辑距离
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = []
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }
    
    return matrix[str2.length][str1.length]
  }

  // 转换为布尔值
  private toBooleanValue(value: any): boolean {
    if (typeof value === 'boolean') return value
    if (typeof value === 'string') {
      const lower = value.toLowerCase().trim()
      return ['true', '是', '对', '正确', '1', 'yes'].includes(lower)
    }
    if (typeof value === 'number') return value === 1
    if (typeof value === 'object' && value !== null) {
      // 从选项中提取布尔值
      const values = Object.values(value)
      if (values.length === 1) {
        return this.toBooleanValue(values[0])
      }
    }
    return false
  }

  // 扁平化问题结构 - 对应Java中的SchemaHelper.flatSurveySchema
  private flattenQuestions(schema: SurveySchema): Question[] {
    const questions: Question[] = []
    
    if (schema.children) {
      schema.children.forEach(child => {
        if (child.type && child.id) {
          questions.push(child as Question)
        }
        questions.push(...this.flattenQuestions(child))
      })
    }
    
    return questions
  }
}

// 使用示例和工具函数
export function useExamScoring() {
  // 计算问卷总分
  const calculateSurveyScore = (schema: SurveySchema, answers: Record<string, any>) => {
    const evaluator = new AnswerScoreEvaluator(schema, answers)
    return evaluator.eval()
  }

  // 获取详细得分报告
  const getDetailedScore = (schema: SurveySchema, answers: Record<string, any>) => {
    const evaluator = new AnswerScoreEvaluator(schema, answers)
    const totalScore = evaluator.eval()
    const questionScores = evaluator.getQuestionScore()
    
    return {
      totalScore,
      questionScores,
      totalQuestions: questionScores.length,
      correctQuestions: questionScores.filter(q => q.correct).length,
      totalMaxScore: questionScores.reduce((sum, q) => sum + q.maxScore, 0),
      actualScore: questionScores.reduce((sum, q) => sum + q.score, 0)
    }
  }

  // 生成成绩等级
  const getScoreGrade = (score: number) => {
    if (score >= 90) return { grade: 'A', label: '优秀', color: '#52c41a' }
    if (score >= 80) return { grade: 'B', label: '良好', color: '#1890ff' }
    if (score >= 70) return { grade: 'C', label: '中等', color: '#faad14' }
    if (score >= 60) return { grade: 'D', label: '及格', color: '#fa8c16' }
    return { grade: 'F', label: '不及格', color: '#f5222d' }
  }

  return {
    AnswerScoreEvaluator,
    calculateSurveyScore,
    getDetailedScore,
    getScoreGrade
  }
}