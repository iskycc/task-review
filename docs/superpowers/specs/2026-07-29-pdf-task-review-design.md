# PDF Task Review — 设计文档

- 日期：2026-07-29
- 依据：`PRD.md`（V1.0，MVP）
- 状态：已获用户批准

## 1. 目标与范围

实现 PRD 定义的 MVP：上传单个 PDF → 创建 Project → 按有效文本行生成 Task → 逐条 Review（通过 / 备注暂留 / 上一条 / 下一条跳过）→ 自动保存状态与停留位置 → 审核结果汇总。

不含 PRD 4.2 列出的暂不包含项（OCR、批量上传、导出、删除、多用户等）。

## 2. 已确认的技术决策

| 决策点 | 结论 |
| --- | --- |
| 框架 | Next.js App Router + TypeScript |
| 数据库 | SQLite + Prisma（单文件、零配置；后续可迁移 PostgreSQL） |
| PDF 解析 | 同步解析（上传请求内完成，20MB/5000 行量级） |
| PDF 解析库 | pdfjs-dist（按文本块坐标重建视觉行） |
| 服务端接口 | Route Handlers（REST，按 PRD 第 9 节） |
| 样式 | Tailwind CSS |
| 测试 | Vitest |
| PDF 文件存储 | 本地磁盘 `data/uploads/`（非公开目录，文件名随机化） |

## 3. 架构

### 3.1 页面（App Router）

| 路由 | 类型 | 说明 |
| --- | --- | --- |
| `/` | Server Component | Project 列表页：标题、上传按钮、Project 卡片列表、空状态引导 |
| `/projects/[projectId]/review/[sequence]` | Server + Client | 逐条审核页：服务端取初始 Task 与 Project 汇总，Client Component 处理交互与切换 |
| `/projects/[projectId]/result` | Server Component | 审核结果页：汇总数据与三个操作按钮 |
| 404 / 错误边界 | — | Project 不存在、Task 越界等按 PRD 6.5 |

### 3.2 API（Route Handlers）

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/projects` | multipart 上传 PDF，校验 + 同步解析 + 创建 Project/Task，返回结果 |
| GET | `/api/projects` | Project 列表（创建时间倒序） |
| GET | `/api/projects/[projectId]` | Project 详情与汇总计数 |
| GET | `/api/projects/[projectId]/tasks/[sequence]` | 按顺序号取单个 Task（含相邻导航信息） |
| GET | `/api/projects/[projectId]/tasks?status=pending\|deferred` | 定位指定状态的第一条 Task（结果页“继续处理/查看暂留”用） |
| PATCH | `/api/tasks/[taskId]/review` | 更新 Task 状态与备注（事务） |
| PATCH | `/api/projects/[projectId]/progress` | 更新最后停留位置 lastTaskId |

关键约束：服务端校验 Task 归属 Project；Review 更新幂等；计数由服务端重算，客户端不能指定。

### 3.3 服务层（`src/lib/`）

- `db.ts` — Prisma client 单例
- `config.ts` — `PDF_MAX_SIZE_MB`（默认 20）等配置
- `pdf/extract-lines.ts` — pdfjs-dist 逐页 getTextContent，按 y 坐标容差聚类成行、x 排序，输出 `{ content, pageNumber, lineNumber }[]`
- `services/project-service.ts` — 上传校验、文件落盘、解析、Task 分批创建、失败标记
- `services/review-service.ts` — 审核更新事务、计数重算、Project 状态推导
- `validation.ts` — 备注长度、状态值等共享校验

## 4. 数据模型（Prisma）

### Project

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | String (cuid) | 主键 |
| name | String | 默认取文件名去扩展名 |
| originalFileName | String | 原始 PDF 文件名 |
| filePath | String | 本地存储路径 |
| fileSize | Int | 字节 |
| status | String | PARSING / FAILED / READY / REVIEWING / COMPLETED |
| parseError | String? | 面向用户的失败原因 |
| totalTasks / passedTasks / deferredTasks / pendingTasks | Int | 冗余计数，事务内维护 |
| lastTaskId | String? | 最后停留 Task |
| createdAt / updatedAt | DateTime | |

### Task

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | String (cuid) | 主键 |
| projectId | String | 外键 |
| sequence | Int | 从 1 开始 |
| content | String | 行文本（去首尾空白，行内空格保留） |
| pageNumber | Int? | 来源页码 |
| lineNumber | Int? | 页内行号 |
| status | String | PENDING / PASSED / DEFERRED |
| remark | String? | 备注（≤2000 字符） |
| reviewedAt | DateTime? | 最近形成结论时间 |
| createdAt / updatedAt | DateTime | |

约束：`@@unique([projectId, sequence])`、`@@index([projectId, status])`。

## 5. 核心流程

### 5.1 上传与解析（同步）

1. 校验：扩展名 `.pdf`、MIME、`%PDF-` 文件签名、非空、≤ 配置大小；任一不合格返回 400 + 可读原因，不创建 Project。
2. 文件写入 `data/uploads/<随机名>.pdf`，创建 Project（PARSING）。
3. pdfjs-dist 解析：
   - 加密（PasswordException）/ 损坏（InvalidPDFException）→ Project 置 FAILED，写 parseError，返回可读原因。
   - 逐页 getTextContent → 按 y（transform[5]，容差聚类）分组 → 组内按 x 排序拼接 → trim；空行跳过；同名文本不去重。
4. 无有效行 → FAILED，提示可能是扫描件或空白 PDF。
5. 有效行分批 createMany（每批 500），Project 置 READY 并写入计数。
6. 全程 try/catch：未预期异常 → FAILED + 内部日志（不含 PDF 内容），不向前端暴露堆栈。

### 5.2 审核更新（事务 + 幂等）

`PATCH /api/tasks/:taskId/review`：

1. 校验：task 存在且属于指定 project；status ∈ {PASSED, DEFERRED}；DEFERRED 必须有 trim 后非空备注；备注 ≤2000 字符。
2. `$transaction`：更新 task（status、remark、reviewedAt）→ 重算 Project 四项计数 → 推导 Project 状态（READY/REVIEWING/COMPLETED）→ 保存。
3. 幂等：重复提交同一结论结果一致；客户端提交期间禁用全部审核按钮防双击；保存失败不跳转、保留输入。

`PATCH progress`：进入任一 Task 时更新 lastTaskId（宽松处理，失败不影响浏览）。

### 5.3 Review 页行为

- URL 含 sequence，刷新 / 浏览器前进后退 / 直接定位均可用。
- 打开 Project 默认进入 lastTaskId 对应 sequence，否则第 1 条。
- 切换 Task 时客户端 fetch 单个 Task，并预取相邻 Task。
- 备注有未保存改动时，上一条/下一条前 confirm：“备注尚未保存，是否放弃修改并继续？”
- 通过 / 暂留成功后自动进入下一条；最后一条执行后跳结果页。
- 首条禁用“上一条”，末条禁用“下一条/跳过”。
- 焦点管理：切换后焦点移至 Task 内容区；操作反馈用 aria-live；按钮均为文字标签。
- 超长行 break-words 换行，无横向溢出。

### 5.4 结果页

- 展示总数、已通过、暂留、待处理、进度。
- “继续处理待处理任务”（仅存在待处理时显示，定位第一条 pending）。
- “查看暂时遗留任务”（定位第一条 deferred）。
- “返回项目列表”。
- 到达末条但仍有 pending：提示“已到达最后一条，仍有 N 条待处理”，Project 不标记 COMPLETED。

## 6. 错误处理

| 场景 | 行为 |
| --- | --- |
| 非 PDF / 超限 / 空文件 | 400 + 可读原因，不创建 Project |
| 加密 / 损坏 PDF | Project FAILED + parseError，列表页展示原因 |
| 扫描件 / 空白 PDF | FAILED + “可能是扫描件或空白 PDF，当前版本不支持” |
| 解析超时 / 未预期异常 | FAILED，内部日志，不暴露堆栈 |
| Project 不存在 | 404 页 + 返回列表入口 |
| Task 越界 / 不属于 Project | 拒绝访问并返回有效位置 |
| 保存网络失败 | 提示保存失败，保留输入，允许重试，不跳转 |

## 7. 安全

- 服务端三重校验（扩展名 / MIME / 文件签名）+ 大小限制。
- 文件名展示前转义（React 默认转义）。
- PDF 存 `data/uploads/` 非公开路径，随机文件名，不提供下载路由。
- 所有查询校验资源归属。
- 日志不含 PDF 正文与用户备注。

## 8. 可访问性

- 按钮全部文字标签；状态用文字 + 颜色双重表达。
- 可键盘聚焦、明显焦点样式；切换 Task 后焦点移至内容区。
- 操作结果通过 aria-live 区域播报。

## 9. 测试（Vitest）

- 单测：`extract-lines`（用脚本生成的样例 PDF fixture：3 页 20 行、含空白行与重复行）、上传校验、审核状态机与事务计数、Project 状态推导。
- API 测试：各 Route Handler 的正常与错误路径（用测试数据库）。
- 验收对齐 PRD 第 12 节。

## 10. 目录结构

```
src/
  app/
    page.tsx                      # Project 列表
    api/projects/route.ts         # POST/GET
    api/projects/[projectId]/route.ts
    api/projects/[projectId]/tasks/route.ts
    api/projects/[projectId]/tasks/[sequence]/route.ts
    api/projects/[projectId]/progress/route.ts
    api/tasks/[taskId]/review/route.ts
    projects/[projectId]/review/[sequence]/page.tsx
    projects/[projectId]/result/page.tsx
  components/
    UploadButton.tsx  ProjectCard.tsx  ReviewClient.tsx  ...
  lib/
    db.ts  config.ts  validation.ts
    pdf/extract-lines.ts
    services/project-service.ts  review-service.ts
prisma/schema.prisma
tests/
data/uploads/        # gitignore
```
