export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  error?: {
    code: string
    message: string
  }
}

export interface PaginatedData<T> {
  total: number
  list: T[]
}
