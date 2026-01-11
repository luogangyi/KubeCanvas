// K8s API 配置文件
// 请根据您的 K8s 集群信息填写以下配置

export default {
  // K8s API Server 地址
  // 例如: https://192.168.1.100:6443
  apiServer: 'https://your-k8s-api-server:6443',

  // 认证 Token
  // 可以通过 kubectl create token <service-account> 获取
  token: 'your-bearer-token-here',

  // 默认命名空间
  namespace: 'default',

  // 请求超时时间（毫秒）
  timeout: 30000,

  // 是否跳过 TLS 证书验证（仅用于开发环境）
  skipTLSVerify: true
}
