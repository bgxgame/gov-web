# ARM 麒麟前端部署文件

## 文件说明
- `nginx.conf`：前端静态资源、`/api` 接口代理和 `/minio` 附件代理配置。
- `frontend.env.example`：前端运行时环境变量示例，部署后可直接复制为 `frontend.env` 使用。

## 部署约定
- 静态资源目录：`/opt/gov4/frontend/dist`
- 前端运行时配置：`/opt/gov4/frontend/frontend.env`
- Nginx 配置挂载路径：`/etc/nginx/conf.d/default.conf`
- 后端容器名：`gov4-backend`
- MinIO 容器名：`gov4-minio`

## 说明
- 前端构建产物与 CPU 架构无关，可以在本机构建完成后直接上传到 ARM 服务器。
- 当前配置会把 `/api/*` 请求转发到容器网络中的 `gov4-backend:8080`。
- 当前配置会把 `/minio/*` 请求转发到容器网络中的 `gov4-minio:9000`，用于图片查看和附件下载。
- 对外统一只暴露 `81` 端口，浏览器不需要直接访问 MinIO 的 `9000/9001` 端口。
- `frontend.env` 中的变量会在容器启动前生成 `env.js`，因此修改前端配置后只需要重新执行 `run-frontend.sh`，不需要重新打包。
