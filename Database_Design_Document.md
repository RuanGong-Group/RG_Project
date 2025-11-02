---

## 背单词软件数据库设计文档

**版本:** v1.2
**日期:** 2025年10月26日
**作者:** AI 助手
**修订记录:**
| 版本 | 日期 | 描述 |
| :-- | :-- | :-- |
| 1.0 | 2025-10-25 | 初始数据库设计方案 |
| 1.1 | 2025-10-25 | 更新音标存储格式，优化例句来源标识 |
| 1.2 | 2025-10-26 | **重大变更：数据库迁移至MySQL，增加用户认证与学习上下文，学习进度精确到词义** |

---

### 1. 引言

#### 1.1 目标

本文档旨在为背单词软件提供详细的数据库设计方案，包括表结构、字段定义、数据类型、主键、外键、索引以及表之间的关系。目标是构建一个高效、灵活、易于维护和扩展的 **服务端数据库**，以支持软件的核心功能。

#### 1.2 范围

本数据库设计针对MVP阶段的Web网站应用，采用 **MySQL** 作为服务端数据库。设计将严格遵循PRD中提出的分层存储、例句复用和词书动态扩展原则，并新增多用户数据隔离与学习上下文管理。

#### 1.3 背景

根据产品需求文档（PRD）和技术设计文档，本软件需要管理单词、词义、例句、词书、用户学习进度等数据。数据库设计是实现这些功能的基础。

### 2. 数据库表结构设计

#### 2.1 用户表 (users)

存储用户基本信息，用于用户认证和记录学习上下文。

| 字段名 | 数据类型 | 约束 | 说明 |
| :--- | :--- | :--- | :--- |
| `id` | `INT` | PRIMARY KEY, AUTO_INCREMENT | 用户ID（自增长） |
| `username` | `VARCHAR(255)` | NOT NULL, UNIQUE | 用户名，用于登录 |
| `password_hash` | `VARCHAR(255)` | NOT NULL | 加盐哈希后的密码 |
| `current_book_tag_id`| `INT` | NULL, FOREIGN KEY | 关联 `book_tags.id`，记录当前学习的词书 |
| `created_at` | `TIMESTAMP` | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 用户创建时间 |
| `last_login_at`| `TIMESTAMP` | NULL | 最后登录时间 |

#### 2.2 单词基础表 (words)

存储单词的基本信息。

| 字段名         | 数据类型       | 约束        | 说明         |
| :------------- | :------------- | :---------- | :----------- |
| `id`           | INTEGER        | PRIMARY KEY | 单词ID（自增长） |
| `word`         | TEXT           | NOT NULL, UNIQUE | 单词原文     |
| `pronunciation`| TEXT           | NOT NULL    | 音标 (JSON格式，如`{"uk": "/ˈwɜːrd/", "us": "/ˈwɝːd/"}`) |

#### 2.3 词性表 (parts_of_speech)

独立存储单词的词性信息，解决单词多词性问题。

| 字段名         | 数据类型       | 约束        | 说明             |
| :------------- | :------------- | :---------- | :--------------- |
| `id`           | INTEGER        | PRIMARY KEY | 词性ID（自增长） |
| `word_id`      | INTEGER        | NOT NULL, FOREIGN KEY | 关联 `words.id`  |
| `part_of_speech`| TEXT           | NOT NULL    | 词性（如n., v., adj.） |
| `created_at`   | DATETIME       | NOT NULL    | 创建时间         |
| `updated_at`   | DATETIME       | NOT NULL    | 更新时间         |

#### 2.4 词义表 (meanings)

存储单词的详细词义，关联 `parts_of_speech` 表。

| 字段名         | 数据类型       | 约束        | 说明             |
| :------------- | :------------- | :---------- | :--------------- |
| `id`           | INTEGER        | PRIMARY KEY | 词义ID（自增长） |
| `part_of_speech_id`| INTEGER        | NOT NULL, FOREIGN KEY | 关联 `parts_of_speech.id` |
| `definition`   | TEXT           | NOT NULL    | 详细释义         |
| `related_info` | TEXT           |             | 附加信息 (JSON格式，如词典例句、同反义词等，用户可主动触发查看) |
| `created_at`   | DATETIME       | NOT NULL    | 创建时间         |
| `updated_at`   | DATETIME       | NOT NULL    | 更新时间         |

#### 2.5 例句中央池表 (example_pool)

存储所有例句的原文，实现例句复用。重点存储真题例句，AI生成的例句作为补充。

| 字段名         | 数据类型       | 约束        | 说明             |
| :------------- | :------------- | :---------- | :--------------- |
| `id`           | INTEGER        | PRIMARY KEY | 例句ID（自增长） |
| `sentence`     | TEXT           | NOT NULL, UNIQUE | 例句原文         |
| `source`       | TEXT           | NOT NULL    | 例句来源（**仅限** '真题' 或 'AI生成'） |
| `difficulty`   | TEXT           | NOT NULL    | 例句难度（如小学、四级、考研等），用于个性化匹配和筛选 |
| `created_at`   | DATETIME       | NOT NULL    | 创建时间         |
| `updated_at`   | DATETIME       | NOT NULL    | 更新时间         |

#### 2.6 词义-例句关联表 (meaning_example_relation)

建立词义和例句之间的多对多关系，并记录高亮单词。

| 字段名         | 数据类型       | 约束        | 说明             |
| :------------- | :------------- | :---------- | :--------------- |
| `meaning_id`   | INTEGER        | NOT NULL, FOREIGN KEY | 关联 `meanings.id` |
| `example_id`   | INTEGER        | NOT NULL, FOREIGN KEY | 关联 `example_pool.id` |
| `highlight_word`| TEXT           | NOT NULL    | 在例句中需要高亮的单词 |
| `order_in_meaning`| INTEGER        |             | 在同一词义下的例句排序 |
| PRIMARY KEY    | (`meaning_id`, `example_id`) |             | 复合主键         |

#### 2.7 词书标签表 (book_tags)

存储词书名称作为标签。

| 字段名         | 数据类型       | 约束        | 说明             |
| :------------- | :------------- | :---------- | :--------------- |
| `id`           | INTEGER        | PRIMARY KEY | 词书标签ID（自增长） |
| `tag_name`     | TEXT           | NOT NULL, UNIQUE | 词书名称（如四级词汇） |
| `is_user_defined`| BOOLEAN        | NOT NULL    | 是否为用户自定义词书 |
| `created_at`   | DATETIME       | NOT NULL    | 创建时间         |

#### 2.8 单词-标签关联表 (word_tag_relations)

建立单词和词书标签之间的多对多关系，并标识该单词在该词书下的学习重点。

| 字段名         | 数据类型       | 约束        | 说明         |
| :------------- | :------------- | :---------- | :----------- |
| `word_id`      | INTEGER        | NOT NULL, FOREIGN KEY | 关联 `words.id` |
| `book_tag_id`  | INTEGER        | NOT NULL, FOREIGN KEY | 关联 `book_tags.id` |
| `mastery_focus`| TEXT           | NOT NULL    | 掌握重点（'recognition' 识别 或 'production' 输出） |
| PRIMARY KEY    | (`word_id`, `book_tag_id`) |             | 复合主键     |

#### 2.9 用户学习进度表 (user_learning_progress)

**核心表**：记录用户对每个 **词义** 的学习和掌握情况，用于艾宾浩斯记忆曲线算法。**这是实现精准复习的关键**。

| 字段名 | 数据类型 | 约束 | 说明 |
| :--- | :--- | :--- | :--- |
| `id` | `INT` | PRIMARY KEY, AUTO_INCREMENT | 进度ID（自增长） |
| `user_id` | `INT` | NOT NULL, FOREIGN KEY | 关联 `users.id` |
| `meaning_id` | `INT` | NOT NULL, FOREIGN KEY | **关联 `meanings.id`，学习进度精确到词义** |
| `mastery_level`| `INT` | NOT NULL DEFAULT 0 | 掌握程度（0-5，0表示未学，5表示熟练） |
| `last_review_at`| `TIMESTAMP` | NULL | 上次复习时间 |
| `next_review_at`| `TIMESTAMP` | NOT NULL | 下次复习时间（根据艾宾浩斯算法） |
| `review_count` | `INT` | NOT NULL DEFAULT 0 | 复习次数 |
| `consecutive_correct`| `INT` | NOT NULL DEFAULT 0 | 连续答对次数 |
| `created_at` | `TIMESTAMP` | NOT NULL DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| `updated_at` | `TIMESTAMP` | NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新时间 |
| UNIQUE | (`user_id`, `meaning_id`) | | 用户对同一词义只有一条进度记录 |

#### 2.10 用户生词本表 (user_word_notebook)

记录用户添加到生词本的单词。

| 字段名         | 数据类型       | 约束        | 说明             |
| :------------- | :------------- | :---------- | :--------------- |
| `id`           | INTEGER        | PRIMARY KEY | 生词本记录ID（自增长） |
| `user_id`      | INTEGER        | NOT NULL, FOREIGN KEY | 关联 `users.id` |
| `word_id`      | INTEGER        | NOT NULL, FOREIGN KEY | 关联 `words.id` |
| `added_at`     | DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL    | 添加时间         |
| UNIQUE         | (`user_id`, `word_id`) |             | 用户生词本中单词唯一 |

#### 2.11 每日打卡表 (daily_check_ins)

记录用户的每日打卡信息。

| 字段名         | 数据类型       | 约束        | 说明             |
| :------------- | :------------- | :---------- | :--------------- |
| `id`           | INTEGER        | PRIMARY KEY | 打卡记录ID（自增长） |
| `user_id`      | INTEGER        | NOT NULL, FOREIGN KEY | 关联 `users.id` |
| `check_in_date`| DATE           | NOT NULL    | 打卡日期         |
| `words_learned`| INTEGER        | NOT NULL DEFAULT 0 | 今日学习单词数   |
| `words_reviewed`| INTEGER        | NOT NULL DEFAULT 0 | 今日复习单词数   |
| `consecutive_days`| INTEGER        | NOT NULL DEFAULT 0 | 连续打卡天数     |
| UNIQUE         | (`user_id`, `check_in_date`) |             | 用户每天只能打卡一次 |

#### 2.12 用户成就表 (user_achievements)

记录用户获得的成就徽章。

| 字段名         | 数据类型       | 约束        | 说明                 |
| :------------- | :------------- | :---------- | :------------------- |
| `id`           | INTEGER        | PRIMARY KEY | 成就ID（自增长）     |
| `user_id`      | INTEGER        | NOT NULL, FOREIGN KEY | 关联 `users.id`  |
| `achievement_name`| TEXT           | NOT NULL    | 成就名称（如“坚持学习7天”） |
| `awarded_at`   | DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL    | 获得时间             |
| UNIQUE         | (`user_id`, `achievement_name`) |             | 用户成就唯一         |

### 3. 实体关系图 (ERD) 描述

由于无法直接绘制图形，我将通过文字描述实体关系图：

*   **USERS** `1 --- N` **USER_LEARNING_PROGRESS** (一个用户有多条学习进度)
*   **USERS** `1 --- N` **USER_WORD_NOTEBOOK** (一个用户有多个生词)
*   **USERS** `1 --- N` **DAILY_CHECK_INS** (一个用户有多条打卡记录)
*   **USERS** `1 --- N` **USER_ACHIEVEMENTS** (一个用户有多个成就)

*   **WORDS** `1 --- N` **PARTS_OF_SPEECH** (一个单词有多种词性)
*   **WORDS** `N --- M` **WORD_TAG_RELATIONS** `M --- N` **BOOK_TAGS** (单词与词书标签是多对多关系)
*   **WORDS** `1 --- N` **USER_LEARNING_PROGRESS** (一个单词被多个用户的学习进度关联)
*   **WORDS** `1 --- N` **USER_WORD_NOTEBOOK** (一个单词被多个用户的生词本关联)

*   **PARTS_OF_SPEECH** `1 --- N` **MEANINGS** (一个词性有多个词义)

*   **MEANINGS** `N --- M` **MEANING_EXAMPLE_RELATION** `M --- N` **EXAMPLE_POOL** (词义与例句是多对多关系)

### 4. 索引设计

为了优化常用查询的性能，我们将添加以下索引：

*   `words.word`：对单词原文进行唯一索引，加快单词查找和确保唯一性。
*   `parts_of_speech.word_id`：加快通过单词ID查找词性。
*   `parts_of_speech.part_of_speech`：加快通过词性查找。
*   `meanings.part_of_speech_id`：加快通过词性ID查找词义。
*   `example_pool.sentence`：对例句原文进行唯一索引，加快例句查找。
*   `example_pool.source`：加快根据例句来源筛选例句。
*   `example_pool.difficulty`：加快根据例句难度筛选例句。
*   `book_tags.tag_name`：对词书标签名称进行唯一索引，加快词书查找。
*   `word_tag_relations.word_id`, `word_tag_relations.book_tag_id`：复合索引，加快单词与词书标签的关联查找。
*   `user_learning_progress.user_id`, `user_learning_progress.word_id`：复合索引，加快用户学习进度的查找。
*   `user_learning_progress.next_review_at`：加快查找需要复习的单词。
*   `user_word_notebook.user_id`, `user_word_notebook.word_id`：复合索引，加快用户生词本的查找。
*   `daily_check_ins.user_id`, `daily_check_ins.check_in_date`：复合索引，加快用户打卡记录的查找。
*   `user_achievements.user_id`：加快查找用户成就。

### 5. 数据库初始化脚本示例 (SQL)

```sql
-- 创建用户表
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE, -- 昵称，非唯一身份标识
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_login_at DATETIME
);

-- 创建单词基础表
CREATE TABLE words (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    word TEXT NOT NULL UNIQUE,
    pronunciation TEXT NOT NULL -- JSON格式，如{"uk": "/ˈwɜːrd/", "us": "/ˈwɝːd/"}
);
CREATE INDEX idx_words_word ON words (word);

-- 创建词性表
CREATE TABLE parts_of_speech (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    word_id INTEGER NOT NULL,
    part_of_speech TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (word_id) REFERENCES words(id)
);
CREATE INDEX idx_parts_of_speech_word_id ON parts_of_speech (word_id);
CREATE INDEX idx_parts_of_speech_pos ON parts_of_speech (part_of_speech);

-- 创建词义表
CREATE TABLE meanings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    part_of_speech_id INTEGER NOT NULL,
    definition TEXT NOT NULL,
    related_info TEXT, -- 附加信息 (JSON格式，如词典例句、同反义词等，用户可主动触发查看)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (part_of_speech_id) REFERENCES parts_of_speech(id)
);
CREATE INDEX idx_meanings_pos_id ON meanings (part_of_speech_id);

-- 创建例句中央池表
CREATE TABLE example_pool (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sentence TEXT NOT NULL UNIQUE,
    source TEXT NOT NULL, -- 仅限 '真题' 或 'AI生成'
    difficulty TEXT NOT NULL, -- 例句难度（如小学、四级、考研等），用于个性化匹配和筛选
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX idx_example_pool_sentence ON example_pool (sentence);
CREATE INDEX idx_example_pool_source ON example_pool (source);
CREATE INDEX idx_example_pool_difficulty ON example_pool (difficulty);


-- 创建词义-例句关联表
CREATE TABLE meaning_example_relation (
    meaning_id INTEGER NOT NULL,
    example_id INTEGER NOT NULL,
    highlight_word TEXT NOT NULL,
    order_in_meaning INTEGER,
    PRIMARY KEY (meaning_id, example_id),
    FOREIGN KEY (meaning_id) REFERENCES meanings(id),
    FOREIGN KEY (example_id) REFERENCES example_pool(id)
);
CREATE INDEX idx_mer_meaning_id ON meaning_example_relation (meaning_id);
CREATE INDEX idx_mer_example_id ON meaning_example_relation (example_id);


-- 创建词书标签表
CREATE TABLE book_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tag_name TEXT NOT NULL UNIQUE,
    is_user_defined BOOLEAN NOT NULL DEFAULT 0, -- 0 for false, 1 for true
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX idx_book_tags_tag_name ON book_tags (tag_name);

-- 创建单词-标签关联表
CREATE TABLE word_tag_relations (
    word_id INTEGER NOT NULL,
    book_tag_id INTEGER NOT NULL,
    mastery_focus TEXT NOT NULL, -- 掌握重点（'recognition' 识别 或 'production' 输出）
    PRIMARY KEY (word_id, book_tag_id),
    FOREIGN KEY (word_id) REFERENCES words(id),
    FOREIGN KEY (book_tag_id) REFERENCES book_tags(id)
);
CREATE INDEX idx_wtr_word_id ON word_tag_relations (word_id);
CREATE INDEX idx_wtr_book_tag_id ON word_tag_relations (book_tag_id);
CREATE INDEX idx_wtr_mastery_focus ON word_tag_relations (mastery_focus);

-- 创建用户学习进度表（学习进度精确到词义，这是精准复习的核心）
CREATE TABLE user_learning_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    meaning_id INTEGER NOT NULL, -- 关键：跟踪词义而非单词，实现精准复习
    mastery_level INTEGER NOT NULL DEFAULT 0, -- 0:未学, 1:初识, 2:熟悉, 3:掌握, 4:熟练, 5:精通
    last_review_at DATETIME,
    next_review_at DATETIME NOT NULL, -- 非空以确保复习计划
    review_count INTEGER NOT NULL DEFAULT 0,
    consecutive_correct INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE (user_id, meaning_id), -- 用户对同一词义只有一条进度记录
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (meaning_id) REFERENCES meanings(id)
);
CREATE INDEX idx_ulp_user_meaning ON user_learning_progress (user_id, meaning_id);
CREATE INDEX idx_ulp_next_review ON user_learning_progress (next_review_at);

-- 创建用户生词本表
CREATE TABLE user_word_notebook (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    word_id INTEGER NOT NULL,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE (user_id, word_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (word_id) REFERENCES words(id)
);
CREATE INDEX idx_uwn_user_word ON user_word_notebook (user_id, word_id);

-- 创建每日打卡表
CREATE TABLE daily_check_ins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    check_in_date DATE NOT NULL,
    words_learned INTEGER NOT NULL DEFAULT 0,
    words_reviewed INTEGER NOT NULL DEFAULT 0,
    consecutive_days INTEGER NOT NULL DEFAULT 0,
    UNIQUE (user_id, check_in_date),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX idx_dci_user_date ON daily_check_ins (user_id, check_in_date);

-- 创建用户成就表
CREATE TABLE user_achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    achievement_name TEXT NOT NULL,
    awarded_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE (user_id, achievement_name),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX idx_ua_user_id ON user_achievements (user_id);
