<template>
  <div class="mobile-fill-page" :class="{ embed: preview }">
    <FillSurveyPage
      class="mobile-fill-inner"
      :injectedSurvey="injectedSurvey ?? undefined"
      :preview="preview"
    />
  </div>
</template>

<script setup lang="ts">
import FillSurveyPage from './FillSurveyPage.vue'
import type { Survey } from '@/types/survey'

defineProps<{
  injectedSurvey?: Survey | null
  preview?: boolean
}>()
</script>

<style scoped>
/* ========== 页面容器 ========== */
.mobile-fill-page {
  min-height: 100vh;
  min-height: 100dvh;
  background: #fff;
}

.mobile-fill-page.embed {
  min-height: auto;
  background: transparent;
}

/* ========== 整体布局 ========== */
.mobile-fill-inner :deep(.page) {
  max-width: none;
  margin: 0;
  padding: 0 0 80px;
}

.mobile-fill-inner :deep(.page.embed) {
  padding: 0 0 28px;
}

.mobile-fill-inner :deep(.survey-wrapper),
.mobile-fill-inner :deep(.survey-container) {
  width: 100%;
}

.mobile-fill-inner :deep(.qr-section-outside) {
  display: none !important;
}

/* ========== 卡片/内容区 ========== */
.mobile-fill-inner :deep(.paper) {
  border: none;
  border-radius: 0;
  box-shadow: none;
  padding: 20px 16px 32px;
  background: #fff;
}

.mobile-fill-inner :deep(.paper .el-card__body) {
  padding: 0;
}

.mobile-fill-inner :deep(.paper-header) {
  padding: 0;
}

.mobile-fill-inner :deep(.paper-title) {
  margin: 0 0 20px;
  font-size: 22px;
  font-weight: 700;
  line-height: 1.35;
  color: #0f172a;
  text-align: center;
}

.mobile-fill-inner :deep(.desc) {
  margin: 0 0 16px;
  color: #64748b;
  font-size: 14px;
  line-height: 1.65;
}

/* ========== 进度条 ========== */
.mobile-fill-inner :deep(.progress-panel) {
  margin: 0 0 20px;
  padding: 12px 14px;
  background: #f8fafc;
  border-radius: 12px;
}

.mobile-fill-inner :deep(.progress-copy) {
  margin-bottom: 6px;
  color: #94a3b8;
  font-size: 12px;
}

/* ========== 表单区域 ========== */
.mobile-fill-inner :deep(.q-form) {
  padding: 0;
}

.mobile-fill-inner :deep(.q-item) {
  margin-bottom: 24px;
  padding: 0;
}

.mobile-fill-inner :deep(.q-item .el-form-item__label) {
  margin-bottom: 10px;
  padding: 0;
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
  line-height: 1.5;
}

.mobile-fill-inner :deep(.q-label) {
  display: flex;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 2px 6px;
}

.mobile-fill-inner :deep(.q-number) {
  min-width: auto;
  color: #3b82f6;
  font-weight: 700;
}

.mobile-fill-inner :deep(.q-required) {
  color: #ef4444;
}

.mobile-fill-inner :deep(.q-optional-tag) {
  color: #94a3b8;
  font-size: 12px;
  font-weight: 400;
  margin-left: 2px;
}

.mobile-fill-inner :deep(.q-desc) {
  margin: 4px 0 10px;
  color: #64748b;
  font-size: 13px;
  line-height: 1.6;
}

/* ========== 输入框统一 ========== */
.mobile-fill-inner :deep(.el-input__inner),
.mobile-fill-inner :deep(.el-textarea__inner) {
  min-height: 48px;
  border-radius: 10px;
  font-size: 15px;
}

.mobile-fill-inner :deep(.el-select) {
  width: 100% !important;
}

.mobile-fill-inner :deep(.el-select .el-input__inner) {
  min-height: 48px;
}

/* ========== 单选/多选 ========== */
.mobile-fill-inner :deep(.opt-vertical) {
  gap: 2px;
}

.mobile-fill-inner :deep(.opt-vertical .el-radio),
.mobile-fill-inner :deep(.opt-vertical .el-checkbox) {
  display: flex;
  align-items: flex-start;
  margin: 0;
  padding: 10px 0;
}

.mobile-fill-inner :deep(.opt-vertical .el-radio__label),
.mobile-fill-inner :deep(.opt-vertical .el-checkbox__label) {
  font-size: 15px;
  line-height: 1.5;
  white-space: normal;
  padding-left: 10px;
  color: #334155;
}

.mobile-fill-inner :deep(.opt-vertical .el-radio__input),
.mobile-fill-inner :deep(.opt-vertical .el-checkbox__input) {
  margin-top: 2px;
}

.mobile-fill-inner :deep(.opt-horizontal) {
  flex-wrap: wrap;
  gap: 8px 10px;
}

.mobile-fill-inner :deep(.opt-fill-as-item) {
  margin: 6px 0 0;
  padding-left: 0;
}

.mobile-fill-inner :deep(.opt-fill-as-item .el-input__inner) {
  min-height: 44px;
}

/* ========== 多项填空 ========== */
.mobile-fill-inner :deep(.multi-fill-answer__row) {
  grid-template-columns: 1fr;
  gap: 6px;
}

.mobile-fill-inner :deep(.multi-fill-answer__label) {
  font-size: 14px;
  font-weight: 500;
}

/* ========== 评分/滑块 ========== */
.mobile-fill-inner :deep(.rating-answer) {
  width: 100% !important;
  max-width: none !important;
}

.mobile-fill-inner :deep(.slider-answer) {
  width: 100% !important;
  max-width: none !important;
}

/* ========== 量表题 ========== */
.mobile-fill-inner :deep(.scale-answer) {
  width: 100% !important;
  max-width: none !important;
}

.mobile-fill-inner :deep(.scale-option) {
  padding: 10px 0;
  font-size: 14px;
  border-radius: 8px;
  min-width: 36px;
}

/* ========== 比例题 ========== */
.mobile-fill-inner :deep(.ratio-answer) {
  width: 100% !important;
  max-width: none !important;
}

.mobile-fill-inner :deep(.ratio-answer__item) {
  grid-template-columns: 1fr;
  gap: 10px;
  padding: 14px;
  border-radius: 12px;
}

.mobile-fill-inner :deep(.ratio-answer__summary) {
  flex-wrap: wrap;
  font-size: 13px;
}

/* ========== 排序题 ========== */
.mobile-fill-inner :deep(.ranking-answer) {
  width: 100% !important;
  max-width: none !important;
}

.mobile-fill-inner :deep(.ranking-item) {
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
}

.mobile-fill-inner :deep(.ranking-item-main) {
  align-items: flex-start;
}

.mobile-fill-inner :deep(.ranking-actions) {
  display: flex;
  width: 100%;
  gap: 6px;
}

.mobile-fill-inner :deep(.ranking-btn) {
  flex: 1;
  padding: 10px;
  border-radius: 8px;
  font-size: 13px;
}

/* ========== 矩阵题 ========== */
.mobile-fill-inner :deep(.matrix-answer) {
  width: 100% !important;
  max-width: none !important;
}

.mobile-fill-inner :deep(.matrix-answer-select-row) {
  grid-template-columns: 1fr;
  gap: 8px;
  padding: 12px 14px;
  border-radius: 10px;
}

/* ========== 日期 ========== */
.mobile-fill-inner :deep(.native-date-input) {
  width: 100% !important;
  max-width: none !important;
  height: 48px;
  border-radius: 10px;
  font-size: 15px;
  padding: 0 14px;
  border: 1px solid #d1d5db;
  background: #fff;
}

/* ========== 文件上传 ========== */
.mobile-fill-inner :deep(.upload-answer) {
  width: 100% !important;
  max-width: none !important;
}

.mobile-fill-inner :deep(.upload-picker) {
  width: 100%;
  min-width: 0;
  min-height: 76px;
  display: flex;
  align-items: stretch;
  justify-content: flex-start;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border: 1px dashed #cbd5e1;
  border-radius: 12px;
  background: #f8fafc;
  color: #334155;
  font-size: 14px;
  font-weight: 400;
  cursor: pointer;
  transition: border-color 0.18s ease, background-color 0.18s ease;
}

.mobile-fill-inner :deep(.upload-picker__trigger) {
  width: 100%;
  flex: 0 0 auto;
}

.mobile-fill-inner :deep(.upload-picker:active) {
  border-color: #3b82f6;
  background: #eff6ff;
}

.mobile-fill-inner :deep(.upload-picker input) {
  position: absolute;
  inset: 0;
  opacity: 0;
}

.mobile-fill-inner :deep(.upload-picker__icon) {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 10px;
}

.mobile-fill-inner :deep(.upload-picker__body) {
  flex: 1;
  min-width: 0;
}

.mobile-fill-inner :deep(.upload-picker__title) {
  font-size: 14px;
}

.mobile-fill-inner :deep(.upload-picker__meta) {
  font-size: 12px;
}

.mobile-fill-inner :deep(.upload-list) {
  width: 100%;
  justify-content: stretch;
}

.mobile-fill-inner :deep(.upload-item) {
  flex: 1 1 100%;
  padding: 10px 12px;
  border-radius: 10px;
  background: #fff;
  border: 1px solid #e5e7eb;
}

.mobile-fill-inner :deep(.upload-item__icon) {
  width: 28px;
  height: 28px;
}

/* ========== 提交按钮 ========== */
.mobile-fill-inner :deep(.actions) {
  align-items: stretch;
  margin: 20px 0 0;
  gap: 12px;
}

.mobile-fill-inner :deep(.submit-btn) {
  width: 100%;
  min-width: 0;
  min-height: 52px;
  font-size: 17px;
  font-weight: 600;
  border-radius: 14px;
  letter-spacing: 0.5px;
}

.mobile-fill-inner :deep(.msg) {
  max-width: none;
  font-size: 14px;
  text-align: center;
}

/* ========== 辅助 ========== */
.mobile-fill-inner :deep(.fill-input) {
  width: 100% !important;
}

.mobile-fill-inner :deep(.closed-block) {
  margin-top: 0;
  padding: 48px 24px;
}

.mobile-fill-inner :deep(.q-item .el-date-editor) {
  width: 100% !important;
}

.mobile-fill-inner :deep(.desc iframe),
.mobile-fill-inner :deep(.q-desc iframe),
.mobile-fill-inner :deep(.desc .qfe-iframe),
.mobile-fill-inner :deep(.q-desc .qfe-iframe),
.mobile-fill-inner :deep(.desc .embed-video-frame),
.mobile-fill-inner :deep(.q-desc .embed-video-frame) {
  height: 210px !important;
  border-radius: 12px;
}

/* ===== 窄屏确定覆盖 ===== */
@media (max-width: 639px) {
  .mobile-fill-inner :deep(.page) {
    max-width: none !important;
    margin: 0 !important;
    padding: 0 0 80px !important;
  }

  .mobile-fill-inner :deep(.paper) {
    border: none !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    padding: 20px 16px 32px !important;
  }
}

/* ===== 宽屏恢复桌面卡片 ===== */
@media (min-width: 640px) {
  .mobile-fill-page {
    background:
      radial-gradient(circle at top, rgba(37, 99, 235, 0.12), transparent 28%),
      linear-gradient(180deg, #f8fbff 0%, #ffffff 18%, #f3f7fb 100%);
  }

  .mobile-fill-inner :deep(.qr-section-outside) {
    display: block !important;
  }

  .mobile-fill-inner :deep(.page) {
    max-width: 800px;
    margin: 60px auto 32px;
    padding: 0 16px;
  }

  .mobile-fill-inner :deep(.paper) {
    max-width: none;
    margin: 0;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    box-shadow: 0 8px 30px rgba(31,41,55,.06);
    padding: 30px 20px 40px;
    background: #fff;
  }

  .mobile-fill-inner :deep(.paper .el-card__body) {
    padding: 0;
  }

  .mobile-fill-inner :deep(.paper-title) {
    margin: 20px 8px 30px;
    font-size: 24px;
  }

  .mobile-fill-inner :deep(.q-form) {
    padding: 0 20px;
  }

  .mobile-fill-inner :deep(.q-item) {
    margin-bottom: 30px;
  }

  .mobile-fill-inner :deep(.q-item .el-form-item__label) {
    margin-bottom: 15px;
    font-size: 15px;
    line-height: inherit;
  }

  .mobile-fill-inner :deep(.submit-btn) {
    width: auto;
    min-width: 120px;
    min-height: auto;
    font-size: inherit;
    border-radius: inherit;
    letter-spacing: normal;
  }

  .mobile-fill-inner :deep(.actions) {
    align-items: center;
    margin: 16px 8px 10px;
  }

  .mobile-fill-inner :deep(.desc iframe),
  .mobile-fill-inner :deep(.q-desc iframe),
  .mobile-fill-inner :deep(.desc .qfe-iframe),
  .mobile-fill-inner :deep(.q-desc .qfe-iframe),
  .mobile-fill-inner :deep(.desc .embed-video-frame),
  .mobile-fill-inner :deep(.q-desc .embed-video-frame) {
    height: 450px !important;
  }
}
</style>
