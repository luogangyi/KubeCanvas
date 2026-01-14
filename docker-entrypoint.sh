#!/bin/sh
set -e

# ==================================
# KubeCanvas Docker Entrypoint
# ==================================

echo "=== KubeCanvas Starting ==="

# ==================================
# 从 ServiceAccount 或环境变量获取配置
# ==================================

SA_PATH="/var/run/secrets/kubernetes.io/serviceaccount"

# Token
if [ -z "$KUBERNETES_TOKEN" ] && [ -f "$SA_PATH/token" ]; then
    export KUBERNETES_TOKEN=$(cat "$SA_PATH/token")
    echo "✓ Using in-cluster ServiceAccount token"
elif [ -n "$KUBERNETES_TOKEN" ]; then
    echo "✓ Using provided KUBERNETES_TOKEN"
else
    echo "⚠ No Kubernetes token configured"
    export KUBERNETES_TOKEN=""
fi

# Namespace
if [ -z "$KUBERNETES_NAMESPACE" ] && [ -f "$SA_PATH/namespace" ]; then
    export KUBERNETES_NAMESPACE=$(cat "$SA_PATH/namespace")
    echo "✓ Using in-cluster namespace: $KUBERNETES_NAMESPACE"
elif [ -n "$KUBERNETES_NAMESPACE" ]; then
    echo "✓ Using provided namespace: $KUBERNETES_NAMESPACE"
else
    export KUBERNETES_NAMESPACE="default"
    echo "✓ Using default namespace"
fi

# API Server
if [ -z "$KUBERNETES_API_SERVER" ]; then
    if [ -n "$KUBERNETES_SERVICE_HOST" ] && [ -n "$KUBERNETES_SERVICE_PORT" ]; then
        export KUBERNETES_API_SERVER="https://$KUBERNETES_SERVICE_HOST:$KUBERNETES_SERVICE_PORT"
        echo "✓ Using in-cluster API server: $KUBERNETES_API_SERVER"
    else
        export KUBERNETES_API_SERVER="https://kubernetes.default.svc"
        echo "✓ Using default API server: $KUBERNETES_API_SERVER"
    fi
else
    echo "✓ Using provided API server: $KUBERNETES_API_SERVER"
fi

# ==================================
# 生成 Nginx 配置 (替换变量)
# ==================================

# 提取 host:port 从完整 URL
K8S_HOST=$(echo "$KUBERNETES_API_SERVER" | sed -E 's|https?://||' | sed -E 's|/$||')

echo "✓ K8s API upstream: $K8S_HOST"

# 生成 nginx 配置
cat > /etc/nginx/conf.d/default.conf <<EOF
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    gzip_min_length 1000;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # K8s API 代理
    location /k8s-api/ {
        proxy_pass https://${K8S_HOST}/;
        proxy_ssl_verify off;
        proxy_ssl_server_name on;
        
        # 始终使用环境变量中的 Token (覆盖前端发送的)
        proxy_set_header Authorization "Bearer ${KUBERNETES_TOKEN}";
        
        proxy_set_header Host ${K8S_HOST};
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 300s;
        proxy_buffering off;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)\$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }

    location /health {
        access_log off;
        return 200 "OK";
        add_header Content-Type text/plain;
    }
}
EOF

echo "=== Configuration Complete ==="
echo "  API Server: ${KUBERNETES_API_SERVER}"
echo "  Namespace:  ${KUBERNETES_NAMESPACE}"
echo "  Token:      ${KUBERNETES_TOKEN:+[configured]}"
echo "================================"

# 执行传入的命令
exec "$@"
