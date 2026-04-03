# 前端运维与排障手册

## 1. 常用命令
- 启动开发环境：`npm run dev`
- 启动并记录开发日志：`npm run dev:log`
- 生产构建：`npm run build`
- 生产构建并记录日志：`npm run build:log`
- 关键烟雾巡检：`npm run test:smoke`
- 输出构建体积报告：`npm run build:stats`
- 清理旧日志：`npm run logs:clean`
- 本地端到端默认使用机器已安装的 `Chrome`；如需切换浏览器通道，设置 `PLAYWRIGHT_BROWSER_CHANNEL`

## 2. 本地日志位置
- 前端运行日志目录：`logs/`
- 开发日志文件前缀：`frontend-dev-*.log`
- 构建日志文件前缀：`frontend-build-*.log`
- 构建体积报告：`logs/build-stats-latest.md`

## 3. 常见问题处理

### 登录慢
- 检查控制台是否有慢路由日志
- 检查 `/system/me` 是否慢
- 检查后端数据库与登录链路日志

### 菜单点击没反应
- 检查是否发生权限回跳
- 检查是否出现请求被取消
- 检查是否有页面运行时错误

### 首页白屏或地图不显示
- 检查控制台是否有 ECharts 初始化错误
- 检查 `public/map-data/` 下资源文件是否齐全
- 检查 `public/map-data/resource-manifest.json` 是否指向了正确资源
- 检查地图摘要接口与点位接口是否返回数据

### 接口请求失败（网络错误）
- GET 接口已内置自动重试（最多 2 次，间隔 800ms/1600ms）
- 若重试后仍失败，检查后端服务是否存活：`curl http://127.0.0.1:8080/api/health/live`
- 检查 Nginx 反向代理配置是否正常

### 请求返回 429
- 触发了后端限流（每 IP 每秒 30 次，突发上限 60 次）
- 检查是否有异常重复请求或前端死循环
- 临时调整：后端环境变量 `GOV_RATE_LIMIT_RPS=60`

## 4. 服务快速恢复操作

### 后端服务重启
```bash
# systemd 方式
systemctl restart gov-backend
systemctl status gov-backend

# Docker 方式
docker restart gov-backend

# 手动方式（JDK8）
powershell -ExecutionPolicy Bypass -File ./scripts/start-dev-jdk8.ps1
```

### 验证服务就绪
```bash
# 存活探针（进程在即返回 UP）
curl http://127.0.0.1:8080/api/health/live

# 就绪探针（同时检查数据库连通性）
curl http://127.0.0.1:8080/api/health/ready
```

### 数据库备份与恢复
```bash
# 立即执行一次备份
python scripts/db_backup.py

# 定时模式（每天 02:30 自动备份，保留 7 天）
python scripts/db_backup.py --schedule

# 清理过期备份
python scripts/db_backup.py --clean-only

# 恢复备份（示例）
gunzip -c backups/gov_db_20260404_023000.sql.gz | mysql -h 127.0.0.1 -P 13306 -u db_user -p gov_db
```

### 服务健康巡检
```bash
# 检查一次
python scripts/health_check.py

# 每 30 秒持续巡检
python scripts/health_check.py --watch 30

# 连续失败 3 次后自动重启（需 systemd）
python scripts/health_check.py --watch 30 --restart
```

## 5. 运维约定
- 所有日志文件统一使用 UTF-8
- 所有新增脚本优先复用 `run-with-env-log.ps1`
- 配置变更同步更新 `.env.example` 与文档
- 数据库连接池大小通过环境变量 `GOV_DB_POOL_MAX` / `GOV_DB_POOL_MIN` 调整
- 限流参数通过环境变量 `GOV_RATE_LIMIT_RPS` / `GOV_RATE_LIMIT_BURST` 调整，无需重新打包
