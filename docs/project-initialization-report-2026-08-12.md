# Blog 项目初始化报告

日期：2026-08-12

## 结论

`D:\ideaproj\blog` 已从仅含规则/ADR 的目录初始化为可生成、可类型检查、可测试、可生产构建的 pnpm/Turborepo TypeScript monorepo。四个应用、共享包、CI、OpenAPI、Prisma schema/迁移、架构边界检查和 Git 基线均纳入本次交付。

ADR-0011、ADR-0012、ADR-0013 已转为 `Accepted`，分别固定：

1. Worker 通过生成的私有 HTTP client 调用 API 的 canonical command；
2. PostgreSQL transactional outbox + at-least-once delivery；
3. Prisma 只存在于 `packages/database` 和明确的持久化适配路径。

## 固定版本基线

| 领域 | 基线 |
| --- | --- |
| Runtime | Node.js 24 LTS；完整依赖树与 CI 只承诺该运行时 |
| Package manager | pnpm 10.34.5 |
| Language | TypeScript 5.9.3 |
| Monorepo | Turborepo 2.10.9 |
| Web/Admin | Next.js 16.3.0、React 19.2、Tailwind CSS 4.3 |
| API | NestJS 11.1、Prisma 7.9、PostgreSQL 17 |
| Worker | BullMQ 6.0、Redis 7.4 |
| Contract | Nest Swagger、openapi-typescript、openapi-fetch |
| Quality | ESLint 9.39、Prettier 3.9、Vitest 4.1 |

TypeScript 5.9 和 ESLint 9 是有意的生态兼容基线：当前 OpenAPI 生成器仍声明 TypeScript 5 peer 范围，而 Next.js 的 ESLint 插件链尚未完整声明 ESLint 10 peer 兼容。锁文件负责固定实际解析结果。

## 已交付内容

- 根工作区：`package.json`、`pnpm-workspace.yaml`、`pnpm-lock.yaml`、`turbo.json`、格式/lint/TS 配置、`.env.example`、Compose 和 CI。
- `apps/web`：Next.js App Router 公共站点起点。
- `apps/admin`：Next.js Admin 起点，已接入 TanStack Query、React Hook Form、Zod。
- `apps/api`：NestJS API、Pino、Helmet、ValidationPipe、公共/内部健康接口、Swagger/OpenAPI 生成及 E2E。
- `apps/worker`：BullMQ Worker、版本化 payload 验证、结构化日志、Redis readiness、优雅停机。
- 原规则要求的共享包，以及 `database`、`event-contracts`、`internal-api-client`、`test-utils`。
- Prisma 7 PostgreSQL driver adapter、CommandReceipt/Outbox/Inbox schema 和首个 SQL migration。
- 外部 `openapi.json` 与内部 `openapi.internal.json`，以及相互隔离的生成 client。
- 静态架构检查：禁止跨 app import、前端导入后端专用包、Worker 导入 API 源码，以及非数据库包直接导入 Prisma。

## 验证结果

以下命令在与 D 盘源码一致的 Linux 工作区、Node.js 24.19.0、pnpm 10.34.5 下执行：

| Gate | 结果 |
| --- | --- |
| `pnpm db:validate` | 通过，Prisma schema valid |
| `pnpm generate` | 通过，Prisma Client、外部/内部 OpenAPI 和两个 TS client 均生成 |
| `pnpm lint` | 通过，16 个 workspace lint task；69 个源码文件通过架构边界扫描 |
| `pnpm format:check` | 通过 |
| `pnpm typecheck` | 通过，15 个 workspace typecheck task |
| `pnpm test` | 通过，24 个 Turbo task；11 个实际断言用例通过 |
| `pnpm build` | 通过，15 个 build task；Web/Admin 静态路由及 API/Worker 产物成功 |

测试包含公共 API 200、内部 API 无身份 401、有效 workload token 200，并确认日志中的 Authorization 已脱敏。

## 环境限制

当前受控 WSL 会话把 `/mnt/d` 暴露为只读 DrvFS 视图，并拒绝 pnpm 所需的 `futime`/`chmod`。因此：

- 依赖已经在 Linux 文件系统完成安装和验证；
- `pnpm-lock.yaml`、生成物和迁移已经同步到 D 盘；
- D 盘上失败安装产生的局部 `node_modules` 已清理；
- 在正常可写的 Windows 终端或 WSL ext4 工作区执行 `corepack pnpm install --frozen-lockfile` 即可恢复依赖目录。

这不是源码或依赖冲突，不影响 Git 基线和可重复安装。

## 仍需产品/部署决策

以下项目没有阻塞初始化，也不应由脚手架擅自决定：

- 用户认证/session provider；
- 生产 workload identity issuer、短期 token 获取和私网路由；
- 生产 S3-compatible storage；
- 搜索 provider 与最终部署拓扑。

这些能力已有明确端口/边界，后续可作为独立纵向功能切片交付。

## Git 基线

仓库使用 `main` 作为默认分支。本报告、原有 ADR/规则、初始化源码、生成契约、迁移和锁文件共同构成首个可审计提交；没有配置远端，也没有执行 push。
