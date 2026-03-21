<template>
  <div>
    <h3>系统配置</h3>
    <!-- 企业专属配置项、系统参数设置 -->
    <el-form label-width="120px">
      <el-form-item label="问卷最大题数">
        <el-input type="number" v-model="config.maxQuestions" />
      </el-form-item>
      <el-form-item label="数据导出格式">
        <el-select v-model="config.exportFormat">
          <el-option label="Excel" value="excel" />
          <el-option label="PDF" value="pdf" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary">保存配置</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue';
const config = ref({ maxQuestions: 50, exportFormat: 'excel' });
</script>
