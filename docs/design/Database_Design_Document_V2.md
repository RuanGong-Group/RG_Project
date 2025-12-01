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

#### 2.3 词义表 (meanings) - **V2.0 重大变更**

**【架构简化】** 为提升查询性能并简化数据结构，V2.0 版本将原 `parts_of_speech` 表合并到 `meanings` 表中，从三层结构（Word → PartOfSpeech → Meaning）简化为二层结构（Word → Meaning）。

存储单词的详细词义，明确 `extra` 字段的用途。

| 字段名 | 数据类型 | 约束 | 说明 |
| :--- | :--- | :--- | :--- |
| `id` | `INT` | PRIMARY KEY, AUTO_INCREMENT | 词义ID |
| **`word_id`** | **`INT`** | **NOT NULL, FOREIGN KEY** | **【V2变更】直接关联 `words.id`**，简化了原来的三层关系。 |
| **`part_of_speech`** | **`VARCHAR(50)`** | **NOT NULL** | **【V2变更】词性字符串**（如 'n.', 'v.', 'adj.' 等），不再通过外键关联独立的词性表。 |
| `definition` | `TEXT` | NOT NULL | **中文释义** (来自 ECDICT 的 `translation`)，用于核心学习和测试。 |
| **`extra`** | **`JSON`** | **NULL** | **【V2更名并明确】** 补充信息 (原 `related_info`)。存储**英英释义**、柯林斯星级、牛津核心词标记等。**不包含词频和例句**。 |
| `created_at` | `TIMESTAMP` | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| `updated_at` | `TIMESTAMP` | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新时间 |

**索引变更**:
*   为 `word_id` 字段添加索引，加速基于单词的词义查询。
*   为 `part_of_speech` 字段添加索引，支持按词性筛选。

#### 2.4 例句中央池表 (example_pool) - **V2.0 变更**

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

**索引变更**:
*   为 `source_type` 字段添加索引，以快速筛选不同来源的例句。

#### 2.5 词义-例句关联表 (meaning_example_relation) - **V2.0 变更**

建立词义和例句之间的多对多关系，增加主次例句标识。

| 字段名 | 数据类型 | 约束 | 说明 |
| :--- | :--- | :--- | :--- |
| `meaning_id` | `INT` | NOT NULL, FOREIGN KEY | 关联 `meanings.id` |
| `example_id` | `INT` | NOT NULL, FOREIGN KEY | 关联 `example_pool.id` |
| `highlight_word`| `VARCHAR(255)` | NOT NULL | 在例句中需要高亮的单词 |
| **`is_primary`** | **`BOOLEAN`** | **NOT NULL DEFAULT FALSE** | **【V2新增】** 是否为该词义的首选例句。 |
| PRIMARY KEY | (`meaning_id`, `example_id`) | | 复合主键 |

#### 2.6 词书标签表 (book_tags)
*... (与v1.2版本相同，无变更)...*

#### 2.7 单词-标签关联表 (word_tag_relations)
*... (与v1.2版本相同，无变更)...*

#### 2.8 用户学习进度表 (user_learning_progress) - **V2.0 变更**

记录用户对每个词义的学习进度，增加字段以支持更精细的 SM-2 算法。

| 字段名 | 数据类型 | 约束 | 说明 |
| :--- | :--- | :--- | :--- |
| `id` | `INT` | PRIMARY KEY, AUTO_INCREMENT | 进度ID |
| `user_id` | `INT` | NOT NULL, FOREIGN KEY | 关联 `users.id` |
| `meaning_id` | `INT` | NOT NULL, FOREIGN KEY | 关联 `meanings.id` |
| `mastery_level`| `INT` | NOT NULL DEFAULT 0 | 掌握程度（0-5级）。 |
| **`easiness_factor`** | **`FLOAT`** | **NOT NULL DEFAULT 2.5** | **【V2新增】** SM-2算法的轻松因子（E-Factor）。 |
| **`interval`** | **`INT`** | **NOT NULL DEFAULT 0** | **【V2新增】** 当前复习间隔天数。 |
| **`repetitions`** | **`INT`** | **NOT NULL DEFAULT 0** | **【V2新增】** 连续正确复习次数（用于 SM-2 算法）。 |
| `last_review_at`| `TIMESTAMP` | NULL | 上次复习时间 |
| `next_review_at`| `TIMESTAMP` | NOT NULL | 下次复习时间。 |
| `review_count` | `INT` | NOT NULL DEFAULT 0 | 总复习次数。 |
| `consecutive_correct`| `INT` | NOT NULL DEFAULT 0 | 连续答对次数 |
| `created_at` | `TIMESTAMP` | NOT NULL DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| `updated_at` | `TIMESTAMP` | NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新时间 |
| UNIQUE | (`user_id`, `meaning_id`) | | 用户对同一词义只有一条进度记录 |

**索引变更**:
*   为 `next_review_at` 字段添加索引，加速复习任务查询。

#### 2.9 - 2.11 其他用户相关表
*   `user_word_notebook` (用户生词本)
*   `daily_check_ins` (每日打卡)
*   `user_achievements` (用户成就)
*... (以上各表与v1.2版本相同，无变更)...*

---

### 3. 实体关系图 (ERD) 描述 - V2

**【重大架构变更】**
*   **简化的二层结构**: V2.0 移除了独立的 `parts_of_speech` 表，将词性信息直接存储在 `meanings` 表中。核心关系从 `words` → `parts_of_speech` → `meanings` 简化为 `words` → `meanings`。
*   **新增关系**: `words` 表通过 `lemma` 和 `lemmaId` 字段与自身形成"自引用"关系，用于关联原型词和派生词（如 went → go）。
*   **其他关系**: 用户学习进度 (`user_learning_progress`) 直接跟踪到词义级别 (`meaning_id`)，例句通过 `meaning_example_relation` 关联表实现多对多关系。

---

### 4. 索引设计 - V2

*   **新增索引**:
    *   在 `words.lemma` 字段上创建索引，以加速查找一个单词的所有变形。
    *   在 `words.lemmaId` 字段上创建索引，支持原型词查找派生词。
    *   在 `meanings.word_id` 字段上创建索引，加速基于单词的词义查询。
    *   在 `meanings.part_of_speech` 字段上创建索引，支持按词性筛选。
    *   在 `example_pool.source_type` 字段上创建索引，以快速筛选不同来源的例句。
    *   在 `user_learning_progress.next_review_at` 字段上创建索引，加速复习任务查询。

---

### 5. 数据库迁移脚本 (V1.x → V2.0)

**【重大变更警告】** V2.0 涉及架构重构，需要数据迁移。以下为关键步骤：

```sql
-- ============================================
-- 步骤 1: 添加新字段到现有表
-- ============================================

-- words 表：添加 lemma 支持
ALTER TABLE words ADD COLUMN lemma VARCHAR(255) NULL;
ALTER TABLE words ADD COLUMN lemma_id INT NULL;
CREATE INDEX idx_words_lemma ON words (lemma);
CREATE INDEX idx_words_lemma_id ON words (lemma_id);

-- example_pool 表：重构来源字段
ALTER TABLE example_pool ADD COLUMN source_type VARCHAR(50) NOT NULL DEFAULT 'ecdict';
ALTER TABLE example_pool ADD COLUMN source_detail VARCHAR(255) NULL;
ALTER TABLE example_pool DROP COLUMN source;
ALTER TABLE example_pool DROP COLUMN difficulty;
CREATE INDEX idx_example_pool_source_type ON example_pool (source_type);

-- meaning_example_relation 表：添加主次标记
ALTER TABLE meaning_example_relation ADD COLUMN is_primary BOOLEAN NOT NULL DEFAULT FALSE;

-- user_learning_progress 表：添加 SM-2 算法字段
ALTER TABLE user_learning_progress ADD COLUMN easiness_factor FLOAT NOT NULL DEFAULT 2.5;
ALTER TABLE user_learning_progress ADD COLUMN interval INT NOT NULL DEFAULT 0;
ALTER TABLE user_learning_progress ADD COLUMN repetitions INT NOT NULL DEFAULT 0;
CREATE INDEX idx_user_learning_progress_next_review ON user_learning_progress (next_review_at);

-- ============================================
-- 步骤 2: 重构 meanings 表（移除 PartOfSpeech）
-- ============================================

-- 2.1 创建新的 meanings 表结构
CREATE TABLE meanings_v2 (
  id INT PRIMARY KEY AUTO_INCREMENT,
  word_id INT NOT NULL,
  part_of_speech VARCHAR(50) NOT NULL,
  definition TEXT NOT NULL,
  extra JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_meanings_word_id (word_id),
  INDEX idx_meanings_part_of_speech (part_of_speech),
  FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE
);

-- 2.2 数据迁移：从三层结构迁移到二层结构
INSERT INTO meanings_v2 (id, word_id, part_of_speech, definition, extra, created_at, updated_at)
SELECT 
  m.id,
  pos.word_id,
  pos.part_of_speech,
  m.definition,
  m.related_info AS extra,
  m.created_at,
  m.updated_at
FROM meanings m
JOIN parts_of_speech pos ON m.part_of_speech_id = pos.id;

-- 2.3 替换旧表
DROP TABLE meanings;
RENAME TABLE meanings_v2 TO meanings;

-- 2.4 删除不再需要的 parts_of_speech 表
DROP TABLE parts_of_speech;

-- ============================================
-- 步骤 3: 验证数据完整性
-- ============================================

-- 检查词义数量是否一致
SELECT COUNT(*) FROM meanings;

-- 检查是否有孤立的词义（word_id 不存在）
SELECT COUNT(*) FROM meanings m 
LEFT JOIN words w ON m.word_id = w.id 
WHERE w.id IS NULL;
```

**⚠️ 迁移注意事项:**
1. 在执行迁移前，务必**完整备份数据库**
2. 建议在测试环境先执行迁移脚本
3. 迁移过程中会有短暂的服务中断
4. 确保所有应用代码已更新以适配新结构
