<template>
  <div>
    <h3>企业信息管理</h3>
    <!-- 企业资料、Logo、联系方式等表单 -->
    <el-form label-width="100px">
      <el-form-item label="企业名称">
        <el-input v-model="enterprise.name" />
      </el-form-item>
      <el-form-item label="Logo">
        <el-upload action="#" list-type="picture">
          <el-button>上传Logo</el-button>
        </el-upload>
      </el-form-item>
      <el-form-item label="联系方式">
        <el-input v-model="enterprise.contact" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary">保存</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue';
const enterprise = ref({ name: '', contact: '' });
</script>
