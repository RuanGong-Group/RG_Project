# 语境记忆 - 智能背单词Web应用

## 项目简介
语境记忆是一款以“情境化 + 词义级别跟踪”为核心的背单词 Web 应用。它旨在通过模仿“爱语境”等优秀应用的理念，结合智能复习算法和AI技术，帮助用户高效、深入地掌握英语词汇。

**技术栈**:
- **前端**: React, TypeScript, Vite, Tailwind CSS
- **后端**: Node.js, Express, TypeScript, Prisma
- **数据库**: MySQL
- **AI 功能**: Python, SiliconFlow API

## 快速开始
本项目包含前后端，需要分别启动。详细步骤请务必参考：
- **[ENVIRONMENT_SETUP_GUIDE.md](ENVIRONMENT_SETUP_GUIDE.md)**

## 核心功能
- **三路径学习模型**: 根据用户对单词的自我认知（认识、模糊、不认识），提供差异化的学习路径，实现高效学习。
- **SM-2 智能复习算法**: 基于艾宾浩斯记忆曲线，智能安排复习计划，确保长久记忆。
- **词义级别跟踪**: 精确到每个单词的每个词义进行学习和复习，真正掌握单词。
- **AI 视频生成**: 将每日所学单词自动生成总结视频，提供沉浸式复习体验。
- **数据驱动**: 内置丰富的数据清洗和管理脚本，确保词库质量。

## 文档导航
- **项目概览**: [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) - 新成员必读，快速了解项目全貌。
- **产品需求**: [docs/requirements/PRD_V3.md](docs/requirements/PRD_V3.md) - 了解产品功能和设计理念。
- **数据库设计**: [docs/design/Database_Design_Document_V3.md](docs/design/Database_Design_Document_V3.md) - 查看数据模型和表结构。
- **开发经验总结**: [docs/development/DEVELOPMENT_LESSONS_LEARNED.md](docs/development/DEVELOPMENT_LESSONS_LEARNED.md) - 记录了项目开发过程中的问题与解决方案，是团队宝贵的财富。
- **后端脚本工具集**: [backend/scripts/README.md](backend/scripts/README.md) - 查看所有后端工具脚本的用途和用法。

## 目录结构
```
RG_project/
├── backend/         # 后端 (Node.js + Express)
├── frontend_v3/     # 前端 (React + Vite)
├── docs/            # 项目文档 (需求、设计、开发)
├── RG_data/         # 本地数据 (视频、音频等, .gitignore)
└── ...
```

## 关于本项目
这是一个小组协作的课程设计项目，旨在实践全栈开发流程，从需求分析、产品设计到编码实现、测试部署。

## 团队与贡献
- **项目负责人/后端开发**: [Your Name]
- **前端开发**: [Teammate's Name]
