export interface User {
  id: number
  username: string
  email?: string
  role_id?: number
  dept_id?: number
  avatar?: string
  is_active: boolean
  last_login_at?: string
  created_at: string
  updated_at: string
}

export interface Role {
  id: number
  name: string
  code: string
  permissions?: string[]
  remark?: string
  created_at: string
}

export interface Dept {
  id: number
  name: string
  parent_id?: number
  sort_order: number
  created_at: string
  children?: Dept[]
}
