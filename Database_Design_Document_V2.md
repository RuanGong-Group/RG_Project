# 背单词软件数据库设计文档 - V2

**版本:** v2.0
**日期:** 2025年11月6日
**作者:** AI 助手 & 产品负责人
**修订记录:**
| 版本 | 日期 | 描述 |
| :-- | :-- | :-- |
| 1.0 | 2025-10-25 | 初始数据库设计方案 |
| 1.1 | 2025-10-25 | 细节优化 |
| 1.2 | 2025-10-26 | 迁移至MySQL，增加用户与学习上下文 |
| **2.0** | **2025-11-06** | **重大升级：增加 `lemma` 字段支持词形关联，明确 `extra` 字段用途，优化例句池设计** |

---

### 1. 引言

#### 1.1 目标

本文档旨在为背单词软件提供详细的数据库设计方案（V2版本），以支持 `PRD_V2.md` 中定义的“三路径引导式学习模型”和对 ECDICT 等复杂数据源的高效处理。

#### 1.2 范围

本设计基于 **MySQL** 服务端数据库，并与 **Prisma** ORM 兼容。所有设计变更都旨在增强系统的可扩展性、数据一致性和查询性能。

---

### 2. 数据库表结构设计 (V2)

#### 2.1 用户表 (users)
*... (与v1.2版本相同，无变更)...*

#### 2.2 单词基础表 (words) - **V2.0 变更**

存储单词的基本信息，增加 `lemma` 字段以建立词形关系网络。

| 字段名 | 数据类型 | 约束 | 说明 |
| :--- | :--- | :--- | :--- |
| `id` | `INT` | PRIMARY KEY, AUTO_INCREMENT | 单词ID |
| `word` | `VARCHAR(255)` | NOT NULL, UNIQUE | 单词原文 |
| `pronunciation`| `VARCHAR(255)` | NOT NULL | 音标 (JSON格式，如`{"uk": "/ˈwɜːrd/", "us": "/ˈwɝːd/"}`) |
| **`lemma`** | **`VARCHAR(255)`** | **NULL** | **【V2新增】单词原型。例如，`went` 的 `lemma` 是 `go`。非原型词此字段为 `NULL` 或等于 `word` 本身。** |

**索引变更**:
*   为 `lemma` 字段添加索引，以加速基于原型的反向查找（例如，查找 `go` 的所有变形）。

#### 2.3 词性表 (parts_of_speech)
*... (与v1.2版本相同，无变更)...*

#### 2.4 词义表 (meanings) - **V2.0 变更**

存储单词的详细词义，明确 `extra` 字段的用途。

| 字段名 | 数据类型 | 约束 | 说明 |
| :--- | :--- | :--- | :--- |
| `id` | `INT` | PRIMARY KEY, AUTO_INCREMENT | 词义ID |
| `part_of_speech_id`| `INT` | NOT NULL, FOREIGN KEY | 关联 `parts_of_speech.id` |
| `definition` | `TEXT` | NOT NULL | **中文释义** (来自 ECDICT 的 `translation`)，用于核心学习和测试。 |
| **`extra`** | **`JSON`** | **NULL** | **【V2更名并明确】** 补充信息 (原 `related_info`)。存储**英英释义**、柯林斯星级、牛津核心词标记等。**不包含词频和例句**。 |
| `created_at` | `TIMESTAMP` | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| `updated_at` | `TIMESTAMP` | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新时间 |

#### 2.5 例句中央池表 (example_pool) - **V2.0 变更**

存储所有例句，增加更丰富的元数据以支持智能匹配和筛选。

| 字段名 | 数据类型 | 约束 | 说明 |
| :--- | :--- | :--- | :--- |
| `id` | `INT` | PRIMARY KEY, AUTO_INCREMENT | 例句ID |
| `sentence` | `TEXT` | NOT NULL, UNIQUE | 例句原文 |
| **`source_type`** | `ENUM('EXAM', 'ECDICT', 'AI')` | NOT NULL | **【V2新增】** 例句来源类型（真题、ECDICT、AI生成）。 |
| **`source_detail`** | `VARCHAR(255)` | NULL | **【V2新增】** 详细来源（如 "2023年6月CET-4阅读"）。 |
| `difficulty` | `VARCHAR(50)` | NOT NULL | 例句难度（如小学、四级、考研等）。 |
| **`confidence_score`**| `FLOAT` | NULL | **【V2新增】** 词义与例句的匹配置信度（0-1），由匹配算法生成。 |
| `created_at` | `TIMESTAMP` | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| `updated_at` | `TIMESTAMP` | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新时间 |

#### 2.6 词义-例句关联表 (meaning_example_relation) - **V2.0 变更**

建立词义和例句之间的多对多关系，增加主次例句标识。

| 字段名 | 数据类型 | 约束 | 说明 |
| :--- | :--- | :--- | :--- |
| `meaning_id` | `INT` | NOT NULL, FOREIGN KEY | 关联 `meanings.id` |
| `example_id` | `INT` | NOT NULL, FOREIGN KEY | 关联 `example_pool.id` |
| `highlight_word`| `VARCHAR(255)` | NOT NULL | 在例句中需要高亮的单词 |
| **`is_primary`** | **`BOOLEAN`** | **NOT NULL DEFAULT FALSE** | **【V2新增】** 是否为该词义的首选例句。 |
| PRIMARY KEY | (`meaning_id`, `example_id`) | | 复合主键 |

#### 2.7 词书标签表 (book_tags)
*... (与v1.2版本相同，无变更)...*

#### 2.8 单词-标签关联表 (word_tag_relations)
*... (与v1.2版本相同，无变更)...*

#### 2.9 用户学习进度表 (user_learning_progress) - **V2.0 变更**

记录用户对每个词义的学习进度，增加字段以支持更精细的 SM-2 算法。

| 字段名 | 数据类型 | 约束 | 说明 |
| :--- | :--- | :--- | :--- |
| `id` | `INT` | PRIMARY KEY, AUTO_INCREMENT | 进度ID |
| `user_id` | `INT` | NOT NULL, FOREIGN KEY | 关联 `users.id` |
| `meaning_id` | `INT` | NOT NULL, FOREIGN KEY | 关联 `meanings.id` |
| `mastery_level`| `INT` | NOT NULL DEFAULT 0 | 掌握程度（0-5级）。 |
| **`ease_factor`** | **`FLOAT`** | **NOT NULL DEFAULT 2.5** | **【V2新增】** SM-2算法的轻松因子。 |
| **`interval_days`** | **`INT`** | **NOT NULL DEFAULT 0** | **【V2新增】** 当前复习间隔天数。 |
| `last_review_at`| `TIMESTAMP` | NULL | 上次复习时间 |
| `next_review_at`| `TIMESTAMP` | NOT NULL | 下次复习时间。 |
| `review_count` | `INT` | NOT NULL DEFAULT 0 | 总复习次数。 |
| `consecutive_correct`| `INT` | NOT NULL DEFAULT 0 | 连续答对次数 |
| `created_at` | `TIMESTAMP` | NOT NULL DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| `updated_at` | `TIMESTAMP` | NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新时间 |
| UNIQUE | (`user_id`, `meaning_id`) | | 用户对同一词义只有一条进度记录 |

#### 2.10 - 2.12 其他用户相关表
*   `user_word_notebook` (用户生词本)
*   `daily_check_ins` (每日打卡)
*   `user_achievements` (用户成就)
*... (以上各表与v1.2版本相同，无变更)...*

---

### 3. 实体关系图 (ERD) 描述 - V2

*   **新增关系**: `words` 表通过 `lemma` 字段与自身形成一种“自引用”的逻辑关系，用于关联原型词和变形词。
*   其他核心关系（如 `words` -> `parts_of_speech` -> `meanings`）保持不变。

---

### 4. 索引设计 - V2

*   **新增索引**:
    *   在 `words.lemma` 字段上创建索引，以加速查找一个单词的所有变形。
    *   在 `example_pool.source_type` 字段上创建索引，以快速筛选不同来源的例句。

---

### 5. 数据库初始化脚本示例 (SQL) - V2 摘要

```sql
-- words 表变更
ALTER TABLE words ADD COLUMN lemma VARCHAR(255) NULL;
CREATE INDEX idx_words_lemma ON words (lemma);

-- meanings 表变更
ALTER TABLE meanings RENAME COLUMN related_info TO extra;
-- 确保 extra 字段类型为 JSON

-- example_pool 表变更
ALTER TABLE example_pool ADD COLUMN source_type ENUM('EXAM', 'ECDICT', 'AI') NOT NULL;
ALTER TABLE example_pool ADD COLUMN source_detail VARCHAR(255) NULL;
ALTER TABLE example_pool ADD COLUMN confidence_score FLOAT NULL;

-- meaning_example_relation 表变更
ALTER TABLE meaning_example_relation ADD COLUMN is_primary BOOLEAN NOT NULL DEFAULT FALSE;

-- user_learning_progress 表变更
ALTER TABLE user_learning_progress ADD COLUMN ease_factor FLOAT NOT NULL DEFAULT 2.5;
ALTER TABLE user_learning_progress ADD COLUMN interval_days INT NOT NULL DEFAULT 0;
```
*(注：以上为变更摘要，完整的 `CREATE TABLE` 语句请参考 V2 表定义)*
