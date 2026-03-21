<template>
  <div>
    <h3>岗位管理</h3>
    <el-form :inline="true" class="ops">
      <el-form-item>
        <el-input v-model="form.name" placeholder="岗位名称" />
      </el-form-item>
      <el-form-item>
        <el-input v-model="form.code" placeholder="编码" />
      </el-form-item>
      <el-form-item>
        <el-switch v-model="form.isVirtual" active-text="虚拟岗位" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="create">新增</el-button>
      </el-form-item>
    </el-form>
    <el-table :data="positions" size="small" style="width:100%">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="name" label="岗位名称" />
      <el-table-column prop="code" label="编码" width="140" />
      <el-table-column prop="isVirtual" label="虚拟" width="100">
        <template #default="{ row }">
          <el-tag :type="row.isVirtual?'warning':'success'">{{ row.isVirtual?'是':'否' }}</el-tag>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { listPositions, createPosition, type PositionDTO } from '@/api/positions'
const positions = ref<PositionDTO[]>([])
const form = ref<any>({ name:'', code:'', isVirtual:false })
const load = async()=>{ positions.value = await listPositions() }
const create = async()=>{ await createPosition(form.value); form.value={ name:'', code:'', isVirtual:false }; await load() }
onMounted(load)
</script>
