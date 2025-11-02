# 词书数据格式规范

**版本**: 1.0  
**创建日期**: 2025年10月30日

---

## 📋 JSON 数据格式规范

### 文件结构

每个词书数据文件应为一个JSON数组，包含多个单词条目。

```json
[
  {
    "word": "abandon",
    "phonetic": {
      "uk": "/əˈbændən/",
      "us": "/əˈbændən/"
    },
    "partsOfSpeech": [
      {
        "pos": "verb",
        "meanings": [
          {
            "definition": "放弃；抛弃",
            "difficulty": 2,
            "examples": [
              "He abandoned his car in the snow.",
              "They had to abandon their home because of the flood."
            ]
          }
        ]
      }
    ]
  }
]
```

---

## 📖 字段说明

### 顶层字段

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `word` | string | ✅ | 单词原文，小写，不含空格 |
| `phonetic` | object | ⭕ | 音标对象，包含英式和美式发音 |
| `partsOfSpeech` | array | ✅ | 词性数组，至少一项 |

### phonetic 对象

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `uk` | string | ⭕ | 英式音标（国际音标格式） |
| `us` | string | ⭕ | 美式音标（国际音标格式） |

### partsOfSpeech 数组项

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `pos` | string | ✅ | 词性缩写（见下方词性列表） |
| `meanings` | array | ✅ | 该词性下的词义数组，至少一项 |

### meanings 数组项

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `definition` | string | ✅ | 中文释义 |
| `difficulty` | number | ⭕ | 难度等级（1-5），默认3 |
| `examples` | array | ⭕ | 例句数组（英文句子） |

---

## 🏷️ 词性列表（推荐使用）

| 词性 | 英文全称 | 缩写选项 |
|------|----------|----------|
| 名词 | noun | `n.`, `noun` |
| 动词 | verb | `v.`, `verb`, `vt.`, `vi.` |
| 形容词 | adjective | `adj.`, `adjective` |
| 副词 | adverb | `adv.`, `adverb` |
| 介词 | preposition | `prep.`, `preposition` |
| 连词 | conjunction | `conj.`, `conjunction` |
| 代词 | pronoun | `pron.`, `pronoun` |
| 冠词 | article | `art.`, `article` |
| 数词 | numeral | `num.`, `numeral` |
| 感叹词 | interjection | `int.`, `interj.` |

---

## 📊 难度等级映射

| 难度值 | 适用词书 | 说明 |
|--------|----------|------|
| 1 | 基础/高频 | 最基础、最常用的单词 |
| 2 | 四级 | 大学英语四级词汇 |
| 3 | 六级 | 大学英语六级词汇 |
| 4 | 考研/托福 | 考研、托福词汇 |
| 5 | 雅思/GRE | 雅思、GRE高级词汇 |

---

## ✅ 数据质量要求

### 必须遵守

1. ✅ **单词唯一性**: 同一文件中，每个单词只出现一次
2. ✅ **格式统一**: 单词使用小写字母
3. ✅ **JSON有效性**: 文件必须是有效的JSON格式
4. ✅ **编码格式**: 使用UTF-8编码

### 建议遵守

1. 💡 **音标完整性**: 尽量提供英式和美式音标
2. 💡 **例句质量**: 每个词义至少提供1-2个例句
3. 💡 **释义准确**: 释义应简洁明了，避免过长
4. 💡 **难度合理**: 根据实际词书难度设置difficulty值

---

## 🌰 完整示例

以下是包含3个单词的完整示例：

```json
[
  {
    "word": "abandon",
    "phonetic": {
      "uk": "/əˈbændən/",
      "us": "/əˈbændən/"
    },
    "partsOfSpeech": [
      {
        "pos": "verb",
        "meanings": [
          {
            "definition": "放弃；抛弃",
            "difficulty": 2,
            "examples": [
              "He abandoned his car in the snow.",
              "They had to abandon their home because of the flood."
            ]
          },
          {
            "definition": "放纵；沉溺",
            "difficulty": 3,
            "examples": [
              "He abandoned himself to despair after the failure."
            ]
          }
        ]
      },
      {
        "pos": "noun",
        "meanings": [
          {
            "definition": "放任；放纵",
            "difficulty": 4,
            "examples": [
              "He signed the treaty with reckless abandon."
            ]
          }
        ]
      }
    ]
  },
  {
    "word": "ability",
    "phonetic": {
      "uk": "/əˈbɪləti/",
      "us": "/əˈbɪləti/"
    },
    "partsOfSpeech": [
      {
        "pos": "noun",
        "meanings": [
          {
            "definition": "能力；才能",
            "difficulty": 1,
            "examples": [
              "She has the ability to solve complex problems.",
              "His ability in mathematics is outstanding."
            ]
          }
        ]
      }
    ]
  },
  {
    "word": "academic",
    "phonetic": {
      "uk": "/ˌækəˈdemɪk/",
      "us": "/ˌækəˈdemɪk/"
    },
    "partsOfSpeech": [
      {
        "pos": "adjective",
        "meanings": [
          {
            "definition": "学术的；学业的",
            "difficulty": 2,
            "examples": [
              "She has a strong academic background.",
              "This is purely an academic question."
            ]
          }
        ]
      },
      {
        "pos": "noun",
        "meanings": [
          {
            "definition": "学者；大学教师",
            "difficulty": 3,
            "examples": [
              "Many academics attended the conference."
            ]
          }
        ]
      }
    ]
  }
]
```

---

## 🛠️ 数据验证工具（待开发）

计划开发一个数据验证脚本 `validate-wordbook-data.ts`，用于检查：

- [ ] JSON格式有效性
- [ ] 必填字段完整性
- [ ] 数据类型正确性
- [ ] 单词重复检查
- [ ] 字段值合理性（如difficulty范围）

---

## 📝 文件命名规范

建议按以下格式命名词书数据文件：

- `cet4.json` - 大学英语四级核心词汇
- `cet6.json` - 大学英语六级核心词汇
- `kaoyan.json` - 考研英语词汇
- `toefl.json` - 托福词汇
- `ielts.json` - 雅思词汇
- `gre.json` - GRE词汇
- `high-frequency-1000.json` - 高频1000词

---

**最后更新**: 2025年10月30日
