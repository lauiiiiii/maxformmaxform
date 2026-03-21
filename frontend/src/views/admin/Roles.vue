<template>
  <div>
    <h3>角色管理</h3>
    <el-form :inline="true" class="ops">
      <el-form-item>
        <el-input v-model="form.name" placeholder="角色名" />
      </el-form-item>
      <el-form-item>
        <el-input v-model="form.code" placeholder="编码 (如 admin)" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="create">新增</el-button>
      </el-form-item>
    </el-form>
    <el-table :data="roles" size="small" style="width:100%">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="name" label="角色名" />
      <el-table-column prop="code" label="编码" width="140" />
      <el-table-column prop="status" label="状态" width="100" />
      <el-table-column label="操作" width="180">
        <template #default="{ row }">
          <el-button size="small" @click="toggle(row)">{{ row.status===1?'禁用':'启用' }}</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { listRoles, createRole, updateRole, type RoleDTO } from '@/api/roles'
const roles = ref<RoleDTO[]>([])
const form = ref({ name:'', code:'' })
const load = async()=>{ roles.value = await listRoles() }
const create = async()=>{ await createRole(form.value); form.value={name:'',code:''}; await load() }
const toggle = async(r:RoleDTO)=>{ await updateRole(r.id, { status: r.status===1?0:1 }); await load() }
onMounted(load)
</script>
