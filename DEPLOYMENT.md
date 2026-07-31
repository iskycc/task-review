# PDF Task Review 部署指南

生产镜像：`ghcr.io/iskycc/task-review:latest`

## 自动构建与版本发布

推送到 `main` 后，GitHub Actions 会运行测试和生产构建，并发布两个 GHCR 标签：

```text
ghcr.io/iskycc/task-review:latest
ghcr.io/iskycc/task-review:sha-<commit>
```

推送 `v*` Git 标签时还会发布同名镜像，并把镜像导出为
`pdf-task-review-<tag>-linux-amd64.tar.gz`。压缩包和 SHA-256 校验文件会同时附加到 GitHub Release。

离线服务器可以直接导入发布包：

```bash
gzip -dc pdf-task-review-v0.1.0-linux-amd64.tar.gz | docker load
```

## 环境要求

- Docker Engine 24+
- Docker Compose v2
- 一台可访问 GitHub Container Registry 的 Linux 服务器
- 默认需要开放 TCP `3000` 端口

## 使用 Docker Compose 部署

1. 获取部署文件：

   ```bash
   git clone https://github.com/iskycc/task-review.git
   cd task-review
   ```

   也可以只下载仓库中的 `docker-compose.yml`。
2. 可选：在同一目录创建 `.env`：

   ```dotenv
APP_HOST=127.0.0.1
APP_PORT=3000
IMAGE_TAG=latest
PDF_MAX_SIZE_MB=20
PDF_PARSE_TIMEOUT_MS=300000
USER_STORAGE_QUOTA_MB=1024
ALLOW_REGISTRATION=false
   ```

3. 拉取镜像并启动：

   ```bash
   docker compose pull
   docker compose up -d
   ```

4. 查看容器状态和日志：

   ```bash
   docker compose ps
   docker compose logs -f --tail=200 app
   ```

5. 浏览器访问：

   ```text
   http://127.0.0.1:3000
   ```

默认只监听宿主机回环地址，请通过 HTTPS 反向代理访问。仅在受信任内网确有需要时，才将 `APP_HOST` 改为 `0.0.0.0`。

首次启动后可创建第一个账号；首个账号会成为管理员并接管旧版本项目。`ALLOW_REGISTRATION=false` 时，已有账号后将关闭公开注册。需要新增用户时可临时开启注册，创建完成后立即关闭。

## 数据持久化

Compose 会创建名为 `pdf-task-review-data` 的 Docker volume，并挂载至容器的 `/app/data`。SQLite 数据库和上传的 PDF 都保存在该卷中，重新创建或升级容器不会丢失。

查看数据卷：

```bash
docker volume inspect pdf-task-review-data
```

升级前备份：

```bash
docker run --rm \
  -v pdf-task-review-data:/data \
  -v "$PWD":/backup \
  alpine:3.22 \
  tar czf /backup/pdf-task-review-backup.tar.gz -C /data .
```

恢复备份前请先停止服务：

```bash
docker compose down
docker run --rm \
  -v pdf-task-review-data:/data \
  -v "$PWD":/backup \
  alpine:3.22 \
  sh -c 'cd /data && tar xzf /backup/pdf-task-review-backup.tar.gz'
docker compose up -d
```

## 升级

```bash
docker compose pull
docker compose up -d
docker image prune -f
```

容器启动时会识别旧版数据库、建立 migration 基线并执行版本化 Prisma migration。迁移失败时容器会停止，不会继续以不完整结构运行。升级前仍必须备份数据卷。

## 回滚

部署固定版本时，在 `.env` 中将 `IMAGE_TAG` 设置为具体版本号，例如：

```dotenv
IMAGE_TAG=v0.1.0
```

然后执行：

```bash
docker compose pull
docker compose up -d
```

## 反向代理建议

公网环境建议使用 Caddy、Nginx 或 Traefik 提供 HTTPS，仅将应用端口暴露给反向代理。Nginx 代理时至少保留以下请求头：

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    client_max_body_size 20m;
}
```

若调整 `PDF_MAX_SIZE_MB`，请同步调整反向代理的上传大小限制。

## 常用运维命令

```bash
# 健康状态
docker inspect --format '{{json .State.Health}}' pdf-task-review

# 重启
docker compose restart app

# 停止并删除容器（保留数据卷）
docker compose down

# 删除应用及数据卷（会永久删除项目和上传文件）
docker compose down -v
```
