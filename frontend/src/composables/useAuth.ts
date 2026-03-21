import { useAuthStore } from '../stores/auth'
import { storeToRefs } from 'pinia'

export const useAuth = () => {
  const store = useAuthStore()
  const { token, user, role, isLoggedIn, isAdmin, username } = storeToRefs(store)

  return {
    token, user, role, isLoggedIn, isAdmin, username,
    login: store.login,
    register: store.register,
    logout: store.logout,
    fetchMe: store.fetchMe
  }
}
