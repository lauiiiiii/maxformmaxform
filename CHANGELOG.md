# Changelog

## 2026-06-13 — 全面 UI 优化 (`b3c6374`)

### 手机端 FillSurveyMobilePage 全面重写
- 纯白背景、无外层卡片边框、贴边全宽显示
- 单选/多选项卡片化：灰底圆角，选中加边框区分（无蓝色背景）
- 输入框统一 48px 高度、10px 圆角、15px 字号
- 文件上传按钮 54px 高、15px 圆角、虚线边框
- 提交按钮 52px 高、17px 加粗、14px 圆角
- 宽屏 >=640px 恢复桌面渐变背景 + 卡片居中布局
- 窄屏 <=639px `!important` 确保去除纸张卡片外层框

### 手机端进度条
- `position: fixed; top: 0` 钉在屏幕最顶部，滑动不跟随
- 仅显示 4px 进度条，隐藏"进度 0/4"文字
- 占位通过 `.paper` 内边距补偿

### 上传题 UI 重构
- **桌面端**：紧凑按钮式（虚线边框 + 上传图标），不再占整行
- **上传后**：文件列表置顶，"继续添加"按钮在下方；到上限自动隐藏按钮
- **上传后**：帮助提示自动消失（`v-if="!getUploadAnswerList(...)"`）
- 上传按钮/文件项背景从灰底改为白底（更协调）

### 上传配置修复（不限文件类型）
- **前端** `uploadQuestion.ts`：`sanitizeUploadAccept('')` 不再退回默认后缀
- **前端** `uploadQuestion.ts`：`normalizeUploadQuestionConfig` 区分"未设置"与"不限类型"
- **前端** `uploadQuestion.ts`：`buildUploadQuestionHelpText` 空 accept 显示"不限文件类型"
- **后端** `questionSchema.js`：`sanitizeUploadAccept` 同步修复（空值返回 `''`）
- **后端** `questionSchema.js`：`normalizeUploadQuestionConfig` 同步修复
- **后端** `questionSchema.js`：`validateUploadFilesAgainstQuestion` 空 accept 跳过校验
- **编辑器** `editor-core.ts`：`ensureUploadConfig` 保留已设置的 accept（选"不限类型"不被重置）

### 矩阵题编辑器优化
- 移除"行标题宽度"下拉框（删除无用功能）
- 编辑器列宽常数收紧：MAX 112→80px、MIN 64→48px、基宽 560→400
- 紧凑预览表列宽同步收紧（minmax 78→48px、padding 缩小、字号 12px）
- "竖向选择"默认为 `false`（不勾选），`ensureMatrixConfig` 强制默认，swap 后恢复值

### 矩阵题手机端显示
- 表头隐藏"维度"角单元格（仅窄屏）
- 行标题全宽显示在上方，选项在下
- 隐藏 radio label 中的数字（1/2/3…）
- 宽屏维度和表头正常显示

### 评分/星级题美化
- **编辑器紧凑预览**：文字"评分：1-5 星"改为金色 ★ 星星，数量跟随 max 设置
- **编辑器展开预览**：28px 金星 + hover 放大 + 微光晕
- **填写页**：去掉"评分范围"文字，el-rate `size="large"` + 32px 大星 + hover 缩放

### 必填/选填标记
- 必填题：题号前红色 `*`（替换 Element Plus 的星号，CSS 隐藏 el-form 自带星号）
- 选填题：标题后灰色 `【选填】` 标签（`#9ca3af`，12px）

### 题号优化
- 题号格式 `1.` `2.` `3.`（数字后加 `.`）
- 误删题号的 Bug 已恢复（`v-if="!q.hideSystemNumber"`）

### 其他
- 删除题目间的 el-divider 分割线
- 进度条桌面端缩小：无背景/边框，文字 12px 浅灰，进度线 4px
- CSS vendor prefix 修复（`appearance: textfield`）
- `getRankingItems` 加 `: any[]` 返回类型（修复 TS18046）
- 新增 `start-all.cmd`、`scripts/start-backend-dev.cmd`、`scripts/start-frontend-dev.cmd`
- 新增 README.md

### 涉及文件
| 文件 | 变更 |
|------|------|
| `frontend/src/views/survey/FillSurveyMobilePage.vue` | 全面重写 |
| `frontend/src/views/survey/FillSurveyPage.vue` | 上传/评级/矩阵/必填标记/进度条 |
| `frontend/src/views/survey/CreateSurveyQuestionListPanel.vue` | 矩阵编辑器/星级预览 |
| `frontend/src/views/survey/createSurveyPage.css` | 多处 CSS |
| `frontend/src/utils/uploadQuestion.ts` | 不限类型修复 |
| `frontend/src/composables/editor/editor-core.ts` | 上传/矩阵配置 |
| `backend/src/utils/questionSchema.js` | 上传配置后端同步 |
| `shared/questionTypeRegistry.js` | 矩阵默认配置 |
