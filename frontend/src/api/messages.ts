import http from './http'
import type { ApiResponse } from '../types/api'
import type {
  MessageDTO,
  MessageListQueryDTO,
  MessagePageDTO
} from '../../../shared/management.contract.js'

export type { MessageDTO, MessageListQueryDTO, MessagePageDTO }

export async function listMessages(params?: MessageListQueryDTO): Promise<MessagePageDTO> {
  const { data } = await http.get<ApiResponse<MessagePageDTO>>('/messages', { params })
  return data.data || { list: [], total: 0, page: 1, pageSize: 50 }
}

export async function markMessageRead(id: number): Promise<void> {
  await http.post(`/messages/${id}/read`)
}
