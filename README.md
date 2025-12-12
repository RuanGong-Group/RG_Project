# 语境记忆 - 智能背单词Web应用

## 项目简介
语境记忆是一款以“情境化 + 词义级别跟踪”为核心的背单词 Web 应用。它旨在通过模仿“爱语境”等优秀应用的理念，结合智能复习算法和AI技术，帮助用户高效、深入地掌握英语词汇。

**技术栈**:
- **前端**: React, TypeScript, Vite, Tailwind CSS
- **后端**: Node.js, Express, TypeScript, Prisma
- **数据库**: MySQL
- **AI 功能**: Python, SiliconFlow API

## 快速开始

### 方式一：Docker 部署（推荐）

**前置要求**：
- Docker Desktop（Windows/Mac）或 Docker Engine（Linux）
- Git

**一键启动**：
```bash
# 1. 克隆代码
git clone https://github.com/RuanGong-Group/RG_project.git
cd RG_project

# 2. 启动所有服务
docker-compose up -d

# 3. 等待约30秒，然后初始化数据库
docker exec rg_backend npx prisma migrate deploy
docker exec rg_backend npx prisma db seed

# 4. 访问应用
# 前端：http://localhost:8080
# 后端：http://localhost:4000
```

**详细文档**：[Docker 部署指南](DOCKER_DEPLOYMENT.md)

---

### 方式二：本地开发环境

**前置要求**：
- Node.js v18+ 
- MySQL 8.0+
- Python 3.9+
- Git

### 获取项目

**1. 克隆代码仓库**
```bash
git clone https://github.com/RuanGong-Group/RG_project.git
cd RG_project
```

**2. 获取数据源文件夹（必需！）**

由于数据文件体积较大，没有包含在 Git 仓库中。请从团队共享网盘下载 `RG_data_sources.zip` 压缩包，并解压到与 `RG_project` **同级**的目录。

**正确的目录结构**：
```
你的工作目录/
├── RG_project/           # 代码仓库
└── RG_data_sources/      # 数据源文件夹（网盘下载）
    ├── processed/        # 处理好的词库 JSON
    ├── raw/              # 原始语料
    └── initial_data.sql  # 数据库初始化文件
```

**网盘链接**: [由项目负责人在团队群中分享]

**配置步骤**：

详细步骤请参考：
- **[环境配置指南](docs/development/ENVIRONMENT_SETUP_GUIDE.md)** - 完整的本地环境搭建步骤
- **[团队协作指南](docs/development/TEAM_COLLABORATION_GUIDE.md)** - Git 工作流和协作规范

---

## 核心功能（V3.1）

- **三路径学习模型**: 根据用户对单词的自我认知（认识、模糊、不认识），提供差异化的学习路径。
- **SM-2 智能复习算法**: 基于艾宾浩斯记忆曲线，智能安排复习计划。
- **词义级别跟踪**: 精确到每个单词的每个词义进行学习和复习。
- **复习优先策略**: 每日目标包含新学习和复习总数，复习无上限，新学习受目标限制。
- **AI 视频生成**: 支持纯复习或混合学习场景，自动生成每日学习总结视频。
- **Booster 短期强化**: 针对易混淆词义的快速强化复习机制。
- **数据驱动**: 内置丰富的数据清洗和管理脚本，确保词库质量。

## 文档导航

### 核心文档
- **[产品需求 (PRD V3.1)](docs/requirements/PRD_V3.md)** - 产品功能和设计理念
- **[数据库设计 (V3)](docs/design/Database_Design_Document_V3.md)** - 数据模型和表结构

### 部署文档
- **[Docker 部署指南](DOCKER_DEPLOYMENT.md)** - 容器化部署（推荐）
- **[云端部署指南](docs/development/CLOUD_DEPLOYMENT_GUIDE.md)** - 腾讯云部署详细步骤

### 开发文档
- **[环境配置指南](docs/development/ENVIRONMENT_SETUP_GUIDE.md)** - 本地开发环境搭建
- **[团队协作指南](docs/development/TEAM_COLLABORATION_GUIDE.md)** - Git 工作流
- **[开发经验总结](docs/development/DEVELOPMENT_LESSONS_LEARNED.md)** - 问题与解决方案
- **[后端脚本工具集](backend/scripts/README.md)** - 数据处理脚本文档
- **[API 响应文档](docs/development/BACKEND_API_ACTUAL_RESPONSES.md)** - 接口格式参考

## 目录结构
```
RG_project/
├── backend/         # 后端 (Node.js + Express)
│   ├── src/         # 源代码
│   ├── scripts/     # 数据清洗和管理脚本
│   ├── prisma/      # 数据库模型和迁移
│   └── dist/        # 编译产物 (不提交到 Git)
├── frontend_v3/     # 前端 (React + Vite)
│   ├── src/         # 源代码
│   └── dist/        # 编译产物 (不提交到 Git)
├── docs/            # 项目文档
│   ├── design/      # 数据库设计 (V1/V2/V3)
│   ├── requirements/# 产品需求 (V1/V2/V3)
│   └── development/ # 开发文档、环境配置、团队协作
├── RG_data/         # 本地运行时数据 (不提交到 Git)
│   ├── videos/      # 生成的视频文件
│   ├── audio/       # 生成的音频文件
│   ├── images/      # 生成的图片文件
│   └── cache/       # 缓存数据
└── .gitignore       # 版本控制忽略规则
```

**重要说明**：
- `dist/` 和 `RG_data/` 目录不提交到 Git，每次部署时重新生成。
- Prisma migrations 保留在版本控制中，确保团队数据库结构一致。
- 所有技术文档已归档到 `docs/development/` 目录。

## 关于本项目
这是一个小组协作的课程设计项目，旨在实践全栈开发流程，从需求分析、产品设计到编码实现、测试部署。

## 团队与贡献
- **项目负责人/后端开发**: [Your Name]
- **前端开发**: [Teammate's Name]
