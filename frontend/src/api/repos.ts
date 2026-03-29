import http from './http'
import type { ApiResponse } from '../types/api'
import type {
  QuestionBankQuestionDTO,
  QuestionBankQuestionFormDTO,
  QuestionBankRepoDTO,
  QuestionBankRepoFormDTO
} from '../../../shared/management.contract.js'

export type {
  QuestionBankQuestionDTO,
  QuestionBankQuestionFormDTO,
  QuestionBankRepoDTO,
  QuestionBankRepoFormDTO
}

export async function listRepos(): Promise<QuestionBankRepoDTO[]> {
  const { data } = await http.get<ApiResponse<QuestionBankRepoDTO[]>>('/repos')
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

export async function listBankQuestions(repoId: number): Promise<QuestionBankQuestionDTO[]> {
  const { data } = await http.get<ApiResponse<QuestionBankQuestionDTO[]>>(`/repos/${repoId}/questions`)
  return data.data || []
}

export async function addBankQuestion(repoId: number, payload: Partial<QuestionBankQuestionFormDTO>): Promise<QuestionBankQuestionDTO> {
  const { data } = await http.post<ApiResponse<QuestionBankQuestionDTO>>(`/repos/${repoId}/questions`, payload)
  return data.data!
}

export async function removeBankQuestion(repoId: number, qId: number): Promise<void> {
  await http.delete(`/repos/${repoId}/questions/${qId}`)
}
