<template>
  <div class="file-page" data-testid="admin-files-page">
    <h1>闄勪欢绠＄悊</h1>
    <section class="toolbar">
      <button data-testid="files-refresh-button" @click="load">鍒锋柊</button>
    </section>
    <table v-if="files.length" class="files" data-testid="admin-files-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>鍚嶇О</th>
          <th>绫诲瀷</th>
          <th>澶у皬</th>
          <th>鎿嶄綔</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="file in files" :key="file.id" :data-testid="`file-row-${file.id}`">
          <td>{{ file.id }}</td>
          <td>
            <span :data-testid="`file-name-${file.id}`">{{ file.name }}</span>
          </td>
          <td>
            <span :data-testid="`file-type-${file.id}`">{{ file.type || '-' }}</span>
          </td>
          <td>
            <span :data-testid="`file-size-${file.id}`">{{ file.size ?? '-' }}</span>
          </td>
          <td>
            <button :data-testid="`file-delete-button-${file.id}`" @click="remove(file.id)">鍒犻櫎</button>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-else class="empty" data-testid="admin-files-empty">鏆傛棤闄勪欢</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { deleteFile, listFiles, type FileDTO } from '@/api/files'

const files = ref<FileDTO[]>([])

async function load() {
  const result = await listFiles()
  files.value = result.list
}

async function remove(id: number) {
  if (!window.confirm(`Delete file #${id}? This action cannot be undone.`)) return
  await deleteFile(id)
  await load()
}

onMounted(load)
</script>

<style scoped>
.file-page { padding: 16px; }
.toolbar { margin-bottom: 12px; }
.files { width: 100%; border-collapse: collapse; }
.files th, .files td { border: 1px solid #ddd; padding: 6px 8px; }
.empty { color: #888; }
</style>
