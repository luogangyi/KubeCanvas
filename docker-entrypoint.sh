#!/bin/sh
set -e

# 环境变量替换脚本
# 用于在运行时注入环境变量到前端配置

# 如果需要动态配置，可以在这里处理
# 例如: 替换 index.html 中的占位符

# 如果设置了 K8s Token，写入临时环境变量文件供 Nginx 使用
if [ -n "$KUBERNETES_TOKEN" ]; then
    echo "K8s token configured"
fi

# 如果挂载了 ServiceAccount token，读取它
if [ -f "/var/run/secrets/kubernetes.io/serviceaccount/token" ]; then
    export KUBERNETES_TOKEN=$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)
    echo "Using in-cluster ServiceAccount token"
fi

# 执行传入的命令
exec "$@"
