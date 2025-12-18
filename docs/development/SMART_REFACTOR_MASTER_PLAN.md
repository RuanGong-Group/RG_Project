# RG_Project 智能重构与升级 - 最终执行方案 (Master Plan)

**版本**: Final v1.0
**日期**: 2025-12-15
**状态**: 准备执行

---

## 1. 项目背景与目标

RG_Project 目前已完成基础功能的开发与安全修复（数据隔离、单点登录）。
**当前核心痛点**：数据库中的单词数据质量较低，释义笼统（单一字符串），缺乏音标，例句与释义不对应。
**升级目标**：将数据质量提升至“专业词典”水准，同时保留用户历史积累的“真题例句”。

---

## 2. 核心重构策略 (Backend & Data)

### 2.1 数据清洗原则 (The "Authoritative" Standard)
为了避免 AI 幻觉，所有数据生成必须遵循以下原则：
1.  **权威源锚定**：Prompt 中明确要求 AI 扮演“严谨的词典编纂专家”，并基于 Oxford, Cambridge, Merriam-Webster 等权威词典数据进行生成。
2.  **结构化拆分**：
    *   **旧结构**: `Meaning: "run: 跑/管理"` (模糊)
    *   **新结构**: 
        *   Meaning 1: `v. To move fast on foot ; 跑`
        *   Meaning 2: `v. To manage or operate ; 管理`
3.  **真题保护 (Legacy Preservation)**：
    *   绝不直接删除旧例句。
    *   利用 AI 的语义理解能力，将旧例句挂载到最匹配的新释义下。
    *   无法匹配的旧例句，归类到“其他/通用”释义下，确保数据不丢失。

### 2.3 混淆选项生成 (Advanced Distractors)
为了支持高质量的多项选择题 (Quiz Mode)，AI 必须为每个释义生成“强干扰项”。
*   **存储位置**: `Meaning` 表的 `extra` JSON 字段。
*   **结构**:
    ```json
    {
      "distractors": {
        "cn": ["干扰项1", "干扰项2", "干扰项3"],
        "en": ["Distractor 1", "Distractor 2", "Distractor 3"]
      }
    }
    ```
*   **生成原则**:
    *   **词性一致**: 如果正确答案是动词，干扰项也必须是动词。
    *   **语义相关**: 干扰项应选择近义词、形近词或易混淆词，避免一眼假的选项（如“苹果”作为“跑”的干扰项）。

### 2.4 执行脚本 (`backend/scripts/smart-refactor.ts`)
该脚本是本次升级的核心引擎。
*   **输入**: 数据库中的 `Word` 及其关联的旧 `ExamplePool`。
*   **处理**: 
    *   调用 SiliconFlow API (DeepSeek-V3/Qwen-2.5)。
    *   Prompt 包含：单词本身 + 所有旧例句列表。
    *   要求返回：IPA 音标 + 拆分后的释义 + 新例句 + **旧例句的归类索引**。
*   **输出**: 
    *   更新 `Word` 表的 `pronunciation` 字段。
    *   重建 `Meaning` 表（删除旧的，插入新的）。
    *   重建 `MeaningExampleRelation`（关联新例句和旧例句）。

---

## 3. 前端升级方案 (Frontend UX)

### 3.1 单词详情页 (`WordDetail.vue`)
由于后端数据结构变为“一对多”（一个单词对应多个释义），前端必须重写。
*   **布局变更**:
    *   **顶部**: 单词大字 + 音标 + **发音按钮**。
    *   **中部 (释义列表)**: 
        *   遍历 `meanings` 数组。
        *   每个 Item 显示：词性 (v./n.) + 英文定义 + 中文定义。
        *   点击展开/折叠该释义下的例句。
    *   **底部 (例句区域)**:
        *   优先显示：**真题例句** (带有 `source: cet4/cet6` 标签)。
        *   其次显示：**AI 生成的高质量例句**。

### 3.2 发音功能 (Audio)
*   **策略**: 按需加载 (On-demand)，不占用服务器存储。
*   **实现**: 使用浏览器原生 `Audio` 对象调用第三方 TTS API。
*   **API 源**: `https://dict.youdao.com/dictvoice?audio={word}&type={1|2}` (1=英音, 2=美音)。

---

## 4. 数据库模型变更 (Schema Review)

目前的 `schema.prisma` 已经支持本次重构，无需大幅修改结构，只需清洗数据。
*   `Word`: 增加 `pronunciation` (Json) 存储 `{us: "", uk: ""}`。
*   `Meaning`: 这里的 `definition` 字段将存储清洗后的 "英文 ; 中文" 格式。
*   `MeaningExampleRelation`: 核心关联表，用于连接新释义和旧例句。

---

## 5. 实施步骤 (Step-by-Step Guide)

### 阶段一：后端数据重构 (当前重点)
1.  **环境检查**: 确认 `.env` 中 `SILICONFLOW_API_KEY` 有效。
2.  **小规模测试**: 运行 `npx ts-node backend/scripts/smart-refactor.ts` (默认处理 5 个单词)。
3.  **验证**: 检查数据库，确认：
    *   音标是否写入？
    *   释义是否拆分？
    *   旧例句是否还在？是否归类正确？
4.  **全量执行**: 修改脚本，移除 `take: 5` 限制，使用 `cursor` 或分页循环处理所有单词。

### 阶段二：前端适配
1.  修改 API 接口返回值类型定义 (TypeScript Interface)。
2.  重构 `WordDetail` 组件模板。
3.  添加发音按钮逻辑。

---

## 6. 风险控制

*   **API 成本/限流**: 脚本已内置 `BATCH_SIZE` 和错误重试机制。如果遇到 429 错误，脚本会报错但不会崩溃，建议分批运行。
*   **数据丢失**: 脚本采用事务 (`prisma.$transaction`)，要么全成功，要么全回滚，不会出现“删了旧释义但没写入新释义”的情况。

---

## 7. 给 AI 助手的交接指令 (Handover Prompt)

> **复制以下内容给新会话的 AI:**
> 
> 我们正在执行《RG_Project 智能重构与升级 - 最终执行方案》。
> 文档位置: `docs/development/SMART_REFACTOR_MASTER_PLAN.md`
> 核心脚本: `backend/scripts/smart-refactor.ts`
> 
> **当前任务**:
> 1. 请阅读上述文档，理解我们要进行的“权威词典级”数据清洗。
> 2. 运行 `smart-refactor.ts` 进行小规模测试。
> 3. 验证数据无误后，协助我进行全量数据清洗。
> 4. 随后指导我修改前端代码以适配新的数据结构。
