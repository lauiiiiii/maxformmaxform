<template>
  <div class="dept-page">
    <h1>部门管理</h1>
    <section class="toolbar">
      <button @click="showDialog = true">新建部门</button>
    </section>
    <table v-if="depts.length" class="depts">
      <thead>
        <tr>
          <th>ID</th>
          <th>名称</th>
          <th>上级部门</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="d in depts" :key="d._id">
          <td>{{ d._id }}</td>
          <td>{{ d.name }}</td>
          <td>{{ d.parentId || '-' }}</td>
          <td>
            <button @click="edit(d)">编辑</button>
            <button @click="remove(d._id)">删除</button>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-else class="empty">暂无部门</p>
    <div v-if="showDialog" class="dialog">
      <h3>{{ editing ? '编辑部门' : '新建部门' }}</h3>
      <label>名称：<input v-model="form.name" /></label>
      <label>上级部门ID：<input v-model="form.parentId" /></label>
      <button @click="save">保存</button>
      <button @click="close">取消</button>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { listDepts, createDept, updateDept, deleteDept } from '@/api/depts'
const depts = ref<any[]>([])
const showDialog = ref(false)
const editing = ref(false)
const form = ref<any>({ name: '', parentId: '' })
const editId = ref<string>('')

async function load() {
  depts.value = await listDepts()
}
function edit(d: any) {
  editing.value = true
  showDialog.value = true
  form.value = { name: d.name, parentId: d.parentId }
  editId.value = d._id
}
function close() {
  showDialog.value = false
  editing.value = false
  form.value = { name: '', parentId: '' }
  editId.value = ''
}
async function save() {
  if (editing.value) {
    await updateDept(editId.value, form.value)
  } else {
    await createDept(form.value)
  }
  close()
  await load()
}
async function remove(id: string) {
  await deleteDept(id)
  await load()
}
onMounted(load)
</script>
<style scoped>
.dept-page { padding: 16px; }
.toolbar { margin-bottom: 12px; }
.depts { width: 100%; border-collapse: collapse; }
.depts th, .depts td { border: 1px solid #ddd; padding: 6px 8px; }
.empty { color: #888; }
.dialog { position: fixed; top: 30%; left: 50%; transform: translate(-50%, -30%); background: #fff; border: 1px solid #ccc; padding: 24px; z-index: 1000; }
</style>
