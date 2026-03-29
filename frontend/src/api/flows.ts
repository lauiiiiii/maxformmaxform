import http from './http'
import type { ApiResponse } from '../types/api'
import type { FlowDTO, FlowFormDTO } from '../../../shared/management.contract.js'

export type { FlowDTO, FlowFormDTO }

export async function listFlows(): Promise<FlowDTO[]> {
  const { data } = await http.get<ApiResponse<FlowDTO[]>>('/flows')
  return data.data || []
}

export async function createFlow(payload: FlowFormDTO): Promise<FlowDTO> {
  const { data } = await http.post<ApiResponse<FlowDTO>>('/flows', payload)
  return data.data!
}

export async function updateFlow(id: number, payload: Partial<FlowFormDTO>): Promise<FlowDTO> {
  const { data } = await http.put<ApiResponse<FlowDTO>>(`/flows/${id}`, payload)
  return data.data!
}

export async function deleteFlow(id: number): Promise<void> {
  await http.delete(`/flows/${id}`)
}
