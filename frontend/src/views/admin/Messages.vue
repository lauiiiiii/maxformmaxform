<template>
  <div data-testid="admin-messages-page">
    <h3>消息中心</h3>
    <el-table :data="msgs" size="small" style="width: 100%" data-testid="admin-messages-table">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column label="标题">
        <template #default="{ row }">
          <span :data-testid="`message-title-${row.id}`">{{ row.title }}</span>
        </template>
      </el-table-column>
      <el-table-column label="级别" width="100">
        <template #default="{ row }">
          <span :data-testid="`message-level-${row.id}`">{{ row.level }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="时间" width="180" />
      <el-table-column label="操作" width="140">
        <template #default="{ row }">
          <el-button
            size="small"
            type="primary"
            :data-testid="`message-read-button-${row.id}`"
            @click="markRead(row)"
          >
            已读
          </el-button>
        </template>
      </el-table-column>
    </el-table>
    <div v-if="!msgs.length" data-testid="admin-messages-empty">暂无消息</div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { listMessages, markMessageRead, type MessageDTO } from '@/api/messages'

const msgs = ref<MessageDTO[]>([])

const load = async () => {
  msgs.value = (await listMessages()).list
}

const markRead = async (m: MessageDTO) => {
  if (m.id == null) return
  await markMessageRead(m.id)
  await load()
}

onMounted(load)
</script>
