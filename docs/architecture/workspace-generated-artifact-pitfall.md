# Workspace 生成产物漂移：识别与处理

## 症状

直接运行 `pnpm --filter <consumer> test` 时，源码和类型检查正确，但运行期出现新导出为
`undefined`、生成 client 缺少新路径或 schema 与源码不一致。根测试却可能正常。

## 根因

部分 workspace package 的类型入口指向 `src`，默认运行时入口指向 `dist`。如果开发进程未
显式启用源码解析条件，TypeScript 检查会成功，而 Node/tsx 仍会尝试加载不存在或过期的
`dist`。Turbo 缓存命中也不能替代运行时入口契约。

## 处理

开发运行与生产运行采用不同且显式的解析条件：

- workspace package 的 `exports` 保留 `default -> dist`，并增加
  `development -> src`；
- API/Worker 的 `dev` 用 Node 24 的 `--conditions=development` 和 tsx loader，开发时直接
  加载 TypeScript 源码；
- `build`、`start` 不启用 development 条件，继续加载已构建的 `dist`；
- 根 `dev` 在启动前生成 Prisma Client、OpenAPI 文档及对应客户端；开发任务不再依赖全量
  workspace 构建；
- API 的 OpenAPI 生成同样启用 development 条件，并只显式准备 Prisma Client。

修改 event contract、生成 client 或其他运行时 workspace package 后：

1. 首选运行根级 `pnpm test`；
2. 需要快速 filtered test 时，确认测试工具启用了 development 条件，或先构建被修改的
   workspace 依赖；
3. OpenAPI 变更执行 `pnpm api:generate` 或 filtered `openapi:generate`；API package 的
   lifecycle pre-script 只生成 Prisma Client，不构建全部 workspace；
4. API/Worker 的 development 条件直接解析 workspace 源码，不能用 Turbo 缓存命中或已有
   `dist` 作为开发启动成功的依据；
5. 生产构建仍通过根级 `pnpm build` 构建完整依赖图；
6. 不通过手改生成文件或降低断言来掩盖漂移。

验收必须以 Node.js 24 和根级质量门禁结果为准。
