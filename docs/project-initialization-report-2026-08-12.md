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
| API | NestJS 11.1、Prisma 7.9、PostgreSQL 18 |
| Worker | BullMQ 6.0、Redis 8 |
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
- Prisma 7 PostgreSQL driver adapter、完整 V1 Blog/CMS schema、CommandReceipt/Outbox/Inbox、UUID v7、全量 snake_case 映射和 Prisma CLI 生成的首个 migration。
- 幂等 seed 初始化 `SUPER_ADMIN`、`ADMIN`、`EDITOR` 以及 37 项权限，并将全部权限授予 `SUPER_ADMIN`。
- 第二优先级已实现 ArticlesModule 权威定时发布事务：Article、ArticleRevision、Audit、CommandReceipt、OutboxEvent 和三条 OutboxDelivery 在同一 PostgreSQL 事务提交。
- 发布事务使用数据库时间、行锁、条件更新、事务级幂等锁和有界 serialization retry；Service 与合同不暴露 Prisma 类型。
- 外部 `openapi.json` 与内部 `openapi.internal.json`，以及相互隔离的生成 client。
- 静态架构检查：禁止跨 app import、前端导入后端专用包、Worker 导入 API 源码，以及非数据库包直接导入 Prisma。

## 验证结果

以下命令在与 D 盘源码一致的 Linux 工作区、Node.js 24.19.0、pnpm 10.34.5 下执行：

| Gate | 结果 |
| --- | --- |
| `pnpm db:validate` | 通过，Prisma schema valid |
| `pnpm generate` | 通过，Prisma Client、外部/内部 OpenAPI 和两个 TS client 均生成 |
| `pnpm lint` | 通过，16 个 workspace lint task；77 个源码文件通过架构边界扫描 |
| `pnpm format:check` | 通过 |
| `pnpm typecheck` | 通过，15 个 workspace typecheck task |
| `pnpm test` | 通过，24 个 Turbo task；12 个常规断言通过，数据库集成套件按设计由独立命令执行 |
| `pnpm test:integration` | 通过，隔离 `blog_test` 中 6 个真实 PostgreSQL 事务用例通过 |
| `pnpm build` | 通过，15 个 build task；Web/Admin 静态路由及 API/Worker 产物成功 |

测试包含公共 API 200、内部 API 无身份 401、有效 workload token 200，并确认日志中的 Authorization 已脱敏。

## 本地数据库基线

- Docker Compose 实际运行 PostgreSQL 18.4 和 Redis 8.10，两个服务均通过健康检查并只映射到 `127.0.0.1`。
- 本地开发数据库为 `blog_dev`；PostgreSQL 18 原生 `uuidv7()` 已通过查询验证。
- Prisma migration `20260812105959_init` 由 Prisma CLI 根据 schema 生成并已应用。
- Prisma migration `20260812112007_add_article_schedule_version` 已应用，为排期失效保护增加 `schedule_version`。
- 数据库包含 26 张 public 表；所有物理列名通过 snake_case 检查。
- Seed 可重复执行且结果一致：1 个禁用交互登录的 `article-scheduler` 系统身份、3 个系统角色、37 项权限，`SUPER_ADMIN` 拥有全部 37 项权限。
- 隔离的 `blog_test` 已部署两条迁移；六个真实 PostgreSQL 事务测试覆盖原子提交、失败回滚、同键幂等、同键异请求冲突、并发单写和 NOT_DUE 到期重试。

## 仍需产品/部署决策

以下项目没有阻塞初始化，也不应由脚手架擅自决定：

- 用户认证/session provider；
- 生产 workload identity issuer、短期 token 获取和私网路由；
- 生产 S3-compatible storage；
- 搜索 provider 与最终部署拓扑。

这些能力已有明确端口/边界，后续可作为独立纵向功能切片交付。

## Git 基线

仓库使用 `main` 作为默认分支。本报告、原有 ADR/规则、初始化源码、生成契约、迁移和锁文件共同构成首个可审计提交；没有配置远端，也没有执行 push。
