# 后端脚本工具集

> **版本**: v3.0  
> **更新日期**: 2025-11-28  
> **维护者**: RG_project 团队

---

## 📖 概述

本目录包含数据清洗、测试管理和 API 文档生成的各类脚本工具。

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

### 2. `list-books.ts`
**列出所有词书**

```bash
npx ts-node scripts/list-books.ts
```

查看数据库中所有词书及其状态。

### 3. `reset-for-testing.ts`
**一键重置测试环境**

```bash
# 快速重置（仅清除学习进度）
npx ts-node scripts/reset-for-testing.ts

# 完全重置（清空+重新导入）
npx ts-node scripts/reset-for-testing.ts --full
```

团队开发中快速重置测试数据。

---

## 🔧 开发调试脚本

### 1. `check-database-status.ts`
**检查数据库状态**

```bash
npx ts-node scripts/check-database-status.ts
```

查看数据库连接、表结构等基本信息。

### 2. `check-users.ts`
**检查用户数据**

```bash
npx ts-node scripts/check-users.ts
```

查看用户账号、学习进度等信息。

---

## 📚 API 文档工具

### `extract-api-docs.js`
**自动提取 API 文档**

在后端目录运行：

```bash
npm run docs
```

生成的文档位于：`../../BACKEND_API_ACTUAL_RESPONSES.md`

**工作原理**：扫描 `src/routes` 和 `src/controllers`，提取 `res.json()` 响应结构生成 Markdown。

**最佳实践**：
1. 修改 API 后运行 `npm run docs`
2. 提交前检查文档变更
3. 保持控制器响应格式统一

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

# 5. 人工抽检
npx ts-node scripts/sample-words-check.ts
```

详细流程参见：`../../DATA_IMPORT_AND_CLEANING_GUIDE.md`

---

## 📊 脚本清单总览

| 类型 | 脚本数量 | 说明 |
|------|---------|------|
| 数据清洗 | 5个 | 核心工作流程 |
| 数据管理 | 3个 | 导入、查询、重置 |
| 开发调试 | 2个 | 状态检查 |
| API文档 | 1个 | 自动生成文档 |
| 文档 | 1个 | 本README |
| **总计** | **12个** | 精简高效 |

---

**最后更新**: 2025-11-30  
**维护者**: RG_project 团队
