<template>
  <div class="admin-shell">
    <header class="admin-header">
      <div class="title">企业管理后台</div>
      <div class="spacer" />
      <div class="right">
        <el-button text @click="$router.push('/user-dashboard')">返回工作台</el-button>
      </div>
    </header>
    <div class="admin-body">
      <aside class="admin-aside">
        <el-menu :default-active="activePath" router class="admin-menu" unique-opened>
          <el-menu-item index="/admin/overview">总览</el-menu-item>
          <el-sub-menu index="form">
            <template #title>表单管理</template>
            <el-menu-item index="/admin/surveys">问卷管理</el-menu-item>
            <el-menu-item index="/admin/repos">题库管理</el-menu-item>
            <el-menu-item index="/admin/flows">流程列表</el-menu-item>
          </el-sub-menu>
          <el-sub-menu index="user">
            <template #title>用户管理</template>
            <el-menu-item index="/admin/members">成员管理</el-menu-item>
            <el-menu-item index="/admin/roles">角色管理</el-menu-item>
            <el-menu-item index="/admin/depts">部门管理</el-menu-item>
            <el-menu-item index="/admin/positions">岗位管理</el-menu-item>
          </el-sub-menu>
          <el-sub-menu index="system">
            <template #title>系统管理</template>
            <el-menu-item index="/admin/enterprise">企业信息</el-menu-item>
            <el-menu-item index="/admin/config">系统配置</el-menu-item>
            <el-menu-item index="/admin/statistics">数据统计</el-menu-item>
            <el-menu-item index="/admin/approval">审批与日志</el-menu-item>
          </el-sub-menu>
          <el-menu-item index="/admin/messages">消息中心</el-menu-item>
          <el-menu-item index="/admin/profile">个人中心</el-menu-item>
        </el-menu>
      </aside>
      <main class="admin-main">
        <router-view />
      </main>
    </div>
  </div>
  
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
const route = useRoute()
const activePath = computed(() => {
  // 高亮到二级路径，例如 /admin/members
  const p = route.path
  if (p.startsWith('/admin/')) return p
  return '/admin/overview'
})
</script>

<style scoped>
.admin-shell { display:flex; flex-direction:column; min-height:100vh; background:#f6f8fb; }
.admin-header { height:56px; background:#fff; display:flex; align-items:center; padding:0 16px; border-bottom:1px solid #e5e7eb; }
.title { font-weight:600; font-size:16px; color:#111827; }
.spacer { flex:1; }
.admin-body { display:flex; min-height: calc(100vh - 56px); }
.admin-aside { width: 220px; background:#fff; border-right:1px solid #e5e7eb; }
.admin-menu { border-right:0; }
.admin-main { flex:1; padding: 20px 24px 40px; }
</style>
