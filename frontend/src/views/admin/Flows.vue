<template>
  <div data-testid="admin-flows-page">
    <h3>流程列表</h3>
    <el-table :data="flows" size="small" style="width: 100%" data-testid="admin-flows-table">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column label="流程名称">
        <template #default="{ row }">
          <span :data-testid="`flow-name-${row.id}`">{{ row.name }}</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="120">
        <template #default="{ row }">
          <span :data-testid="`flow-status-${row.id}`">{{ row.status || '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="160">
        <template #default="{ row }">
          <el-button size="small" :data-testid="`flow-view-button-${row.id}`">查看</el-button>
          <el-button size="small" type="danger" :data-testid="`flow-disable-button-${row.id}`">停用</el-button>
        </template>
      </el-table-column>
    </el-table>
    <div v-if="!flows.length" data-testid="admin-flows-empty">暂无流程</div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { listFlows, type FlowDTO } from '@/api/flows'

const flows = ref<FlowDTO[]>([])

const load = async () => {
  flows.value = await listFlows()
}

onMounted(load)
</script>
