<template>
  <div class="project-page">
    <h1>问卷管理</h1>
    <section class="toolbar">
      <button @click="showDialog = true">新建问卷</button>
    </section>
    <table v-if="projects.length" class="projects">
      <thead>
        <tr>
          <th>ID</th>
          <th>标题</th>
          <th>状态</th>
          <th>创建时间</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="p in projects" :key="p._id">
          <td>{{ p._id }}</td>
          <td>{{ p.title }}</td>
          <td>{{ p.status }}</td>
          <td>{{ formatDate(p.createdAt) }}</td>
          <td>
            <button @click="edit(p)">编辑</button>
            <button @click="remove(p._id)">删除</button>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-else class="empty">暂无问卷</p>
    <div v-if="showDialog" class="dialog">
      <h3>{{ editing ? '编辑问卷' : '新建问卷' }}</h3>
      <label>标题：<input v-model="form.title" /></label>
      <label>描述：<input v-model="form.description" /></label>
      <button @click="save">保存</button>
      <button @click="close">取消</button>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { listSurveys as listProjects } from '@/api/surveys'
const createProject = async (_p: any) => {}
const updateProject = async (_id: any, _p: any) => {}
const deleteProject = async (_id: any) => {}
const projects = ref<any[]>([])
const showDialog = ref(false)
const editing = ref(false)
const form = ref<any>({ title: '', description: '' })
const editId = ref<string>('')

function formatDate(d?: string) {
  if (!d) return '-'
  return new Date(d).toLocaleString()
}
async function load() {
  projects.value = await listProjects()
}
function edit(p: any) {
  editing.value = true
  showDialog.value = true
  form.value = { title: p.title, description: p.description }
  editId.value = p._id
}
function close() {
  showDialog.value = false
  editing.value = false
  form.value = { title: '', description: '' }
  editId.value = ''
}
async function save() {
  if (editing.value) {
    await updateProject(editId.value, form.value)
  } else {
    await createProject(form.value)
  }
  close()
  await load()
}
async function remove(id: string) {
  await deleteProject(id)
  await load()
}
onMounted(load)
</script>
<style scoped>
.project-page { padding: 16px; }
.toolbar { margin-bottom: 12px; }
.projects { width: 100%; border-collapse: collapse; }
.projects th, .projects td { border: 1px solid #ddd; padding: 6px 8px; }
.empty { color: #888; }
.dialog { position: fixed; top: 30%; left: 50%; transform: translate(-50%, -30%); background: #fff; border: 1px solid #ccc; padding: 24px; z-index: 1000; }
</style>
