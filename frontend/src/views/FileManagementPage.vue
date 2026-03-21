<template>
  <div class="file-page">
    <h1>附件管理</h1>
    <section class="toolbar">
      <button @click="showDialog = true">上传附件</button>
    </section>
    <table v-if="files.length" class="files">
      <thead>
        <tr>
          <th>ID</th>
          <th>名称</th>
          <th>类型</th>
          <th>大小</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="f in files" :key="f._id">
          <td>{{ f._id }}</td>
          <td>{{ f.name }}</td>
          <td>{{ f.type }}</td>
          <td>{{ f.size }}</td>
          <td>
            <button @click="remove(f._id)">删除</button>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-else class="empty">暂无附件</p>
    <div v-if="showDialog" class="dialog">
      <h3>上传附件</h3>
      <label>名称：<input v-model="form.name" /></label>
      <label>类型：<input v-model="form.type" /></label>
      <label>大小：<input v-model.number="form.size" type="number" /></label>
      <label>URL：<input v-model="form.url" /></label>
      <button @click="save">保存</button>
      <button @click="close">取消</button>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import http from '@/api/http'
const listFiles = async () => { const { data } = await http.get('/files'); return data.data?.list || [] }
const createFile = async (f: any) => { await http.post('/files/upload', f) }
const deleteFile = async (id: number) => { await http.delete(`/files/${id}`) }
const files = ref<any[]>([])
const showDialog = ref(false)
const form = ref<any>({ name: '', type: '', size: 0, url: '' })

async function load() {
  files.value = await listFiles()
}
function close() {
  showDialog.value = false
  form.value = { name: '', type: '', size: 0, url: '' }
}
async function save() {
  await createFile(form.value)
  close()
  await load()
}
async function remove(id: string) {
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
.dialog { position: fixed; top: 30%; left: 50%; transform: translate(-50%, -30%); background: #fff; border: 1px solid #ccc; padding: 24px; z-index: 1000; }
</style>
