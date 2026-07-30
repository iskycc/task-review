# PDF Task Review

一个将 PDF 文本自动转换为审核任务的轻量 Web 应用。上传 PDF 后，系统按照页码和文本行顺序生成任务，支持逐条通过、暂时遗留、备注、前后导航以及审核结果汇总。

界面采用 Apple-like 设计风格，支持亮色、深色和跟随系统主题，并针对桌面端与移动端进行了响应式适配。

## 核心功能

- 上传并校验单个 PDF 文件
- 按 PDF 页码和视觉文本行生成有序任务
- 记录任务来源页码与顺序
- 逐条审核，每次聚焦一个任务
- 支持“通过”和“暂时遗留”两种审核结论
- 暂时遗留时强制填写备注
- 支持上一条、下一条和跳过待处理任务
- 自动保存审核状态、备注与最后停留位置
- 展示项目进度和审核结果汇总
- 支持亮色、深色及系统主题
- SQLite 数据与原始 PDF 持久化存储
- 提供 Docker 镜像、健康检查和 Docker Compose 配置

## 快速部署

推荐直接使用 Docker Hub 上的生产镜像：

```text
iskycc/pdf-task-review:latest
```

克隆仓库并启动：

```bash
git clone https://github.com/iskycc/task-review.git
cd task-review
docker compose pull
docker compose up -d
```

浏览器访问：

```text
http://localhost:3000
```

查看运行状态：

```bash
docker compose ps
docker compose logs -f --tail=200 app
```

Compose 会创建 `pdf-task-review-data` 数据卷，用于持久化 SQLite 数据库和上传的 PDF。更完整的备份、恢复、升级、回滚及反向代理配置请参阅 [DEPLOYMENT.md](./DEPLOYMENT.md)。

## Docker 配置

可在仓库根目录创建 `.env` 调整 Compose 参数：

```dotenv
APP_PORT=3000
IMAGE_TAG=latest
PDF_MAX_SIZE_MB=20
```

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `APP_PORT` | `3000` | 映射到宿主机的访问端口，仅用于 Compose |
| `IMAGE_TAG` | `latest` | Docker 镜像标签，可固定为 `0.1.0` |
| `PDF_MAX_SIZE_MB` | `20` | 单个 PDF 的最大体积，单位 MB |

当前发布的镜像标签：

- `iskycc/pdf-task-review:latest`
- `iskycc/pdf-task-review:0.1.0`

当前镜像平台为 `linux/amd64`。

## 本地开发

### 环境要求

- Node.js 22+
- npm

SQLite 通过 Prisma 直接使用，无需单独安装数据库服务。

### 初始化

```bash
git clone https://github.com/iskycc/task-review.git
cd task-review
cp .env.example .env
npm ci
npm run db:push
npm run dev
```

开发服务器默认运行在：

```text
http://localhost:3000
```

### 本地环境变量

```dotenv
DATABASE_URL="file:./dev.db"
UPLOAD_DIR="data/uploads"
PDF_MAX_SIZE_MB=20
```

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `DATABASE_URL` | `file:./dev.db` | Prisma 使用的 SQLite 数据库地址 |
| `UPLOAD_DIR` | `data/uploads` | 原始 PDF 保存目录 |
| `PDF_MAX_SIZE_MB` | `20` | 上传文件大小限制 |

## 常用命令

```bash
# 启动开发服务器
npm run dev

# 生产构建
npm run build

# 启动生产服务器
npm start

# 同步数据库结构
npm run db:push

# 生成 Prisma Client
npm run db:generate

# 运行全部测试
npm test

# 监听模式运行测试
npm run test:watch

# 生成 3 页、20 条任务的验收样例 PDF
npm run sample:pdf
```

样例文件会生成到 `data/验收样例.pdf`。生成中文样例需要系统安装 Droid Sans Fallback 字体。

## 使用流程

1. 在项目列表点击“上传 PDF”。
2. 选择或拖入包含可复制文本的 PDF。
3. 系统解析文本并按行创建审核任务。
4. 点击“开始审核”，逐条查看任务。
5. 选择“通过”，或填写备注后选择“暂时遗留”。
6. 可使用按钮或左右方向键在任务之间导航。
7. 完成后进入结果页查看总数、通过、暂留和待处理数量。

## 技术栈

- [Next.js](https://nextjs.org/) 15
- [React](https://react.dev/) 19
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/) 4
- [Prisma](https://www.prisma.io/) 6
- SQLite
- [unpdf](https://github.com/unjs/unpdf)
- [Lucide](https://lucide.dev/)
- [Vitest](https://vitest.dev/)

## 项目结构

```text
.
├── prisma/                     # Prisma schema
├── scripts/                    # 开发与样例脚本
├── src/
│   ├── app/                    # Next.js 页面与 API Routes
│   ├── components/             # 业务组件和 UI 基础组件
│   └── lib/                    # 配置、数据库、PDF 解析与业务服务
├── tests/                      # 单元测试与 API 测试
├── Dockerfile                 # 多阶段生产镜像
├── docker-compose.yml         # 容器编排与持久化配置
├── DEPLOYMENT.md              # 完整生产部署指南
├── PRD.md                     # 产品需求文档
└── Todo.md                    # UI 改进与验收清单
```

## 数据与安全

- 服务端会同时检查扩展名、MIME 类型、文件大小及 PDF 文件签名。
- Docker 容器使用非 root 用户运行。
- 容器启动时自动执行非破坏性的 Prisma schema 同步。
- Docker Compose 通过独立数据卷保存数据库和上传文件。
- 公网部署建议使用 Nginx、Caddy 或 Traefik 提供 HTTPS。
- 升级前应备份 `pdf-task-review-data` 数据卷。

## 当前限制

- 仅支持包含可复制文本的 PDF，不支持扫描件 OCR。
- 不支持加密或需要密码的 PDF。
- 暂不支持批量上传、多人协作和权限管理。
- 暂不支持 PDF 原页面对照预览。
- 暂不支持导出审核报告。

详细产品边界和业务规则请参阅 [PRD.md](./PRD.md)。

## 验证

```bash
npm run build
npm test
npm audit --omit=dev
docker compose config
```

当前测试覆盖 PDF 行提取、数据访问、项目服务、审核服务、输入校验及 API 路由。
