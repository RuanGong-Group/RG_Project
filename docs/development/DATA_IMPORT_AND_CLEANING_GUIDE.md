# 数据导入、清洗与 AI 内容生成最佳实践指南

> **版本**: v2.0  
> **更新日期**: 2025年11月27日  
> **作者**: RG_project 团队  
> **适用范围**: CET-4/CET-6/高考/考研等词库导入

---

## 0. 前置条件

### 环境要求
- **Node.js**: v18.x 或更高
- **MySQL**: 8.0+
- **包管理**: npm 或 pnpm

### 必要配置 (`.env`)
```env
DATABASE_URL="mysql://user:password@localhost:3306/vocabulary_db"
AI_API_KEY=sk-your-siliconflow-api-key
```

### API 服务
- **提供商**: [SiliconFlow](https://siliconflow.cn)
- **模型**: `deepseek-ai/DeepSeek-V3`
- **费用**: 约 ¥0.001/条翻译

### 初始化
```bash
cd backend
npm install
npx prisma generate
```

---

## 1. 整体流程概览

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  数据导入   │ -> │  数据清洗   │ -> │  AI 增强    │ -> │  质量验证   │
│  Import     │    │  Cleaning   │    │  Enhancement│    │  Audit      │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

1. **数据导入**: 将原始 JSON/CSV 解析存入数据库
2. **数据清洗**: 修复脏字符、删除无效内容
3. **AI 增强**: 补全缺失例句和翻译
4. **质量验证**: 运行审计脚本确保数据完整

---

## 2. 数据导入阶段

### 2.1 源数据规范
确保源数据结构清晰，通常包含：
- `headWord`: 单词本身
- `content.word.content.trans[]`: 词义数组
- `content.sentence`: 真题例句

### 2.2 关键逻辑
- **义项分离**: 一个单词多个词性/含义，拆分为不同 `Meaning` 记录
- **例句关联**: 例句关联到具体 `Meaning` 而非 `Word`
- **来源标记**: `sourceType` 区分来源
  - `DICTIONARY`: 字典自带
  - `CET4_REAL_EXAM`: 真题例句
  - `AI_GENERATED`: AI 生成

---

## 3. 数据清洗阶段

### 3.1 脏数据类型清单

| 类型 | 描述 | 示例 | 严重程度 |
|------|------|------|----------|
| **英文中含中文** | 英文句子中混入中文 | `recipes (食谱)`, `padals（踏板）` | 🔴 **严重** |
| **填空题** | 包含填空符号 | `____33_____ This small...` | 🔴 **严重** |
| **多行内容** | 包含换行符的试卷格式 | 多行选择题、试卷格式 | 🔴 **严重** |
| **中文括号** | 包含中文括号注释 | `A）选项`, `B）选项` | 🔴 **严重** |
| **选项标记** | 包含试题选项标记 | `[A]`, `[B]`, `[C]` | 🔴 **严重** |
| 特殊符号 | `^` 等 OCR 残留 | `The cat^ sat...` | 🟡 中等 |
| 试卷格式 | 试题指导语 | `Directions:`, `Section A` | 🔴 严重 |
| 过短碎片 | <20字符无效内容 | `"abnormal C."` | 🔴 严重 |
| 问题翻译 | AI 添加多余解释 | `然而，为了更符合...` | 🟡 中等 |
| 过度复用 | 同一例句关联3+义项 | 一句话被多词共享 | 🟡 中等 |
| 无例句义项 | 义项没有配例句 | `AM [v.] 存在` 无例句 | 🟡 中等 |

> **⚠️ 重要教训 (2025-11-28)**:  
> **英文例句中绝对不能包含中文字符！** 我们是在用英文例句创造语境学英语，任何中文（包括括号注释、选项标记）都会破坏学习体验。这是数据质量的**红线**。

### 3.2 清洗脚本

**第一步：清理质量问题例句**（新增，必须先执行）:
```bash
npx ts-node scripts/clean-quality-issues.ts
```

处理内容：
- ✅ 删除英文中含中文的例句（如 `recipes (食谱)`）
- ✅ 删除填空题（包含 `___` 符号）
- ✅ 删除多行内容（包含 `\n` 换行符）
- ✅ 删除中文括号（`（`、`）`）
- ✅ 删除选项标记（`[A]`、`[B]` 等）

**第二步：综合清洗**:
```bash
npx ts-node scripts/comprehensive-data-cleaning.ts
```

处理内容：
1. 清理问题翻译（用 AI 重新翻译）
2. 删除试卷格式例句
3. 删除过短碎片例句
4. 为无例句义项补充例句
5. 清理过度复用的例句关联

> **⚠️ 执行顺序很重要**：必须先运行 `clean-quality-issues.ts` 删除严重脏数据，再运行 `comprehensive-data-cleaning.ts` 补充例句。

### 3.3 易遗漏检查点 ⚠️

> **重要**: 每次导入新数据后，必须运行数据质量审计！

```bash
npx ts-node scripts/data-quality-audit.ts
```

**审计项目（按优先级）**:
- [ ] **英文句子中是否包含中文字符**（红线问题）
- [ ] **是否有填空题**（包含 `___` 符号）
- [ ] **是否有多行内容**（包含换行符）
- [ ] **是否有中文括号或选项标记**（`（`、`[A]` 等）
- [ ] 翻译中是否包含多余解释性文字
- [ ] 例句是否包含试卷格式文本
- [ ] 是否存在过短例句（<20字符）
- [ ] 是否有义项没有例句
- [ ] 是否有例句被过度复用
- [ ] 是否有例句没有翻译

**质量验证脚本**:
```bash
# 全面检查例句质量问题
npx ts-node scripts/check-sentence-quality.ts
```

### 3.4 备份与回滚

**执行清洗前务必备份**:
```bash
mysqldump -u root -p vocabulary_db > backup.sql
```

---

## 4. AI 内容增强阶段

### 4.1 生成缺失例句

**Prompt 设计**:
```text
你是一个专业的英语词汇专家。请为单词 "${word}" 生成一个例句。

要求：
1. 必须使用单词 "${word}"
2. 必须体现其 "${partOfSpeech} ${definition}" 的含义
3. 难度适合大学英语四级水平
4. 返回 JSON：{"sentence": "英文句子", "translation": "中文翻译"}
```

### 4.2 翻译缺失例句

**Prompt 设计**:
```text
你是一位精通中英互译的资深英语教师。请将下面的英文例句翻译成中文。

【核心单词】${word} (${partOfSpeech} ${definition})
【待翻例句】${sentence}

【严格约束】
1. 语境优先：译文必须通顺、自然，符合中文表达习惯
2. 义项锁定：必须体现 "${definition}" 的意思
3. 格式纯净：只返回翻译后的中文句子，不要任何解释
```

### 4.3 最佳实践
- **批处理**: 使用 `take: 50` 分批处理
- **串行执行**: 避免并发过高触发限流
- **可重入设计**: 脚本中断后可继续

---

## 5. 前端展示注意事项

### 5.1 UI/UX 逻辑
- **Quiz 模式（做题时）**: **必须隐藏翻译**，防止泄露答案
- **Review 模式（答案页）**: **必须显示翻译**，帮助理解

### 5.2 数据库字段
- `sentence` 和 `translation` 设为 `TEXT`，防止长难句截断

---

## 6. 常用命令速查

```bash
# ============ 数据质量检查 ============
npx ts-node scripts/check-sentence-quality.ts  # 检查英文中的中文等质量问题（必做）
npx ts-node scripts/data-quality-audit.ts      # 综合质量审计（必做）
npx ts-node scripts/check-missing-translations.ts
npx ts-node scripts/sample-words-check.ts      # 随机抽样检查

# ============ 数据清洗 ============
npx ts-node scripts/clean-quality-issues.ts    # 清理严重质量问题（第一步）
npx ts-node scripts/comprehensive-data-cleaning.ts  # 综合清洗（第二步）
npx ts-node scripts/clean-caret-symbols.ts     # 清洗 ^ 符号

# ============ AI 增强 ============
npx ts-node scripts/translate-missing.ts       # 批量翻译

# ============ 数据库 ============
npx ts-node scripts/list-books.ts              # 查看词书
mysqldump -u root -p vocabulary_db > backup.sql
```

---

## 7. 数据质量标准

| 指标 | 目标值 | 检查方法 |
|------|--------|----------|
| **英文纯净度** | **100%** | **英文句子中绝对不能含中文** |
| **填空题** | **0** | **无 `___` 符号** |
| **多行内容** | **0** | **无换行符** |
| **中文括号** | **0** | **无 `（`、`）`** |
| **选项标记** | **0** | **无 `[A]`、`[B]` 等** |
| 例句覆盖率 | 100% | 每个义项至少1个例句 |
| 翻译覆盖率 | 100% | 每个例句都有中文翻译 |
| 试卷格式例句 | 0 | 无 Directions 等 |
| 过短例句 | 0 | 无 <20字符碎片 |
| 问题翻译 | 0 | 无多余解释性文字 |

> **红线标准**: 前5项为**零容忍**指标，任何违反都必须立即修复。

---

## 8. 故障排查

### Q: API 返回 401 错误
检查 `.env` 中的 `AI_API_KEY`

### Q: 翻译脚本中断了怎么办？
直接重新运行，脚本会自动跳过已处理的

### Q: 导入后发现数据有问题
1. 运行 `data-quality-audit.ts` 定位
2. 运行 `comprehensive-data-cleaning.ts` 修复
3. 再次审计确认

---

## 9. 总结

**核心检查点（每次导入必做）**:
1. ✅ 运行 `check-sentence-quality.ts` 检查英文纯净度
2. ✅ 运行 `clean-quality-issues.ts` 清理严重质量问题
3. ✅ 运行 `comprehensive-data-cleaning.ts` 综合清洗
4. ✅ 运行 `data-quality-audit.ts` 确认所有指标为 0
5. ✅ 运行 `sample-words-check.ts` 人工抽检

**⚠️ 血的教训 (2025-11-28)**:
- 数据清洗不是"一次性"工作，必须**反复审计**
- "看起来正常"≠ "真的正常"，必须**用脚本检测**
- 英文例句中**绝对不能有中文**，这是学习体验的红线
- 不要相信第一次审计结果，必须**多维度检查**

本文档作为后续引入 CET-6、考研等词库的标准操作流程 (SOP)。
