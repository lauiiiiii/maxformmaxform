<template>
  <div class="question-page">
    <h1>题目管理</h1>
    <section class="toolbar">
      <input v-model="surveyId" placeholder="问卷ID" />
      <button @click="load">查询</button>
      <button @click="showDialog = true">新建题目</button>
    </section>
    <table v-if="questions.length" class="questions">
      <thead>
        <tr>
          <th>ID</th>
          <th>标题</th>
          <th>类型</th>
          <th>顺序</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="q in questions" :key="q._id">
          <td>{{ q._id }}</td>
          <td>{{ q.title }}</td>
          <td>{{ q.type }}</td>
          <td>{{ q.order }}</td>
          <td>
            <button @click="edit(q)">编辑</button>
            <button @click="remove(q._id)">删除</button>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-else class="empty">暂无题目</p>
    <div v-if="showDialog" class="dialog">
      <h3>{{ editing ? '编辑题目' : '新建题目' }}</h3>
      <label>标题：<input v-model="form.title" /></label>
      <label>类型：<input v-model="form.type" /></label>
      <label>顺序：<input v-model.number="form.order" type="number" /></label>
      <button @click="save">保存</button>
      <button @click="close">取消</button>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue'
const listQuestions = async () => [] as any[]
const createQuestion = async (_q: any) => {}
const updateQuestion = async (_id: any, _q: any) => {}
const deleteQuestion = async (_id: any) => {}
const questions = ref<any[]>([])
const showDialog = ref(false)
const editing = ref(false)
const form = ref<any>({ title: '', type: '', order: 1 })
const editId = ref<string>('')
const surveyId = ref('')

async function load() {
  questions.value = await listQuestions(surveyId.value)
}
function edit(q: any) {
  editing.value = true
  showDialog.value = true
  form.value = { title: q.title, type: q.type, order: q.order }
  editId.value = q._id
}
function close() {
  showDialog.value = false
  editing.value = false
  form.value = { title: '', type: '', order: 1 }
  editId.value = ''
}
async function save() {
  if (editing.value) {
    await updateQuestion(editId.value, form.value)
  } else {
    await createQuestion({ ...form.value, surveyId: surveyId.value })
  }
  close()
  await load()
}
async function remove(id: string) {
  await deleteQuestion(id)
  await load()
}
</script>
<style scoped>
.question-page { padding: 16px; }
.toolbar { margin-bottom: 12px; }
.questions { width: 100%; border-collapse: collapse; }
.questions th, .questions td { border: 1px solid #ddd; padding: 6px 8px; }
.empty { color: #888; }
.dialog { position: fixed; top: 30%; left: 50%; transform: translate(-50%, -30%); background: #fff; border: 1px solid #ccc; padding: 24px; z-index: 1000; }
</style>
