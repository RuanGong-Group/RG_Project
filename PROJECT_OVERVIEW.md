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

## 主要路径与文件
- 后端入口：`backend/src/index.ts`
- 后端数据库定义：`backend/prisma/schema.prisma`
- 前端 API 客户端：`frontend_v3/src/services/axios.ts`
- 学习核心控制器：`backend/src/controllers/learning.controller.ts`
- 导入脚本（计划）：`backend/import-wordbook.ts`（待实现）

## 关键设计决策
1. **V2二层数据模型**：Word → Meaning（简化架构，partOfSpeech改为字符串字段）。
2. 例句复用：`example_pool` + 关联表，例句可服务于多个词义。
3. 词书即标签：BookTag + WordTagRelation，实现词书与单词的多对多关系。
4. 打卡双重计数：对用户展示按"单词"计数，内部统计按"词义"计数。
5. **词形变化支持**：Word表新增lemma和lemmaId字段，建立原型词关系。

## 如何在新聊天中继续工作（建议流程）
1. 打开新聊天，告诉助手读取以下文件：
   - `PROJECT_OVERVIEW.md`
   - `DATABASE_DESIGN.md`
   - `IMPORT_GUIDE.md`
   - `TASK_LIST.md`（任务清单已记录在 TODO 管理工具中，也可导出）
2. 在新聊天中直接说“我现在要开始任务 X”，并给出数据文件路径（例如 `data/cet4.json`）。

---

（本文件用于快速把项目上下文带到新会话，建议把它作为新会话的第一条输入参考。）
