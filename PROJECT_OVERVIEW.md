# 项目总览（Project Overview）

## 一句话说明
语境记忆 — 一款以“情境化 + 词义级别跟踪”为核心的背单词 Web 应用，前端 React + 后端 Node.js + MySQL（Prisma ORM）。

## 核心目标
- 以单词为学习单位，但内部精确到词义（Meaning）进行跟踪和复习。
- 支持情境化例句、逐词义学习、艾宾浩斯记忆曲线驱动的复习。
- 中央词库 + 词书标签化管理（BookTag），避免数据冗余。

## 架构概览
- 前端：`frontend_v3/`（React + TypeScript + Vite），运行端口 `5173`。
- 后端：`backend/`（Node.js + Express + TypeScript），运行端口 `3000`。
- 数据库：MySQL（`vocabulary_db`），通过 Prisma 连接（`DATABASE_URL` 在 `backend/.env`）。
- 数据存储：`RG_data/`（视频、音频、图片等生成文件，被 .gitignore 忽略）。
- 缓存层：可选 Redis（未配置时自动使用内存存储）。

## 主要路径与文件
- 后端入口：`backend/src/index.ts`
- 后端数据库定义：`backend/prisma/schema.prisma`
- 前端 API 客户端：`frontend_v3/src/services/axios.ts`
- 学习核心控制器：`backend/src/controllers/session.controller.ts`
- 词书导入脚本：`backend/scripts/import-vocabulary.ts`
- API 文档：`BACKEND_API_ACTUAL_RESPONSES.md`（通过 `npm run extract-api-docs` 自动生成）
- 数据清洗工具：`backend/scripts/` 目录（详见 scripts/README.md）

## 核心已实现功能
1. **三路径学习模型**（Path A/B/C）：情境引入 → 自我评估 → 差异化学习
2. **SM-2 复习算法**：基于艾宾浩斯记忆曲线的智能复习调度
3. **短期强化机制（Booster）**：5卡/10卡间隔的快速巩固
4. **稳定乱序系统**：基于用户Salt的可重现随机排序
5. **Session学习管理**：支持新学/复习/混合三种模式
6. **打卡与统计**：每日学习进度跟踪和可视化
7. **AI视频生成**：支持每日单词视频自动生成（需配置Python环境和API密钥）
8. **Redis缓存**：可选Redis支持，未配置时自动降级为内存存储

## 关键设计决策
1. **V3数据模型**：Word → Meaning（词义级别跟踪）
2. **例句复用**：`example_pool` + 关联表，例句可服务于多个词义
3. **词书标签化**：BookTag + WordTagRelation，实现词书与单词的多对多关系
4. **稳定乱序**：UserBookSettings 存储 salt，确保用户每次看到相同顺序
5. **词形变化支持**：Word表的lemma字段，建立原型词关系

## 快速上手指南
新成员加入项目，请按以下顺序阅读文档：
1. **本文档**（PROJECT_OVERVIEW.md）- 了解项目概况
2. **ENVIRONMENT_SETUP_GUIDE.md** - 配置开发环境
3. **Database_Design_Document_V3.md** - 理解数据库设计
4. **PRD_V3.md** - 了解产品需求
5. **BACKEND_API_ACTUAL_RESPONSES.md** - 前后端对接必读

---

（本文件用于快速把项目上下文带到新会话，建议把它作为新会话的第一条输入参考。）
