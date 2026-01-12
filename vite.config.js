import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // 加载环境变量
  const env = loadEnv(mode, process.cwd(), '')

  // K8s API Server 地址（从环境变量获取）
  const k8sApiServer = env.VITE_K8S_API_SERVER || 'https://localhost:6443'

  return {
    plugins: [vue()],

    // 开发服务器配置
    server: {
      proxy: {
        // 代理 /k8s-api 到实际的 K8s API Server
        '/k8s-api': {
          target: k8sApiServer,
          changeOrigin: true,
          secure: false, // 跳过 TLS 验证（开发环境）
          rewrite: (path) => path.replace(/^\/k8s-api/, ''),
        },
      },
    },

    // 测试配置
    test: {
      globals: true,
      environment: 'node',
      include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: ['node_modules/', 'src/test/schemas/'],
      },
    },
  }
})
