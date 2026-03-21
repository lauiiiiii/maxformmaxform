# 关于 `package-lock.json`

- 这是由 npm 自动生成/维护的锁定文件，用于“锁定依赖的精确版本”，保证团队成员与 CI/CD 在不同时间安装到一致的依赖树（可复现安装）。
- 请将它提交到版本库，避免随意手改；若确需更新依赖，请通过命令触发 npm 重新生成：
  - 安装/新增依赖：`npm install <pkg>@<version>`（会更新 lock）
  - 扫描可更新版本：`npm outdated`
  - 小版本/补丁更新：`npm update`
  - 严格按锁文件安装（CI 推荐）：`npm ci`
- 与 `package.json` 的区别：
  - `package.json` 声明“范围”（^1.2.3、~1.2.3）；
  - `package-lock.json` 记录“确定值”（每个包的确切版本与来源）。
- 注意：JSON 不支持注释，切勿在 `package-lock.json` 顶部插入说明文字，否则会导致 npm 解析失败。

如需了解依赖来源/完整树，可使用：`npm ls`、`npm why <pkg>`。
