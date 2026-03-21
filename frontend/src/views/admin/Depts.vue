<template>
  <div>
    <h3>部门管理</h3>
    <el-form :inline="true" class="ops">
      <el-form-item>
        <el-input v-model="form.name" placeholder="部门名称" />
      </el-form-item>
      <el-form-item>
        <el-input v-model="form.code" placeholder="编码 (如 D001)" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="create">新增</el-button>
      </el-form-item>
    </el-form>
    <el-table :data="depts" size="small" style="width:100%">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="name" label="部门名称" />
      <el-table-column prop="code" label="编码" width="140" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">{{ row.status === 'enabled' ? 1 : 0 }}</template>
      </el-table-column>
      <el-table-column label="操作" width="180">
        <template #default="{ row }">
          <el-button size="small" @click="toggle(row)">{{ row.status==='enabled'?'禁用':'启用' }}</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { listDepts, createDept, updateDept, type DeptDTO } from '@/api/depts'
const depts = ref<DeptDTO[]>([])
const form = ref<any>({ name:'', code:'' })
const load = async()=>{ depts.value = await listDepts() }
const create = async()=>{ await createDept({ name: form.value.name, code: form.value.code }); form.value={ name:'', code:'' }; await load() }
const toggle = async(d:DeptDTO)=>{ await updateDept(d.id, { status: d.status==='enabled'?'disabled':'enabled' } as any); await load() }
onMounted(load)
</script>
