<template>
  <div v-if="mode === 'settings'" class="settings-area">
    <div class="settings-container">
      <h3>发布设置</h3>

      <div class="settings-section">
        <h4>基本设置</h4>
        <div class="setting-item">
          <label>问卷类型</label>
          <select v-model="surveyForm.type" class="form-select">
            <option value="normal">普通问卷</option>
            <option value="anonymous">匿名问卷</option>
            <option value="limited">限制问卷</option>
          </select>
        </div>

        <div class="setting-item">
          <label>截止时间</label>
          <input v-model="surveyForm.endTime" type="datetime-local" class="form-input" />
        </div>
      </div>

      <div class="settings-section">
        <h4>显示设置</h4>
        <div class="setting-item">
          <label class="checkbox-label">
            <input v-model="surveyForm.settings.showProgress" type="checkbox" />
            显示进度条
          </label>
        </div>

        <div class="setting-item">
          <label class="checkbox-label">
            <input v-model="surveyForm.settings.randomizeQuestions" type="checkbox" />
            随机题目顺序
          </label>
        </div>
      </div>

      <div class="settings-section">
        <h4>提交设置</h4>
        <div class="setting-item">
          <label class="checkbox-label">
            <input v-model="surveyForm.settings.allowMultipleSubmissions" type="checkbox" />
            允许多次提交
          </label>
        </div>

        <div class="setting-item">
          <label class="checkbox-label">
            <input v-model="surveyForm.settings.collectIP" type="checkbox" />
            收集 IP 地址
          </label>
        </div>
      </div>
    </div>
  </div>

  <div v-else class="share-area">
    <SurveySharePanel :title="surveyForm.title" :shareLink="computedShareLink" />
  </div>
</template>

<script setup lang="ts">
import type { CreateSurveyPublishPanelContract } from './createSurveyPageContracts'
import SurveySharePanel from './SurveySharePanel.vue'
import './createSurveyPage.css'

const props = defineProps<{
  mode: 'settings' | 'share'
  context: CreateSurveyPublishPanelContract
}>()
const mode = props.mode

const { surveyForm, computedShareLink } = props.context
</script>
