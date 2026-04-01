import http from './http'
import type { ApiResponse } from '../types/api'
import type {
  QuestionBankQuestionDTO,
  QuestionBankQuestionFormDTO,
  QuestionBankQuestionListQueryDTO,
  QuestionBankRepoDTO,
  QuestionBankRepoFormDTO,
  QuestionBankRepoListQueryDTO
} from '../../../shared/management.contract.js'

export type {
  QuestionBankQuestionDTO,
  QuestionBankQuestionFormDTO,
  QuestionBankQuestionListQueryDTO,
  QuestionBankRepoDTO,
  QuestionBankRepoFormDTO,
  QuestionBankRepoListQueryDTO
}

export type QuestionBankExportFormat = 'json' | 'txt' | 'xlsx'
export type QuestionBankImportFormat = 'txt' | 'text' | 'json' | 'xlsx' | 'xls' | 'excel'

export interface QuestionBankImportErrorDTO {
  index: number
  title?: string
  reason: string
}

export interface QuestionBankImportResultDTO {
  repo?: QuestionBankRepoDTO | null
  totalCount: number
  createdCount: number
  failedCount: number
  questions: QuestionBankQuestionDTO[]
  errors: QuestionBankImportErrorDTO[]
}

export interface QuestionBankExportResult {
  blob: Blob
  filename: string
}

function resolveDownloadFilename(contentDisposition: string | undefined, fallback: string): string {
  if (!contentDisposition) return fallback

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1])
    } catch {
      return utf8Match[1]
    }
  }

  const match = contentDisposition.match(/filename="?([^";]+)"?/i)
  return match?.[1] || fallback
}

export async function listRepos(params: QuestionBankRepoListQueryDTO = {}): Promise<QuestionBankRepoDTO[]> {
  const { data } = await http.get<ApiResponse<QuestionBankRepoDTO[]>>('/repos', { params })
  return data.data || []
}

export async function createRepo(payload: Partial<QuestionBankRepoFormDTO>): Promise<QuestionBankRepoDTO> {
  const { data } = await http.post<ApiResponse<QuestionBankRepoDTO>>('/repos', payload)
  return data.data!
}

export async function updateRepo(id: number, payload: Partial<QuestionBankRepoFormDTO>): Promise<QuestionBankRepoDTO> {
  const { data } = await http.put<ApiResponse<QuestionBankRepoDTO>>(`/repos/${id}`, payload)
  return data.data!
}

export async function deleteRepo(id: number): Promise<void> {
  await http.delete(`/repos/${id}`)
}

export async function exportRepo(repoId: number, format: QuestionBankExportFormat, params: QuestionBankQuestionListQueryDTO = {}): Promise<QuestionBankExportResult> {
  const response = await http.get(`/repos/${repoId}/export`, {
    params: {
      ...params,
      format
    },
    responseType: 'blob'
  })

  return {
    blob: response.data as Blob,
    filename: resolveDownloadFilename(response.headers['content-disposition'], `question-bank-${repoId}.${format}`)
  }
}

export async function importBankQuestions(
  repoId: number,
  payload: { format?: QuestionBankImportFormat; text?: string; file?: File | null }
): Promise<QuestionBankImportResultDTO> {
  if (payload.file) {
    const form = new FormData()
    form.append('format', payload.format || '')
    form.append('file', payload.file)
    const { data } = await http.post<ApiResponse<QuestionBankImportResultDTO>>(`/repos/${repoId}/import`, form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return data.data!
  }

  const { data } = await http.post<ApiResponse<QuestionBankImportResultDTO>>(`/repos/${repoId}/import`, {
    format: payload.format,
    text: payload.text
  })
  return data.data!
}

export async function listBankQuestions(repoId: number, params: QuestionBankQuestionListQueryDTO = {}): Promise<QuestionBankQuestionDTO[]> {
  const { data } = await http.get<ApiResponse<QuestionBankQuestionDTO[]>>(`/repos/${repoId}/questions`, { params })
  return data.data || []
}

export async function addBankQuestion(repoId: number, payload: Partial<QuestionBankQuestionFormDTO>): Promise<QuestionBankQuestionDTO> {
  const { data } = await http.post<ApiResponse<QuestionBankQuestionDTO>>(`/repos/${repoId}/questions`, payload)
  return data.data!
}

export async function updateBankQuestion(repoId: number, questionId: number, payload: Partial<QuestionBankQuestionFormDTO>): Promise<QuestionBankQuestionDTO> {
  const { data } = await http.put<ApiResponse<QuestionBankQuestionDTO>>(`/repos/${repoId}/questions/${questionId}`, payload)
  return data.data!
}

export async function removeBankQuestion(repoId: number, qId: number): Promise<void> {
  await http.delete(`/repos/${repoId}/questions/${qId}`)
}
