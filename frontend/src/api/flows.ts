export interface FlowDTO {
  id?: number
  name: string
  status?: string
}

export async function listFlows(): Promise<FlowDTO[]> { return [] }
