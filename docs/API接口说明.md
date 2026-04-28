# API 接口说明

基于源码状态更新时间：`2026-03-29`

本文档只描述当前 `backend/app.js` 与 `backend/src/routes/*` 已挂载的真实接口，不再沿用旧版 MongoDB / ClickHouse / `DB_CLIENT` / `/analytics` 口径。

## 1. 基础信息

- 开发默认基地址：`http://127.0.0.1:63002`
- 业务接口前缀：`/api`
- 健康检查：`GET /health`
- 内容类型：`application/json`
- 鉴权方式：`Authorization: Bearer <token>`

### 1.1 通用成功结构

```json
{
  "success": true,
  "data": {}
}
```

部分接口会额外返回：

- `message`
- `total`
- 文件下载流响应

### 1.2 通用错误结构

```json
{
  "success": false,
  "error": {
    "code": "MGMT_USER_REQUIRED_FIELDS",
    "message": "Readable error message"
  }
}
```

常见错误码：

- `MGMT_ACCESS_FORBIDDEN`
- `MGMT_USER_*`
- `MGMT_ROLE_*`
- `MGMT_DEPT_*`
- `MGMT_POSITION_*`
- `MGMT_FOLDER_*`
- `MGMT_MESSAGE_*`
- `MGMT_FLOW_*`
- `MGMT_QUESTION_BANK_*`
- `INVALID_TOKEN`
- `AUTH_FAILED`

## 2. 健康检查

### `GET /health`

说明：

- 应用就绪探活

响应示例：

```json
{
  "status": "OK",
  "time": "2026-03-29T03:00:00.000Z"
}
```

## 3. 认证模块 `/api/auth`

当前实现位于：

- `backend/src/routes/auth.js`
- `backend/src/services/authService.js`

### `POST /api/auth/register`

是否鉴权：

- 否

请求体：

```json
{
  "username": "alice",
  "email": "alice@example.com",
  "password": "secret"
}
```

成功响应：

```json
{
  "success": true,
  "data": {
    "token": "<jwt>",
    "user": {
      "id": 1,
      "username": "alice",
      "email": "alice@example.com"
    }
  }
}
```

失败：

- `400 MISSING_FIELDS`
- `409 USER_EXISTS`
- `409 EMAIL_EXISTS`

### `POST /api/auth/login`

是否鉴权：

- 否

请求体：

```json
{
  "username": "alice",
  "password": "secret"
}
```

成功响应：

```json
{
  "success": true,
  "data": {
    "token": "<jwt>",
    "user": {
      "id": 1,
      "username": "alice"
    }
  }
}
```

失败：

- `400 MISSING_FIELDS`
- `401 AUTH_FAILED`
- `403 USER_DISABLED`

### `GET /api/auth/me`

是否鉴权：

- 是

成功响应：

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "alice"
    },
    "role": {
      "id": 2,
      "code": "admin",
      "name": "Admin"
    }
  }
}
```

失败：

- `401 INVALID_TOKEN`

## 4. 问卷模块 `/api/surveys`

当前实现位于：

- `backend/src/routes/surveys.js`
- `backend/src/services/surveyQueryService.js`
- `backend/src/services/surveyCommandService.js`
- `backend/src/services/surveyUploadService.js`
- `backend/src/services/surveyResultsService.js`

### 4.1 后台问卷管理

需要登录：

- `GET /api/surveys`
- `GET /api/surveys/trash`
- `DELETE /api/surveys/trash`
- `POST /api/surveys`
- `PUT /api/surveys/:id`
- `DELETE /api/surveys/:id`
- `POST /api/surveys/:id/restore`
- `DELETE /api/surveys/:id/force`
- `POST /api/surveys/:id/publish`
- `POST /api/surveys/:id/close`
- `PUT /api/surveys/:id/folder`
- `GET /api/surveys/:id/results`

典型创建请求：

```json
{
  "title": "满意度调查",
  "description": "2026 Q1",
  "questions": [
    {
      "type": "radio",
      "title": "你是否满意？",
      "options": [
        { "label": "是" },
        { "label": "否" }
      ]
    }
  ],
  "settings": {
    "allowMultipleSubmissions": true
  },
  "style": {}
}
```

### 4.2 公开读取

无需登录或可选登录：

- `GET /api/surveys/share/:code`
- `GET /api/surveys/:id`

说明：

- 公开页读取会按当前分享状态、发布状态和访问策略做限制。

### 4.3 公开上传题

### `POST /api/surveys/:id/uploads`

是否鉴权：

- 可选登录

额外限制：

- `15` 分钟窗口内最多 `20` 次请求

表单字段：

- `file`
- `questionId`
- `submissionToken`

说明：

- question-scoped 上传要求 `questionId + submissionToken`
- 成功后返回文件记录与 `uploadToken`
- 后续答卷提交使用最小引用：`id + uploadToken`

### 4.4 公开提交答卷

### `POST /api/surveys/:id/responses`

是否鉴权：

- 否

请求体示例：

```json
{
  "answers": [
    { "questionId": 1, "value": "A" },
    { "questionId": 2, "value": ["A", "B"] },
    {
      "questionId": 3,
      "value": [
        { "id": 9, "uploadToken": "token-1" }
      ]
    }
  ],
  "duration": 35,
  "clientSubmissionToken": "optional-client-token"
}
```

成功响应：

```json
{
  "success": true,
  "message": "Submitted successfully",
  "data": {
    "id": 123,
    "surveyId": 5
  }
}
```

失败：

- `400` 未发布或已关闭
- `400` 上传题超限
- `400` 上传 token 不匹配
- `400` 题型校验失败

### 4.5 结果接口

### `GET /api/surveys/:id/results`

是否鉴权：

- 是

返回字段包含：

- `totalSubmissions`
- `today`
- `completed`
- `incomplete`
- `completionRate`
- `avgDuration`
- `avgTime`
- `lastSubmitAt`
- `submissionTrend`
- `regionStats`
- `systemStats`
- `questionStats`
- `observability`

`observability.snapshot` 当前包含：

- `currentAccessMode`
- `currentMissReason`
- `record.exists`
- `record.createdAt`
- `record.updatedAt`
- `record.ageMs`
- `record.answerCount`
- `record.latestAnswerId`
- `record.latestSubmittedAt`
- `record.surveyUpdatedAt`
- `source.answerCount`
- `source.latestAnswerId`
- `source.latestSubmittedAt`
- `source.surveyUpdatedAt`
- `requests`
- `hits`
- `misses`
- `hitRate`
- `rebuilds`
- `readErrors`
- `persistErrors`
- `rebuildDurationMs`

说明：

- 当前结果统计来自 MySQL 答卷聚合与本地结果快照复用。
- 不存在 `/api/surveys/:id/analytics` 正式接口。

## 5. 答卷模块 `/api/answers`

当前实现位于：

- `backend/src/routes/answers.js`
- `backend/src/services/answerQueryService.js`
- `backend/src/services/answerCommandService.js`
- `backend/src/services/answerExportService.js`

全部接口都需要登录。

### `GET /api/answers`

说明：

- 分页查询答卷

常用查询参数：

- `survey_id`
- `page`
- `pageSize`

### `GET /api/answers/count`

说明：

- 查询答卷数量

### `GET /api/answers/:id`

说明：

- 查询单份答卷明细

### `DELETE /api/answers/batch`

请求体：

```json
{
  "ids": [1, 2, 3]
}
```

说明：

- 批量删除答卷
- 会同步清理已绑定附件并更新问卷统计

### `POST /api/answers/download/survey`

请求体：

```json
{
  "survey_id": 5
}
```

说明：

- 返回问卷答卷 Excel 文件流

### `POST /api/answers/download/attachments`

请求体：

```json
{
  "survey_id": 5
}
```

说明：

- 返回问卷附件 zip 文件流

## 6. 后台文件模块 `/api/files`

全部接口都需要登录。

### `GET /api/files`

说明：

- 查询当前用户可管理文件
- 管理员可额外使用 `uploader_id` 过滤指定上传者

支持查询参数：
- `page`
- `pageSize`
- `uploader_id`
- `survey_id`

### `POST /api/files/upload`

表单字段：

- `file`

说明：

- 普通文件上传

### `POST /api/files/upload/image`

表单字段：

- `file`

说明：

- 图片上传

### `DELETE /api/files/:id`

说明：

- 删除当前用户可管理文件
- 允许管理员或文件所有者执行

## 7. 用户与组织模块

### 7.1 用户 `/api/users`

当前实现位于 `backend/src/services/userService.js`。

所有接口都需要登录，且实际访问要求管理员。

- `GET /api/users`
- `GET /api/users/:id`
- `POST /api/users`
- `POST /api/users/import`
- `PUT /api/users/:id`
- `PUT /api/users/:id/password`
- `DELETE /api/users/:id`

`POST /api/users/import` 请求体示例：

```json
{
  "users": [
    {
      "username": "alice",
      "password": "secret",
      "email": "alice@example.com",
      "role_id": 2,
      "dept_id": 1,
      "position_id": 3
    }
  ]
}
```

### 7.2 角色 `/api/roles`

所有接口都需要登录，且实际访问要求管理员。

- `GET /api/roles`
- `POST /api/roles`
- `PUT /api/roles/:id`
- `DELETE /api/roles/:id`

### 7.3 部门 `/api/depts`

当前权限：

- `GET /api/depts`：登录即可
- `GET /api/depts/tree`：登录即可
- `POST /api/depts`：管理员
- `PUT /api/depts/:id`：管理员
- `DELETE /api/depts/:id`：管理员

### 7.4 职位 `/api/positions`

当前权限：

- `GET /api/positions`：登录即可
- `POST /api/positions`：管理员
- `PUT /api/positions/:id`：管理员
- `DELETE /api/positions/:id`：管理员

### 7.5 流程 `/api/flows`

所有接口都需要登录，且实际访问要求管理员。
- `GET /api/flows`
- `POST /api/flows`
- `PUT /api/flows/:id`
- `DELETE /api/flows/:id`

`POST /api/flows` / `PUT /api/flows/:id` 请求体字段：
- `name`
- `status`：`draft | active | disabled`
- `description`

说明：
- 流程写操作会在同一事务内写入主数据、审计日志与操作者消息

### 7.6 题库仓库 `/api/repos`

所有接口都需要登录，且实际访问要求管理员。
- `GET /api/repos`
- `POST /api/repos`
- `PUT /api/repos/:id`
- `DELETE /api/repos/:id`
- `GET /api/repos/:id/questions`
- `POST /api/repos/:id/questions`
- `DELETE /api/repos/:id/questions/:questionId`

`POST /api/repos` / `PUT /api/repos/:id` 请求体字段：
- `name`
- `description`

`POST /api/repos/:id/questions` 请求体字段：
- `title`
- `type`
- `difficulty`
- `score`

说明：
- 删除仓库时会先删除其下题目，再删除仓库本身
- 仓库和题目写操作会在同一事务内写入主数据、审计日志与操作者消息

## 8. 文件夹、消息、审计

### 8.1 文件夹 `/api/folders`

全部接口都需要登录，按当前用户所有权访问。

- `GET /api/folders`
- `GET /api/folders/all`
- `POST /api/folders`
- `PUT /api/folders/:id`
- `DELETE /api/folders/:id`

说明：

- 删除含子文件夹时会返回 `409 MGMT_FOLDER_HAS_CHILDREN`
- 删除文件夹时会将该目录下问卷移到根目录

### 8.2 消息 `/api/messages`

全部接口都需要登录。

- `GET /api/messages`
- `POST /api/messages/:id/read`

消息查询支持：

- `page`
- `pageSize`
- `unread`
- `types`

### 8.3 审计 `/api/audits`

接口：

- `GET /api/audits`

路由层只要求登录，但 service 层实际要求管理员。

支持查询参数：

- `page`
- `pageSize`
- `username`
- `action`
- `targetType`

## 9. 当前未提供的正式接口

以下能力在当前仓库里不是正式后端接口，请不要按旧文档调用：

- `/api/surveys/:id/analytics`
- 基于 `DB_CLIENT` 切换数据库
