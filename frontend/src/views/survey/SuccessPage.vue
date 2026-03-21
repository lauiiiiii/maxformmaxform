<!-- 答题成功页面 -->
<template>
  <div class="success-page">
    <div class="success-container">
      <div class="success-content">
        <!-- 成功图标 -->
        <div class="success-icon">
          <svg viewBox="0 0 24 24" width="80" height="80">
            <circle cx="12" cy="12" r="10" fill="#67C23A" />
            <path d="M9 12l2 2 4-4" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </div>
        
        <!-- 成功信息 -->
        <h2 class="success-title">提交成功！</h2>
        <p class="success-message">{{ message || '感谢您的参与，您的答案已成功提交。' }}</p>
        
        <!-- 问卷信息 -->
        <div class="survey-info" v-if="surveyTitle">
          <p class="survey-title">{{ surveyTitle }}</p>
        </div>
        
        <!-- 操作按钮 -->
        <div class="actions">
          <el-button type="primary" @click="goHome">返回首页</el-button>
          <el-button @click="fillAgain" v-if="allowRefill">再次填写</el-button>
        </div>
        
        <!-- 感谢语 -->
        <div class="thank-note">
          <p>您的意见对我们很重要</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const message = ref('')
const surveyTitle = ref('')
const allowRefill = ref(true)

onMounted(() => {
  // 从路由参数中获取信息
  message.value = route.query.message as string || '感谢您的参与，您的答案已成功提交。'
  surveyTitle.value = route.query.title as string || ''
})

const goHome = () => {
  router.push('/')
}

const fillAgain = () => {
  // 返回到填写页面
  const surveyId = route.params.id
  if (surveyId) {
    router.push(`/s/${surveyId}`)
  } else {
    router.push('/')
  }
}
</script>

<style scoped>
.success-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 20px;
  box-sizing: border-box;
}

.success-container {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  padding: 60px 40px;
  text-align: center;
  max-width: 500px;
  width: 100%;
  box-sizing: border-box;
  transition: border-radius .2s, box-shadow .2s, padding .2s;
}

.success-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

.success-icon {
  animation: bounce 0.6s ease-in-out;
}

@keyframes bounce {
  0%, 20%, 53%, 80%, 100% {
    transform: translate3d(0, 0, 0);
  }
  40%, 43% {
    transform: translate3d(0, -10px, 0);
  }
  70% {
    transform: translate3d(0, -5px, 0);
  }
  90% {
    transform: translate3d(0, -2px, 0);
  }
}

.success-title {
  font-size: 28px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.success-message {
  font-size: 16px;
  color: #606266;
  line-height: 1.6;
  margin: 0;
}

.survey-info {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  width: 100%;
}

.survey-title {
  font-size: 14px;
  color: #909399;
  margin: 0;
}

.actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
}

.actions .el-button {
  min-width: 120px;
}

.thank-note {
  border-top: 1px solid #ebeef5;
  padding-top: 20px;
  width: 100%;
}

.thank-note p {
  font-size: 14px;
  color: #909399;
  margin: 0;
}

/* ====== 移动端全屏纯白风格（与移动答题页一致） ====== */
@media (max-width: 768px) {
  .success-page {
    background:#fff; /* 去除渐变 */
    padding:0; /* 贴边 */
    align-items: flex-start; /* 顶部开始 */
  }
  .success-container {
    border-radius:0;
    box-shadow:none;
    max-width:none;
    padding:48px 22px 64px; /* 适配触控空间 */
    margin:0; /* 全宽 */
    text-align:center;
  }
  .success-title { font-size:24px; }
  .success-message { font-size:15px; }
  .survey-info { padding:14px 14px; }
  .actions { flex-direction: column; gap:14px; }
  .actions .el-button { width:100%; max-width:none; height:48px; font-size:16px; }
  .thank-note { margin-top:12px; padding-top:18px; }
  .success-icon svg { width:72px; height:72px; }
}
</style>