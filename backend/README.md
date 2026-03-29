# 后端说明

本文档只对应当前 `backend/` 目录源码。

基于源码状态更新时间：`2026-03-29`

当前后端不是旧版 MongoDB / ClickHouse / 适配器架构，而是：

- `Node.js + Express`
- `Knex + MySQL`
- `JWT + bcryptjs`
- `multer + ExcelJS`

## 启动方式

### 1. 安装依赖

```bash
cd backend
npm install
```

### 2. 配置环境变量

参考根目录 `.env.example`，至少确认：

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

生产环境必须显式设置 `JWT_SECRET`。

### 3. 初始化数据库

当前启动流程不会自动执行迁移和种子。

首次启动前请手动执行：

```bash
cd backend
npm run db:migrate
npm run db:seed:dev
```

### 4. 启动服务

开发模式：

```bash
cd backend
npm run dev
```

单次运行开发配置：

```bash
cd backend
npm run dev:once
```

生产模式：

```bash
cd backend
npm start
```

## 运行行为

- 实际启动入口：`server.js`
- Express 装配层：`app.js`
- 默认端口：`63002`
- 健康检查：`GET /health`

`server.js` 当前只做两件事：

1. 执行一次 MySQL 连通性检查。
2. 启动 HTTP 服务并注册优雅退出。

它不会自动执行 `migrate()`、`seed()` 或任何历史双库同步逻辑。

## 目录结构

```text
backend/
├─ server.js
├─ app.js
├─ initAdmin.js
├─ scripts/
│  ├─ start-dev.js
│  ├─ start-prod.js
│  ├─ start-e2e.js
│  ├─ db-migrate.js
│  └─ db-seed.js
├─ src/
│  ├─ config/
│  ├─ constants/
│  ├─ db/
│  ├─ http/
│  ├─ middlewares/
│  ├─ models/
│  ├─ policies/
│  ├─ repositories/
│  ├─ routes/
│  ├─ services/
│  └─ utils/
└─ test/
```

## 当前分层

### 问卷域

问卷域是目前分层最完整的模块：

- 路由：`src/routes/surveys.js`
- 查询服务：`src/services/surveyQueryService.js`
- 命令服务：`src/services/surveyCommandService.js`
- 上传服务：`src/services/surveyUploadService.js`
- 结果服务：`src/services/surveyResultsService.js`
- 聚合仓储：`src/repositories/surveyAggregateRepository.js`
- 事务封装：`src/db/transaction.js`
- 访问策略：`src/policies/surveyPolicy.js`
- 题型校验：`src/utils/questionSchema.js`

当前调用链可理解为：

```text
route
  -> policy / access check
    -> service
      -> repository + transaction
        -> model
```

### 认证与后台管理域

认证与管理域已经不再是早期的 `route -> model` 直接拼装返回：

- 认证：`src/routes/auth.js` -> `src/services/authService.js`
- 用户：`src/routes/users.js` -> `src/services/userService.js`
- 角色：`src/routes/roles.js` -> `src/services/roleService.js`
- 部门：`src/routes/depts.js` -> `src/services/deptService.js`
- 职位：`src/routes/positions.js` -> `src/services/positionService.js`
- 文件夹：`src/routes/folders.js` -> `src/services/folderService.js`
- 消息：`src/routes/messages.js` -> `src/services/messageService.js`
- 审计：`src/routes/audits.js` -> `src/services/auditService.js`

当前这部分更接近：

```text
route
  -> authRequired
    -> service
      -> actor/admin policy
        -> repository / model
          -> shared contract DTO
```

说明：

- 路由层不再总是显式写死 `requireRole('admin')`。
- 管理员能力逐步下沉到 service 里的 `adminPolicy` / `actorPolicy`。
- `shared/management.contract.js` 统一后台常用 DTO、分页参数和错误码。

## 数据模型

当前数据库主线为 `MySQL + JSON 写模型`：

- `surveys.questions`：题目定义
- `surveys.settings`：问卷设置
- `surveys.style`：样式配置
- `answers.answers_data`：答卷内容
- `survey_results_snapshots`：结果快照与快照源状态
- `files`：上传文件、附件、答卷文件绑定
- `folders`：问卷归档目录
- `messages`：系统/审计消息
- `audit_logs`：操作审计

上传文件存放在 `backend/uploads/`，通过 `/uploads/*` 静态暴露。

## 结果统计

`src/services/surveyResultsService.js` 当前提供：

- 提交摘要
- 近 30 天趋势
- 地域空态与聚合
- 设备 / 浏览器 / 操作系统统计
- 题目级统计
- 结果快照命中 / miss / rebuild 可观测字段

结果接口为 `GET /api/surveys/:id/results`，需要登录后访问。

## 共享层协作

问卷题型不是后端单独维护的：

- `../shared/questionTypeRegistry.js`：题型定义与提交语义
- `../shared/questionModel.js`：题目统计逻辑
- `../shared/management.contract.js`：后台 DTO、分页、错误码

后端会复用这层做：

- 题型结构校验
- 上传题约束校验
- 结果统计口径统一
- 后台响应 DTO 归一化

## 当前实现边界

- `/api/auth`、`/api/users`、`/api/roles`、`/api/depts`、`/api/positions`、`/api/folders`、`/api/messages`、`/api/audits` 均已服务化。
- `/api/surveys/:id/uploads` 支持公开上传题两阶段提交。
- `shared/management.contract.js` 已新增流程与题库仓库 DTO。
- `/api/flows`、`/api/repos`、`/api/files` 已提供真实后端路由，前端 API 已接入。

## 测试

以下结果均为 `2026-03-29` 实际执行：

后端单测：

```bash
cd backend
npm test
```

- `80 / 80` 通过

系统冒烟：

```bash
cd ..
node scripts/system-smoke.mjs

cd frontend
npm run smoke:system
```

- 两个入口单独执行均为 `64 / 64`
- 并行执行仓库根入口与 `frontend` npm 入口已实测通过
- smoke 默认不再占用固定端口；未设置 `PORT` 时由系统分配空闲端口
- smoke 默认会为每次运行创建独立临时测试库，并在结束后自动删除
- `SMOKE_SHARED_DB=1` 可关闭测试库隔离，`SMOKE_KEEP_DB=1` 可保留临时库排障

浏览器级 E2E：

```bash
cd ../frontend
npm run test:e2e
```

- `17 / 17` 通过
- 覆盖管理后台鉴权、流程/题库仓库、消息中心、文件管理、答卷下载、文件夹工作流、上传题浏览器回归、编辑器建卷发布、公开填写、结果页读取

## 当前结论

- 后端已经不是“所有逻辑都堆在路由里”的早期状态。
- 问卷域已形成 `route + policy + service + repository + transaction` 基本分层。
- 认证与管理域已进入 `route + service + policy/contract` 阶段。
- 结果统计当前来自 MySQL 中的答卷数据聚合与快照复用，不再沿用旧分析库叙述。
- 后续应优先扩大后台模块浏览器回归与异常路径覆盖，并清理 Playwright WebServer 启动警告。
