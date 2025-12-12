# Docker 部署指南

本项目使用 Docker Compose 进行容器化部署，适用于**本地开发、团队协作、云端部署**。

## 📋 快速开始

**只需一个配置文件**：`docker-compose.yml`

**设计理念**：
- ✅ 开发和部署使用统一配置（简单、可靠）
- ✅ 支持 Python 脚本热更新（无需重启容器）
- ✅ 一次配置，处处运行（本地、云端使用相同命令）

**启动命令**：
```bash
docker-compose up -d
```

**访问方式**：
- 前端：http://localhost:8080
- 后端：http://localhost:4000

---

## 🚀 部署场景

### 场景 1：本地开发测试

**适用于**：日常开发、功能调试

**启动命令**：
```bash
# 进入项目目录
cd RG_project

# 启动所有服务
docker-compose up -d

# 查看日志（可选）
docker-compose logs -f backend
```

**访问方式**：
- 前端：http://localhost:8080
- 后端：http://localhost:4000

---

### 场景 2：云服务器部署

**适用于**：团队协作、演示展示、生产环境

**部署步骤**：

```bash
# 1. SSH 登录云服务器
ssh root@your-server-ip

# 2. 安装 Docker（首次部署）
curl -fsSL https://get.docker.com | sh
systemctl start docker
systemctl enable docker

# 3. 拉取代码
git clone https://github.com/RuanGong-Group/RG_project.git
cd RG_project

# 4. 配置环境变量（可选）
# 复制 .env.example 为 .env，修改必要的配置
cp backend/.env.example backend/.env

# 5. 启动服务（和本地命令完全相同）
docker-compose up -d --build

# 6. 等待服务启动（约 30 秒）
sleep 30

# 7. 初始化数据库
docker exec rg_backend npx prisma migrate deploy
docker exec rg_backend npx prisma db seed

# 8. 查看服务状态
docker ps
```

**防火墙配置**（腾讯云/阿里云）：
- 在云服务器控制台开放端口：`8080`（前端）、`4000`（后端）

**访问方式**：
- 前端：http://服务器IP:8080
- 后端：http://服务器IP:4000

---

### 场景 3：团队成员测试

**方式 A：使用云端环境（推荐）**

---

## 🔧 常用操作

### 查看服务状态
```bash
# 查看运行中的容器
docker ps

# 查看所有容器（包括已停止）
docker ps -a
```

### 查看日志
```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker logs -f rg_backend
docker logs -f rg_frontend
docker logs -f rg_db
```

### 重启服务
```bash
# 重启所有服务
docker-compose restart

# 重启特定服务
docker restart rg_backend
docker restart rg_frontend
```

### 停止和清理
```bash
# 停止所有服务
docker-compose down

# 停止并删除数据卷（⚠️ 会丢失数据库数据）
docker-compose down -v

# 清理未使用的镜像和容器
docker system prune -a
```

### 代码更新后的操作

**Python 脚本修改（自动生效）**：
```bash
# 修改 backend/scripts/ 下的 Python 文件后
# 无需任何操作，直接生效（因为挂载了 volume）
```

**TypeScript/React 代码修改（需重新构建）**：
```bash
# 方式 1：仅重启容器（如果代码已在镜像中）
docker-compose restart backend
docker-compose restart frontend

# 方式 2：重新构建镜像（推荐）
docker-compose down
docker-compose up -d --build

# 方式 3：仅构建特定服务
docker-compose build backend
docker-compose up -d backend
```

---

## ❓ 常见问题解答

### Q1：本地和云端用同一个配置，会有问题吗？

**A：不会！** 

Docker 的核心优势就是"环境一致性"：
- ✅ 本地能跑 → 云端也能跑
- ✅ 配置一样 → 行为一样
- ✅ 简单可靠

### Q2：为什么不区分开发/生产环境？

**A：因为这是小组作业，不是商业项目！**

**商业项目需要区分的原因**：
- 生产环境要求极高稳定性
- 不能随意修改代码
- 需要版本管理、回滚机制

**小组作业的实际情况**：
- 重点是**功能实现**和**演示效果**
- 不需要考虑百万用户并发
- 简单 > 复杂

### Q3：云服务器上需要做什么特殊配置吗？

**A：不需要！命令完全一样。**

```bash
# 本地
docker-compose up -d

# 云端（完全一样）
docker-compose up -d
```

**唯一的区别**：
- 本地访问：`http://localhost:8080`
- 云端访问：`http://服务器IP:8080`（需要开放防火墙端口）

### Q4：组员可以直接测试云端部署的版本吗？

**A：可以！非常推荐这样做！**

**场景 1：组长在云端部署好后**
```bash
# 组长告诉大家："我部署到云端了，访问 http://123.45.67.89:8080"
```

**场景 2：组员直接测试**
```bash
# 组员：
# 1. 打开浏览器
# 2. 输入：http://123.45.67.89:8080
# 3. 开始测试功能
# 
# 不需要：
# ❌ 不需要 git pull
# ❌ 不需要安装 Docker
# ❌ 不需要启动任何服务
```

**场景 3：展示给老师**
```bash
# 直接把链接发给老师：
# "老师您好，我们的项目地址是：http://123.45.67.89:8080"
# 
# 老师：
# - 打开浏览器就能看
# - 不需要安装任何东西
# - 不需要懂 Docker
```

---

## 🎯 推荐的工作流程

### 阶段 1：本地开发（每个人）

```bash
# 1. 克隆项目
git clone https://github.com/RuanGong-Group/RG_project.git
cd RG_project

# 2. 启动服务
docker-compose up -d

# 3. 开发功能
# - 修改代码
# - 测试功能
# - 提交代码

# 4. 推送到 GitHub
git add .
git commit -m "feat: 新功能"
git push origin dev
```

### 阶段 2：云端部署（组长）

```bash
# 1. SSH 登录云服务器
ssh root@123.45.67.89

# 2. 拉取最新代码
git clone https://github.com/RuanGong-Group/RG_project.git
cd RG_project

# 3. 启动服务（和本地一模一样）
docker-compose up -d

# 4. 开放防火墙端口
# 腾讯云：控制台 → 防火墙 → 添加规则
# 端口：8080, 4000

# 5. 通知组员
# "大家可以访问 http://123.45.67.89:8080 测试了！"
```

### 阶段 3：组员测试

**方式 A：使用云端环境（推荐）**

无需本地环境，直接访问云端部署的服务：
```
http://服务器IP:8080
```

**方式 B：本地环境测试**

```bash
# 1. 拉取最新代码
git pull origin dev

# 2. 启动服务
docker-compose up -d

# 3. 测试功能
# 浏览器打开：http://localhost:8080
```

---

## ❓ 故障排查

### 问题诊断清单

遇到问题时，按以下顺序检查：

- [ ] **容器状态**：`docker ps` 确认所有容器都在运行
- [ ] **端口占用**：`netstat -ano | findstr :8080` 检查端口是否被占用
- [ ] **日志错误**：`docker logs -f rg_backend` 查看错误信息
- [ ] **数据库连接**：日志中是否有 "✅ 数据库连接成功"
- [ ] **防火墙**：云服务器是否开放了 8080、4000 端口

### 常见问题及解决方案

**1. 容器启动失败**

```bash
# 查看详细错误信息
docker-compose logs backend

# 常见原因：
# - 端口被占用 → 修改 docker-compose.yml 中的端口映射
# - 环境变量缺失 → 检查 backend/.env 文件
# - 磁盘空间不足 → docker system df 查看占用，docker system prune 清理
```

**2. 数据库连接失败**

```bash
# 检查数据库容器状态
docker ps | grep rg_db

# 进入数据库容器测试连接
docker exec -it rg_db mysql -uroot -ppassword -D rg_vocabulary

# 如果无法连接，重启数据库容器
docker restart rg_db
```

**3. 前端页面无法加载**

```bash
# 检查前端容器状态
docker ps | grep rg_frontend

# 查看前端日志
docker logs rg_frontend

# 重新构建前端
docker-compose build frontend
docker-compose up -d frontend
```

**4. Python 脚本执行错误（视频生成失败）**

```bash
# 进入后端容器
docker exec -it rg_backend bash

# 手动运行 Python 脚本测试
cd scripts/video_gen
python3 generate_daily_video.py

# 检查依赖是否安装
pip list | grep moviepy
```

**5. 磁盘空间不足**

```bash
# 查看 Docker 占用空间
docker system df

# 清理未使用的镜像和容器
docker system prune -a

# 清理旧的日志文件
docker-compose logs --tail=0 -f > /dev/null
```

---

## 👥 团队协作工作流

### 日常开发流程

**开发人员**：
```bash
# 1. 拉取最新代码
git pull origin dev

# 2. 本地开发（不使用 Docker，效率更高）
cd backend && npm run dev  # 后端热重载
cd frontend_v3 && npm run dev  # 前端热重载

# 3. 提交代码前，使用 Docker 测试
docker-compose up --build

# 4. 确认无误后提交
git add .
git commit -m "feat: 新功能描述"
git push origin dev
```

**部署人员（项目负责人）**：
```bash
# 1. SSH 登录云服务器
ssh root@server-ip

# 2. 拉取最新代码
cd /root/RG_project
git pull origin dev

# 3. 重新构建并启动
docker-compose down
docker-compose up -d --build

# 4. 验证服务状态
docker ps
docker logs -f rg_backend

# 5. 通知团队成员
# "云端环境已更新，可以测试了"
```

### 推荐的分支策略

```
main (生产环境，稳定版本)
  ↑
dev (开发环境，日常开发)
  ↑
  ├── feature/功能名称 (功能分支)
  ├── bugfix/问题描述 (修复分支)
  └── hotfix/紧急修复 (热修复分支)
```

### 协作最佳实践

1. **本地开发不用 Docker**
   - 使用 `npm run dev` 进行热重载开发
   - Docker 仅用于提交前测试和生产部署

2. **定期同步云端环境**
   - 建议每日固定时间（如晚上 8 点）更新云端
   - 重大功能完成后立即部署

3. **代码审查流程**
   - 功能分支 → Pull Request → 代码审查 → 合并到 dev
   - 定期将 dev 合并到 main 作为稳定版本

---

## 🎓 Docker 核心概念

### 为什么选择 Docker？

相比传统部署方式，Docker 提供：

| 特性 | 传统部署 | Docker 部署 |
|------|---------|------------|
| **环境一致性** | 本地和云端可能不一致 | 完全一致 |
| **依赖管理** | 手动安装各种软件 | 打包在镜像中 |
| **部署速度** | 需要配置环境（数小时） | 一键启动（数分钟） |
| **资源隔离** | 进程共享系统资源 | 容器独立隔离 |
| **回滚能力** | 困难 | 切换镜像版本即可 |

### 容器 vs 虚拟机

```
虚拟机 (VM)                   Docker 容器
┌─────────────┐              ┌─────────────┐
│   应用 1    │              │   应用 1    │
│   应用 2    │              │   应用 2    │
├─────────────┤              ├─────────────┤
│  完整 OS    │              │  容器引擎   │
├─────────────┤              ├─────────────┤
│  虚拟化层   │              │   宿主 OS   │
├─────────────┤              ├─────────────┤
│  硬件层     │              │   硬件层    │
└─────────────┘              └─────────────┘
启动时间：分钟级              启动时间：秒级
资源占用：GB 级               资源占用：MB 级
```

---

## 🔒 安全建议

### 生产环境安全检查清单

- [ ] 修改默认密码（数据库 root 密码）
- [ ] 配置 HTTPS（使用 Nginx + Let's Encrypt）
- [ ] 限制数据库端口仅内网访问
- [ ] 定期备份数据（数据库 + 文件存储）
- [ ] 配置防火墙规则（仅开放必要端口）
- [ ] 使用环境变量管理敏感信息
- [ ] 启用 Docker 容器资源限制

### 环境变量管理

**不要将敏感信息提交到 Git**：

```bash
# .gitignore 中已包含
backend/.env
frontend_v3/.env
.env.local
```

**推荐做法**：
```bash
# 1. 创建 .env.example 模板
cat > backend/.env.example << EOF
DATABASE_URL=mysql://root:YOUR_PASSWORD@db:3306/rg_vocabulary
REDIS_URL=redis://redis:6379
JWT_SECRET=YOUR_SECRET_KEY
EOF

# 2. 实际部署时复制并修改
cp backend/.env.example backend/.env
# 然后编辑 .env 填入真实密码
```

---

## 📚 相关文档

- [云端部署详细指南](./docs/development/CLOUD_DEPLOYMENT_GUIDE.md) - 包含腾讯云部署、OAuth 配置、COS 存储等
- [数据库设计文档](./docs/design/Database_Design_Document_V3.md) - 数据库表结构和关系
- [产品需求文档](./docs/requirements/PRD_V3.md) - 产品功能和业务逻辑
- [API 文档](./docs/development/API_Documentation.md) - 后端 API 接口说明

---

## 📝 版本记录

| 版本 | 日期 | 变更说明 |
|------|------|---------|
| 1.0 | 2025-11-10 | 初始版本，基础 Docker 配置 |
| 2.0 | 2025-12-12 | 优化文档结构，添加故障排查、团队协作流程 |

---

**当前推荐部署命令**：`docker-compose up -d --build`

