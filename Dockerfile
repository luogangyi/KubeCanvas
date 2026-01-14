# ==================================
# KubeCanvas Dockerfile
# 支持多 CPU 架构构建 (amd64, arm64)
# ==================================
#
# 单架构构建:
#   docker build -t kubecanvas:latest .
#
# 多架构构建 (需要 docker buildx):
#   docker buildx create --name multiarch --use
#   docker buildx build --platform linux/amd64,linux/arm64 -t kubecanvas:latest --push .
#
# ==================================

# 构建参数
ARG TARGETPLATFORM
ARG BUILDPLATFORM

# ==================================
# Stage 1: Build
# ==================================
FROM --platform=$BUILDPLATFORM node:20-alpine AS builder

# 显示构建平台信息
RUN echo "Building on $BUILDPLATFORM for $TARGETPLATFORM"

WORKDIR /app

# 复制依赖文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production=false

# 复制源代码
COPY . .

# 构建生产版本
RUN npm run build

# ==================================
# Stage 2: Production
# ==================================
FROM --platform=$TARGETPLATFORM nginx:alpine

# 添加标签
LABEL maintainer="KubeCanvas Authors"
LABEL description="Visual Kubernetes Resource Orchestration Tool"
LABEL version="1.0.0"
LABEL org.opencontainers.image.source="https://github.com/luogangyi/KubeCanvas"

# 复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制 Nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 复制启动脚本
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# 暴露端口
EXPOSE 80

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:80/health || exit 1

# 启动命令
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
