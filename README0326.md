# 问易答调查系统

基于 `Vue 3 + TypeScript + Vite` 与 `Node.js + Express + MySQL` 的前后端分离调查问卷系统，覆盖问卷创建、发布、填写、结果分析，以及后台用户、角色、部门、职位、文件夹、消息、审计等管理能力。

基于源码状态更新时间：`2026-04-01`

## 当前技术栈

- 前端：Vue 3、TypeScript、Vite、Element Plus、Pinia、Vue Router、Axios、ECharts
- 后端：Node.js、Express、Knex、MySQL、JWT、bcryptjs、multer、ExcelJS
- 测试：根级 `test-suite` 编排、Node.js `node:test`、双系统冒烟入口、前端构建校验、Playwright 浏览器 E2E

## 当前能力概览

- 问卷创建、编辑、发布、关闭、回收站、彻底删除
- 公开分享、PC/移动端填写、截止时间控制、重复提交限制
- 上传题两阶段提交流程、附件 zip 下载、答卷 Excel 导出
- 结果页摘要、趋势、题目统计、设备/浏览器/系统分布、快照可观测字段
- 用户、角色、部门、职位、文件夹、消息、审计日志
- 管理后台浏览器级权限回归与上传题浏览器回归

## 当前系统结构判断

- 后端是 `Express + Knex + MySQL` 的模块化单体。
- 问卷域已形成 `route + policy + service + repository + transaction` 基本分层。
- 认证、用户、角色、部门、职位、文件夹、消息、审计等后台模块已进入 `route + service + policy/contract` 阶段，但聚合深度仍弱于问卷域。
- 权限控制不再只依赖路由层 `requireRole`，而是逐步下沉到 service/policy。
- 前端编辑器已拆为页面壳、领域 composable 和编辑器子模块。
- `shared/questionTypeRegistry.js` 与 `shared/questionModel.js` 是问卷题型与统计口径的单一事实源。
- `shared/management.contract.js` 已覆盖流程、题库仓库、后台文件等管理 DTO，`frontend/src/api/flows.ts`、`frontend/src/api/repos.ts`、`frontend/src/api/files.ts` 已接入真实后端路由。

## 仓库结构

```text
.
├─ backend/                 后端服务
│  ├─ server.js             启动入口
│  ├─ app.js                Express 装配层
│  ├─ initAdmin.js          初始化管理员脚本
│  ├─ scripts/              启动、迁移、种子脚本
│  ├─ src/config/           配置
│  ├─ src/db/               数据库连接、迁移、事务
│  ├─ src/models/           数据模型
│  ├─ src/routes/           API 路由
│  ├─ src/policies/         访问控制策略
│  ├─ src/services/         业务服务
│  ├─ src/repositories/     聚合仓储
│  ├─ src/utils/            校验、上传存储等工具
│  └─ test/                 路由与服务测试
├─ frontend/                前端工程
│  └─ src/
│     ├─ api/               接口封装
│     ├─ components/        通用组件
│     ├─ composables/       组合式逻辑
│     ├─ layouts/           页面布局
│     ├─ router/            路由配置
│     ├─ stores/            Pinia 状态
│     ├─ styles/            全局样式
│     ├─ types/             类型定义
│     ├─ utils/             题型注册、导入、图表等
│     └─ views/             页面视图
├─ shared/                  前后端共享题型与管理契约
├─ scripts/                 联调与系统冒烟脚本
├─ docs/                    项目文档
└─ 目录速览.md              仓库结构速览
```

## 环境要求

- Node.js 18+
- npm 9+
- MySQL 8.x

## 快速开始

### 1. 安装依赖

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 2. 配置环境变量

参考根目录 `.env.example`，当前默认开发配置如下：

```env
DB_HOST=127.0.0.1
DB_PORT=3309
DB_USER=root
DB_PASSWORD=123456
DB_NAME=survey_system

JWT_SECRET=please-change-me
JWT_EXPIRES_IN=7d

FRONTEND_URL=http://127.0.0.1:63000
PORT=63002
UPLOAD_PENDING_TTL_HOURS=24
```

生产环境必须替换 `JWT_SECRET`。

### 3. 初始化数据库

后端启动不再自动执行 `migrate()` 或 `seed()`。首次启动前请手动执行：

```bash
cd backend
npm run db:migrate
npm run db:seed:dev
```

说明：

- `db:migrate`：确保表结构存在并补齐新增字段。
- `db:seed:dev`：只补建缺失的开发账号和基础数据，不会重置已有密码。
- `db:seed:init-admin`：单独补建管理员账号。

### 4. 启动后端

```bash
cd backend
npm run dev
```

模式差异：

- `npm run dev`：开发模式，带 `watch`
- `npm run dev:once`：开发配置，单次运行
- `npm start` / `npm run start:prod`：生产模式，单次运行
- 生产模式会拒绝使用默认 `JWT_SECRET`

默认地址：

- `http://127.0.0.1:63002`
- 健康检查：`http://127.0.0.1:63002/health`

### 5. 初始化管理员

```bash
cd backend
npm run db:seed:init-admin
```

默认管理员信息：

- 用户名：`admin`
- 默认密码：`123456`

### 6. 启动前端

```bash
cd frontend
npm run dev
```

本地生产预览：

```bash
cd frontend
npm run build
npm run start:prod
```

开发代理：

- `/api` -> `http://127.0.0.1:63002`
- `/uploads` -> `http://127.0.0.1:63002`

## 常用脚本

### repo root

- `npm test`
- `npm run test:backend`
- `npm run test:frontend`
- `npm run test:smoke`
- `npm run test:e2e`
- `npm run test:all`
- `node scripts/test-suite.mjs quick`
- `node scripts/test-suite.mjs smoke`
- `node scripts/test-suite.mjs full`

### backend

- `npm run dev`
- `npm run dev:once`
- `npm start`
- `npm run start:prod`
- `npm test`
- `npm run test:watch`
- `npm run db:migrate`
- `npm run db:seed`
- `npm run db:seed:dev`
- `npm run db:seed:init-admin`

### frontend

- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run start:prod`
- `npm run lint`
- `npm run smoke:system`
- `npm run test:build`
- `npm run test:smoke`
- `npm run test:e2e`

## 当前验证状态

以下结果均为 `2026-04-01` 基于当前工作区实际执行：

- `node scripts/test-suite.mjs quick` 于仓库根目录通过
- 后端 `cmd /c npm test` 于 `backend/` 通过，`169 / 169`
- 前端 `npm run build` 于 `frontend/` 通过，`vue-tsc --noEmit` 与 `vite build` 均通过
- `node scripts/test-suite.mjs smoke` 于仓库根目录通过，repo-root smoke `64 / 64`、frontend smoke `64 / 64`
- 两个 smoke 入口继续支持并行运行，会各自分配独立端口与独立临时测试库
- GitHub Actions 已通过 [`CI`](./.github/workflows/ci.yml) 将两个 smoke 入口拆成 matrix 并行 job
- `node scripts/test-suite.mjs e2e` 于仓库根目录通过，Playwright 当前为 `20 / 20`
- `node scripts/test-suite.mjs full` 于仓库根目录通过，可串行完成 backend、build、双 smoke 与 E2E
- 根级 `package.json` 已补齐 `"type": "module"`，消除了 `shared/*.js` 的 `MODULE_TYPELESS_PACKAGE_JSON` 警告

注意：
- 未显式设置 `PORT` 时，`scripts/system-smoke.mjs` 会让后端监听 `0` 端口，由操作系统分配空闲端口。
- smoke 默认基于 `DB_NAME` 为每次运行创建独立临时测试库，并在结束后自动清理。
- `SMOKE_SHARED_DB=1` 可切回共享库模式；`SMOKE_KEEP_DB=1` 可保留临时库用于排障。

## 主要接口前缀

- `/api/auth`：注册、登录、当前用户
- `/api/surveys`：问卷管理、公开读取、上传、填写、结果
- `/api/answers`：答卷列表、明细、删除、导出、附件下载
- `/api/files`：后台文件上传与管理
- `/api/users`：用户与批量导入
- `/api/depts`：部门管理
- `/api/roles`：角色管理
- `/api/positions`：职位管理
- `/api/flows`：流程管理
- `/api/repos`：题库仓库与题目管理
- `/api/folders`：文件夹与问卷归档
- `/api/messages`：消息中心
- `/api/audits`：审计日志

## 当前实现说明

- 当前主线以 `MySQL + JSON 字段` 为准。
- `surveys.questions` 存题目定义，`answers.answers_data` 存答卷内容。
- 结果统计来自后端服务层聚合，并带有结果快照可观测字段。
- 上传题提交契约已收敛为最小文件引用：`id + uploadToken`。
- 认证逻辑已从路由收敛到 `backend/src/services/authService.js`。
- `shared/management.contract.js` 已覆盖 `FlowDTO`、`QuestionBankRepoDTO`、`QuestionBankQuestionDTO`、文件分页 DTO，并与前端 API 保持一致。
- `users / roles / depts / positions / folders / flows / repos` 等管理写操作已统一为“主数据写入 + 审计日志 + 操作者消息”同事务边界。

## 推荐阅读

- `目录速览.md`
- `backend/README.md`
- `docs/API接口说明.md`
- `docs/开发指南.md`
- `docs/开发日志-2026-04-01.md`
- `docs/测试报告-2026-04-01.md`
- `docs/PR-2026-04-01-测试脚本统一与文档补齐.md`
- `frontend/src/views/survey/README.md`
- `docs/题型规范.md`

## 联系与交流

- QQ 群：`982865864`
