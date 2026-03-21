<template>
  <div>
    <h3>审批流与日志</h3>
    <!-- 问卷发布审批、数据导出审批、操作日志 -->
    <el-table :data="logs">
      <el-table-column prop="action" label="操作" />
      <el-table-column prop="user" label="操作人" />
      <el-table-column prop="time" label="时间" />
    </el-table>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue';
const logs = ref([
  { action: '发布问卷', user: '张三', time: '2025-09-20 10:00' },
  { action: '导出数据', user: '李四', time: '2025-09-20 11:00' }
]);
</script>
