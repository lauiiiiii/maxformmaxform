export interface MessageDTO {
  id?: number
  title: string
  content?: string
  read?: boolean
  createdAt?: string
}

export async function listMessages(): Promise<MessageDTO[]> { return [] }
export async function markMessageRead(_id: number): Promise<void> {}
