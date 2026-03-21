<template>
  <div class="admin-overview">
    <h2 class="title">总览</h2>
    <div class="grid">
      <el-card class="card"><div class="num">--</div><div class="lbl">问卷总数</div></el-card>
      <el-card class="card"><div class="num">--</div><div class="lbl">成员总数</div></el-card>
      <el-card class="card"><div class="num">--</div><div class="lbl">今日新增答卷</div></el-card>
      <el-card class="card"><div class="num">--</div><div class="lbl">待审批事项</div></el-card>
    </div>
  </div>
  
</template>

<script setup lang="ts">
// 可扩展：权限校验、动态菜单等
</script>

<style scoped>
.admin-overview { padding: 8px; }
.title { font-size:18px; font-weight:600; margin:0 0 16px; }
.grid { display:grid; grid-template-columns: repeat(auto-fill,minmax(220px,1fr)); gap:16px; }
.card { text-align:center; }
.num { font-size:26px; font-weight:700; color:#1f2937; }
.lbl { color:#6b7280; margin-top:6px; }
</style>
