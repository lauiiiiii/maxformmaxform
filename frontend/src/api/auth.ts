import http from './http'
import type { ApiResponse } from '../types/api'
import type { User, Role } from '../types/user'

interface LoginResponse {
  token: string
  user: User
}

interface MeResponse {
  user: User
  role: Role | null
}

export async function loginApi(username: string, password: string): Promise<LoginResponse> {
  const { data } = await http.post<ApiResponse<LoginResponse>>('/auth/login', { username, password })
  return data.data!
}

export async function registerApi(username: string, password: string, email?: string): Promise<LoginResponse> {
  const { data } = await http.post<ApiResponse<LoginResponse>>('/auth/register', { username, password, email })
  return data.data!
}

export async function meApi(): Promise<MeResponse> {
  const { data } = await http.get<ApiResponse<MeResponse>>('/auth/me')
  return data.data!
}
