<script setup lang="ts">
import { useDarkStore } from '@/stores/dark'

const darkStore = useDarkStore()
</script>

<template>
  <router-view :class="{ dark: darkStore.dark }" />
</template>
