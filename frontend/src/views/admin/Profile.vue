<template>
  <div>
    <h3>个人中心</h3>
    <el-descriptions :column="2" border>
      <el-descriptions-item label="账号">{{ me.username }}</el-descriptions-item>
      <el-descriptions-item label="角色">{{ me.role }}</el-descriptions-item>
      <el-descriptions-item label="邮箱" :span="2">{{ me.email || '——' }}</el-descriptions-item>
    </el-descriptions>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { meApi } from '@/api/auth'
const me = ref<any>({ username:'', role:'', email:'' })
const load = async()=>{ try { const r = await meApi(); me.value = r.user || {} } catch {} }
onMounted(load)
</script>
