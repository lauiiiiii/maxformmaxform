<!-- 问卷结果（最小可用版） -->
<template>
  <div class="page">
    <div v-if="loading">加载中...</div>
    <div v-else-if="!stats">未找到结果</div>
    <div v-else class="panel">
      <div class="row">
        <div class="item">
          <div class="label">总提交数</div>
          <div class="val">{{ stats.totalSubmissions }}</div>
        </div>
        <div class="item">
          <div class="label">最近提交时间</div>
          <div class="val">{{ stats.lastSubmitAt || '—' }}</div>
        </div>
      </div>
      <p class="hint">提示：这是内存版简易统计，重启将清空数据。</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getResults } from '@/api/surveys'

const route = useRoute()
const loading = ref(true)
const stats = ref<{ totalSubmissions: number; lastSubmitAt: string | null } | null>(null)

onMounted(async () => {
  try {
    const id = String(route.params.id || '')
    stats.value = await getResults(id)
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.page { max-width: 800px; margin: 24px auto; padding: 0 16px; }
.panel { background: #fff; border: 1px solid #eee; border-radius: 8px; padding: 16px 20px; }
.row { display: flex; gap: 16px; }
.item { flex: 1; background: #fafafa; border: 1px solid #f0f0f0; border-radius: 6px; padding: 12px; }
.label { color: #666; margin-bottom: 6px; }
.val { font-size: 20px; font-weight: 700; }
.hint { color: #888; margin-top: 12px; }
</style>
