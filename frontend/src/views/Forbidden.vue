<template>
  <div class="forbidden" data-testid="forbidden-page">
    <el-result icon="warning" title="403 无权限" sub-title="仅管理员可访问此页面">
      <template #extra>
        <el-button type="primary" @click="$router.push('/user-dashboard')">返回工作台</el-button>
      </template>
    </el-result>
  </div>
</template>
<script setup lang="ts"></script>
<style scoped>
.forbidden { padding: 48px 24px; }
</style>
