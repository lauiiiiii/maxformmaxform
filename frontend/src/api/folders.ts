import http from './http'
import type { ApiResponse } from '../types/api'

export interface FolderDTO {
  id: number
  name: string
  parentId?: number | null
  surveyCount?: number
}

export async function listFolders(_parentId?: number | null): Promise<FolderDTO[]> {
  return []
}

export async function listAllFolders(): Promise<FolderDTO[]> {
  return []
}

export async function createFolder(_payload: { name: string; parentId?: number | null }): Promise<FolderDTO> {
  return { id: 0, name: _payload.name }
}

export async function renameFolder(_id: number, _name: string): Promise<FolderDTO> {
  return { id: _id, name: _name }
}

export async function deleteFolder(_id: number): Promise<void> {}

export async function moveSurveyToFolder(_surveyId: number | string, _folderId: number | null): Promise<void> {}
