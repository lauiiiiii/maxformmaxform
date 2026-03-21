<template>
  <div>
    <h3>个人信息管理</h3>
    <el-form label-width="100px">
      <el-form-item label="用户名">
        <el-input v-model="profile.username" />
      </el-form-item>
      <el-form-item label="邮箱">
        <el-input v-model="profile.email" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary">保存</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue';
const profile = ref({ username: '普通用户', email: '' });
</script>
