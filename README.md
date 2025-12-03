# 语境记忆 - 智能背单词Web应用

## 项目简介
语境记忆是一款以“情境化 + 词义级别跟踪”为核心的背单词 Web 应用。它旨在通过模仿“爱语境”等优秀应用的理念，结合智能复习算法和AI技术，帮助用户高效、深入地掌握英语词汇。

**技术栈**:
- **前端**: React, TypeScript, Vite, Tailwind CSS
- **后端**: Node.js, Express, TypeScript, Prisma
- **数据库**: MySQL
- **AI 功能**: Python, SiliconFlow API

## 快速开始

### 前置要求
- Node.js v18+ 
- MySQL 8.0+
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

### 详细配置步骤

本项目包含前后端，需要分别安装依赖和配置环境。**详细步骤请务必参考**：
- **[环境配置指南](docs/development/ENVIRONMENT_SETUP_GUIDE.md)** - 完整的环境搭建步骤
- **[团队协作指南](docs/development/TEAM_COLLABORATION_GUIDE.md)** - Git 工作流和协作规范

## 核心功能
- **三路径学习模型**: 根据用户对单词的自我认知（认识、模糊、不认识），提供差异化的学习路径，实现高效学习。
- **SM-2 智能复习算法**: 基于艾宾浩斯记忆曲线，智能安排复习计划，确保长久记忆。
- **词义级别跟踪**: 精确到每个单词的每个词义进行学习和复习，真正掌握单词。
- **AI 视频生成**: 将每日所学单词自动生成总结视频，提供沉浸式复习体验。
- **数据驱动**: 内置丰富的数据清洗和管理脚本，确保词库质量。

## 文档导航
- **产品需求**: [docs/requirements/PRD_V3.md](docs/requirements/PRD_V3.md) - 了解产品功能和设计理念。
- **数据库设计**: [docs/design/Database_Design_Document_V3.md](docs/design/Database_Design_Document_V3.md) - 查看数据模型和表结构。
- **开发经验总结**: [docs/development/DEVELOPMENT_LESSONS_LEARNED.md](docs/development/DEVELOPMENT_LESSONS_LEARNED.md) - 记录了项目开发过程中的问题与解决方案，是团队宝贵的财富。
- **后端脚本工具集**: [backend/scripts/README.md](backend/scripts/README.md) - 查看所有后端工具脚本的用途和用法。
- **API 响应文档**: [docs/development/BACKEND_API_ACTUAL_RESPONSES.md](docs/development/BACKEND_API_ACTUAL_RESPONSES.md) - 后端接口实际返回格式参考。

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
