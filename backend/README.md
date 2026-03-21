# TrustForm信任表单 后端

两种运行模式：

- 简化内存版（联调演示快）：
  - `npm run dev:63004`（示例端口 63004；默认推荐 63002）
- 持久化完整版（Mongo + JWT）：
  1. 复制 `.env.example` 为 `.env` 并修改 `MONGODB_URI`、`JWT_SECRET` 等
  2. 安装依赖：`npm i express cors helmet express-rate-limit dotenv mongoose jsonwebtoken bcryptjs`（项目已部分安装）
  3. 启动：`npm run dev`（入口为 `app.cjs`）

## 双数据库架构（MongoDB + ClickHouse）

- 业务数据使用 MongoDB（Mongoose）存储（问卷、题目、答卷主记录）
- 行为与统计数据写入 ClickHouse（行级明细），用于高性能聚合查询

当前实现：在提交答卷接口 POST /api/surveys/:id/responses 中，Mongo 写入成功后将答卷明细“尽力而为”地双写到 ClickHouse 表 `survey_answers`。

## 数据库适配器模式

- 所有模型/仓储均通过 `src/database` 暴露的适配器访问：`database.getModel('User')`、`database.getOrm()` 等。
- 默认适配器为 MongoDB（基于 Mongoose 实现），可通过 `DB_CLIENT=mongodb` 控制；新增适配器时在 `src/database/adapters/` 编写实现并注册到 `registry`。
- 适配器负责数据库连接、断开与健康状态回报；业务层无需关心底层驱动，即可在未来切换到 MySQL、PostgreSQL、SQL Server、SQLite、人大金仓、达梦、OceanBase 等数据库。
- `models/index.js` 汇总所有领域模型，供 MongoDB 适配器注册；其他数据库可提供各自的仓储实现或 ORM 映射。

### 环境变量

参考 `.env.example` 配置以下变量：

- DB_CLIENT（默认 mongodb，可扩展为其他适配器）
- MONGODB_URI
- JWT_SECRET
- CLICKHOUSE_URL（默认 http://127.0.0.1:8123）
- CLICKHOUSE_USER/CICKHOUSE_PASSWORD（如启用鉴权）
- CLICKHOUSE_DB（默认 default，建议使用 trustform）

### 启动与验证

1) 安装依赖（后端目录）
2) 启动 MongoDB 与 ClickHouse
3) 运行 `node app.cjs` 或使用工作区已有任务
4) 打开 `/health`，可见 `dbClient`、`dbOk`、`mongoOk` 和 `clickhouseOk`

答卷写入后，可在 ClickHouse 中查询：

```
SELECT projectId, questionId, count() FROM trustform.survey_answers GROUP BY projectId, questionId ORDER BY count() DESC;
```

前端代理默认指向 `http://127.0.0.1:63002`。

> 遇到 PowerShell curl 引号问题，可使用 `node ./scripts/smoke-login.js` 做冒烟测试。