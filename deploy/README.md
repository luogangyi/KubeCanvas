# KubeCanvas Kubernetes Deployment Manifests
# 
# 使用方法:
#   kubectl apply -f deploy/01-rbac.yaml
#   kubectl apply -f deploy/02-deployment.yaml
#   kubectl apply -f deploy/03-service.yaml
#   kubectl port-forward svc/kubecanvas 8080:80 -n default
#
# 删除:
#   kubectl delete -f deploy/
#
# 注意:
#   1. 请先构建并推送镜像到你的镜像仓库
#   2. deploy/03-service-nodeport.yaml 仅用于受控网络下的显式暴露
