import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useDarkStore = defineStore(
  'dark',
  () => {
    const dark = ref(false)

    const setDark = (val: boolean) => {
      dark.value = val
    }

    return { dark, setDark }
  },
  {
    persist: true,
  },
)
