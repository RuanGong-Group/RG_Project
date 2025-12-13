# 后端脚本工具集

> **版本**: v3.2
> **更新日期**: 2025-12-03
> **维护者**: RG_project 团队

---

## 📖 概述

本目录包含数据清洗、测试管理、数据库诊断和 API 文档生成的各类脚本工具。

---

## 🧹 数据清洗脚本（核心）

### 1. `check-sentence-quality.ts` ⭐
**检查例句质量问题**

```bash
npx ts-node scripts/check-sentence-quality.ts
```

检测：
- 英文句子中的中文字符
- 填空题（`___` 符号）
- 多行内容（换行符）
- 中文括号和选项标记

### 2. `clean-quality-issues.ts` ⭐
**清理严重质量问题**

```bash
npx ts-node scripts/clean-quality-issues.ts
```

删除：
- 英文中含中文的例句
- 填空题、多行内容
- 中文括号、选项标记

### 3. `comprehensive-data-cleaning.ts` ⭐
**综合数据清洗**

```bash
npx ts-node scripts/comprehensive-data-cleaning.ts
```

处理：
1. 清理问题翻译
2. 删除试卷格式例句
3. 删除过短碎片
4. 补充缺失例句
5. 清理过度复用关联

### 4. `data-quality-audit.ts` ⭐
**数据质量审计**

```bash
npx ts-node scripts/data-quality-audit.ts
```

生成完整的数据质量报告。

### 5. `translate-missing.ts` ⭐
**批量翻译缺失的例句**

```bash
npx ts-node scripts/translate-missing.ts
```

使用 AI 翻译所有缺少中文翻译的例句。

---

## 📚 数据管理脚本

### 1. `import-vocabulary.ts` ⭐
**导入词库数据**

```bash
npx ts-node scripts/import-vocabulary.ts
```

用于导入新的词库数据（如 CET-6、考研词汇等）。

### 2. `reset-for-testing.ts` ⭐
**一键重置测试环境**

```bash
# 快速重置（清除所有学习数据，保留词库）
npx ts-node scripts/reset-for-testing.ts

# 完全重置（清空+重新导入）
npx ts-node scripts/reset-for-testing.ts --full
```

**清理内容**：
- UserLearningProgress（学习进度）
- DailyCheckIn（每日打卡统计）⚠️ v3.2新增
- UserWordNotebook（生词本）
- UserBookSettings（词书乱序Salt）⚠️ v3.2新增
- UserAchievement（用户成就）⚠️ v3.2新增
- VideoGenerationJob（视频生成任务）⚠️ v3.2新增

**保留数据**：
- User（用户账户）
- Word, Meaning, ExamplePool（词库）
- BookTag, Relations（词书）

### 3. `prepare-test-environment.ts`
**准备高级测试环境**

```bash
npx ts-node scripts/prepare-test-environment.ts
```

构造复杂的测试场景（如不同熟练度分布、待复习单词等），用于开发和测试复习算法。

---

## 🔍 数据库诊断脚本（新增）

### 1. `check-all-user-data.ts` ⭐ NEW
**一键检查所有用户数据表**

```bash
npx ts-node scripts/check-all-user-data.ts
```

快速诊断数据库状态，显示所有用户相关表的记录数量：
- UserLearningProgress
- DailyCheckIn
- UserWordNotebook
- UserBookSettings
- UserAchievement
- VideoGenerationJob
- User

**用途**：
- 验证数据清理是否成功
- 快速了解测试环境状态
- 排查数据不一致问题

### 2. `check-learning-data.ts`
**检查学习进度详情**

```bash
npx ts-node scripts/check-learning-data.ts
```

详细显示：
- 学习进度总数和按用户统计
- 最近的学习记录
- 今日学习/复习数据

### 3. `check-checkin-data.ts`
**检查每日打卡记录**

```bash
npx ts-node scripts/check-checkin-data.ts
```

显示最近的每日打卡记录，用于排查统计数据异常。

---

## 📚 API 文档工具

### `extract-api-docs.ts`
**半自动提取 API 响应示例**

在后端目录运行：

```bash
npm run docs
```

生成的文档位于：`../../docs/development/BACKEND_API_ACTUAL_RESPONSES.md`

**工作原理**：使用正则表达式扫描 `src/controllers`，提取 `res.json()` 响应内容。

**重要说明**：
- 这是一个**辅助工具**，生成的文档需要**人工校对和补充**。
- 无法自动提取路径、HTTP 方法等信息，需手动填写。
- 建议未来迁移到 Swagger/OpenAPI 规范以实现真正的自动化。

**最佳实践**：
1. 修改 API 后运行 `npm run docs` 获取响应格式草稿
2. 手动补充路径、方法、参数等信息
3. 提交前确保文档准确性

---

## 📋 数据清洗工作流（标准操作流程）

**每次导入新数据后必须按此顺序执行**：

```bash
# 1. 检查质量问题
npx ts-node scripts/check-sentence-quality.ts

# 2. 清理严重问题
npx ts-node scripts/clean-quality-issues.ts

# 3. 综合清洗
npx ts-node scripts/comprehensive-data-cleaning.ts

# 4. 最终审计
npx ts-node scripts/data-quality-audit.ts
```

详细流程参见：`../../DATA_IMPORT_AND_CLEANING_GUIDE.md`

---

## 📊 脚本清单总览

| 类型 | 脚本数量 | 说明 |
|------|---------|------|
| 数据清洗 | 5个 | 核心工作流程 |
| 数据管理 | 3个 | 导入、重置、准备环境 |
| 数据库诊断 | 3个 | 快速检查数据库状态 ⭐ v3.2新增 |
| API文档 | 1个 | 自动生成文档 |
| 文档 | 1个 | 本README |
| 视频生成 | 1个 | 每日视频生成 (Python) |
| **总计** | **14个** | 精简高效 |

---

## 🎬 视频生成脚本

### `video_gen/generate_daily_video.py`
**每日单词视频生成**

该脚本负责生成包含单词讲解、例句朗读和配图的短视频。

**关键配置 (Tencent Cloud TTS)**:
- **TTS 引擎**: 腾讯云语音合成 (Tencent Cloud TTS)
- **音色 ID**: `501009` (WeWinny - 英文女声大模型音色)
- **配置位置**: `backend/scripts/video_gen/generate_daily_video.py`
- **环境变量**: 需要在 `.env` 中配置 `TTS_SECRET_ID` 和 `TTS_SECRET_KEY`。

**注意**:
- 该音色属于腾讯云"大模型语音合成"资源包，与标准 TTS 资源包不通用。
- 若遇到 `UnsupportedOperation.PkgExhausted` 错误，请检查是否购买了正确的资源包或音色 ID 是否正确。

---

## 🐛 Bug修复记录（v3.2）

### 修复1: 测试数据清理不彻底
**问题**：`reset-for-testing.ts` 只清理了 `UserLearningProgress`，遗漏了 `DailyCheckIn` 等表，导致统计数据显示异常。

**修复**：扩展清理范围至6个表，确保测试环境完全干净。

**影响文件**：
- `backend/scripts/reset-for-testing.ts`

### 修复2: 词书详情页统计数据错误
**问题**：`BookDetail.tsx` 页面加载100个单词，但"单词总数"显示整个词书的3677，导致数据不一致和误导。

**修复**：统计逻辑改为基于已加载的单词数量，并在UI中明确标注。

**影响文件**：
- `frontend_v3/src/pages/BookDetail.tsx`

---

**最后更新**: 2025-12-03
**维护者**: RG_project 团队
