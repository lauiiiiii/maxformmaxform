<template>
  <div>
    <h3>我的问卷管理</h3>
    <el-table :data="surveys">
      <el-table-column prop="title" label="问卷标题" />
      <el-table-column prop="status" label="状态" />
      <el-table-column label="操作">
        <template #default="scope">
          <el-button size="small">编辑</el-button>
          <el-button size="small" type="danger">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-button type="primary" style="margin-top:16px;">新建问卷</el-button>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue';
const surveys = ref([
  { title: '员工满意度调查', status: '已发布' },
  { title: '产品反馈问卷', status: '草稿' }
]);
</script>
