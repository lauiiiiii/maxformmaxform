import http from './http'
import type { ApiResponse } from '../types/api'
import type {
  FileDTO,
  FileListQueryDTO,
  FilePageDTO
} from '../../../shared/management.contract.js'

export type { FileDTO, FileListQueryDTO, FilePageDTO }

export async function listFiles(params?: FileListQueryDTO): Promise<FilePageDTO> {
  const { data } = await http.get<ApiResponse<FilePageDTO>>('/files', { params })
  return data.data || { list: [], total: 0, page: 1, pageSize: 20 }
}

export async function deleteFile(id: number | string): Promise<void> {
  await http.delete(`/files/${id}`)
}
