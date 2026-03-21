<template>
  <div>
    <h3>流程列表</h3>
    <el-table :data="flows" size="small" style="width:100%">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="name" label="流程名称" />
      <el-table-column prop="status" label="状态" width="120" />
      <el-table-column label="操作" width="160">
        <template #default="{ row }">
          <el-button size="small">查看</el-button>
          <el-button size="small" type="danger">停用</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { listFlows, type FlowDTO } from '@/api/flows'
const flows = ref<FlowDTO[]>([])
const load = async()=>{ flows.value = await listFlows() }
onMounted(load)
</script>
