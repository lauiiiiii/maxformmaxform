export interface PositionDTO {
  id?: number
  name: string
  code?: string
}

export async function listPositions(): Promise<PositionDTO[]> {
  return []
}

export async function createPosition(_payload: Partial<PositionDTO>): Promise<PositionDTO> {
  return { name: '' }
}
