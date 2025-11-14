# BACKEND API — 实际成功响应格式（自动提取）

本文件基于仓库中 `backend/src/controllers` 下的控制器源码，逐个提取每个接口在成功情况（或常见成功分支）下的 JSON 返回结构。请在前端类型定义时严格参考此文件，不要凭想象。

注意事项：
- 我已读取并提取以下控制器：`auth.controller.ts`、`learning.controller.ts`、`book.controller.ts`、`stats.controller.ts`、`notebook.controller.ts`、`checkin.controller.ts`、`user.controller.ts`。
- 仓库中未找到 `review.controller.ts`（用户之前提出但不存在）；另外控制器名为 `book.controller.ts` 而非 `books.controller.ts`，我已按实际文件名处理。

---

## 通用响应说明

多数接口返回结构：

- 顶层字段：
  - `success`: boolean
  - `message`: string
  - `data`: object | array | null （具体接口详述）

示例顶层：

```json
{
  "success": true,
  "message": "描述",
  "data": { /* 接口特定结构 */ }
}
```

---

## `auth.controller.ts`

1) POST /api/auth/register

成功 (201):

```json
{
  "success": true,
  "message": "注册成功",
  "data": {
    "user": {
      "id": 123,
      "username": "alice",
      "createdAt": "2025-10-29T...Z"
    }
  }
}
```

2) POST /api/auth/login

成功 (200):

```json
{
  "success": true,
  "message": "登录成功",
  "data": {
    "token": "<jwt>",
    "user": {
      "id": 123,
      "username": "alice",
      "createdAt": "2025-10-29T...Z"
    }
  }
}
```

---

## `learning.controller.ts`

1) GET /api/learning/word/next

成功 (200): 返回下一个待学单词（含未学词义数组）；当无待学单词时 `data: null`

成功示例：

```json
{
  "success": true,
  "message": "获取待学单词成功",
  "data": {
    "wordId": 456,
    "word": "example",
    "pronunciation": { "uk": "ɪgˈzɑːmpəl", "us": "ɪgˈzæmpəl" },
    "meanings": [
      {
        "meaningId": 789,
        "partOfSpeech": "n.",
        "definition": "a thing characteristic of its kind",
        "relatedInfo": null,  // 可能是 null、string 或 object（如 {synonyms: [...], examples: [...]}）
        "examples": [
          {
            "id": 111,
            "sentence": "This is an example.",
            "highlightWord": "example",
            "source": "oxford",
            "difficulty": 1
          }
        ]
      }
    ],
    "lemma": "example",
    "masteryFocus": "recognition",
    "bookTag": "高中词汇"
  }
}
```

当学习完成：

```json
{
  "success": true,
  "message": "恭喜！您已经学习完该词书的所有单词",
  "data": null
}
```

2) GET /api/learning/next  （旧兼容接口）

成功示例：

```json
{
  "success": true,
  "message": "获取学习内容成功",
  "data": {
    "meaningId": 789,
    "word": "example",
    "pronunciation": { "uk": "", "us": "" },
    "partOfSpeech": "n.",
    "definition": "...",
    "extra": null,
    "examples": [ /* 同上示例数组 */ ],
    "masteryFocus": "recognition",
    "bookTag": "高中词汇"
  }
}
```

3) POST /api/learning/progress

请求体：{ "results": [{ "meaningId": number, "isCorrect": boolean }] }

成功示例：

```json
{
  "success": true,
  "message": "学习进度更新成功",
  "data": [
    {
      "meaningId": 501,
      "masteryLevel": 2,
      "nextReviewAt": "2025-10-29T...Z"
    }
  ]
}
```

4) GET /api/learning/review/today

成功示例（无待复习）：

```json
{
  "success": true,
  "message": "今日暂无需要复习的内容",
  "data": { "totalReviews": 0, "reviews": [] }
}
```

成功示例（有复习内容）：

```json
{
  "success": true,
  "message": "获取今日复习内容成功",
  "data": {
    "totalReviews": 2,
    "bookTag": "高中词汇",
    "reviews": [
      {
        "progressId": 1001,
        "meaningId": 789,
        "word": "example",
        "pronunciation": { "uk": "", "us": "" },
        "partOfSpeech": "n.",
        "definition": "...",
        "extra": null,
        "examples": [ /* 例句数组 */ ],
        "reviewMode": "recognition",
        "masteryLevel": 2,
        "reviewCount": 3
      }
    ]
  }
}
```

5) POST /api/learning/review/submit

请求体：{ "meaningId": number, "isCorrect": boolean }

成功示例：

```json
{
  "success": true,
  "message": "复习结果提交成功",
  "data": {
    "meaningId": 789,
    "isCorrect": true,
    "masteryLevel": 3,
    "nextReviewAt": "2025-10-30T...Z",
    "consecutiveCorrect": 2,
    "reviewCount": 4
  }
}
```

6) POST /api/learning/meaning/submit

**请求体**：`{ "meaningId": number, "isCorrect": boolean }`

**注意**：`isCorrect` 是布尔值（true = 认识，false = 不认识）

成功示例：

```json
{
  "success": true,
  "message": "词义学习结果提交成功",
  "data": {
    "meaningId": 789,
    "isCorrect": true,
    "masteryLevel": 1,
    "nextReviewAt": "2025-10-29T...Z",
    "consecutiveCorrect": 1,
    "reviewCount": 1
  }
}
```

7) POST /api/learning/word/complete

请求体：{ "wordId": number }

成功示例：

```json
{
  "success": true,
  "message": "单词学习完成",
  "data": {
    "wordId": 456,
    "word": "example",
    "totalMeanings": 3,
    "learnedMeanings": 3
  }
}
```

8) GET /api/learning/today-plan

成功示例：

```json
{
  "success": true,
  "message": "获取今日学习计划成功",
  "data": {
    "dailyGoal": 10,
    "progress": { "learned": 2, "reviewed": 0, "total": 2 },
    "review": { "dueCount": 3, "words": [ /* {wordId, word, dueMeanings, totalMeanings} */ ] },
    "newLearning": { "quota": 5, "available": 12, "words": [ /* 新单词列表 */ ] },
    "allocation": { "reviewPriority": 3, "newLearningSlots": 5, "totalPlanned": 8 }
  }
}
```

---

## `book.controller.ts`

1) GET /api/books

成功示例：

```json
{
  "success": true,
  "data": [
    { "id": 1, "tagName": "高中词汇", "isUserDefined": false, "wordCount": 500, "createdAt": "..." }
  ],
  "message": "成功获取词书列表"
}
```

2) GET /api/user/current-book

成功示例（未选择）：

```json
{
  "success": true,
  "data": null,
  "message": "用户尚未选择学习词书"
}
```

成功示例（有当前词书）：

```json
{
  "success": true,
  "data": {
    "id": 1,
    "tagName": "高中词汇",
    "isUserDefined": false,
    "wordCount": 500,
    "createdAt": "..."
  },
  "message": "成功获取当前学习词书"
}
```

3) PUT /api/user/current-book  （Body: { bookId })

成功示例：返回更新后的当前词书对象，与上面相同结构。

---

## `stats.controller.ts`

1) GET /api/stats/overview

成功示例：

```json
{
  "success": true,
  "message": "获取学习概览成功",
  "data": {
    "today": { "learned": 3, "reviewed": 2, "total": 5 },
    "overall": {
      "totalWordsInBook": 500,
      "learnedWords": 120,
      "masteredMeanings": 300,
      "progressPercentage": 24
    }
  }
}
```

2) GET /api/stats/progress

成功示例：返回最近30天的打卡曲线

```json
{
  "success": true,
  "message": "获取学习进度曲线成功",
  "data": {
    "period": { "startDate": "2025-10-01", "endDate": "2025-10-30", "days": 30 },
    "summary": { "totalLearned": 50, "totalReviewed": 70, "totalWords": 120, "activeDays": 10 },
    "curve": [ { "date": "2025-10-01", "learned": 1, "reviewed": 0, "total": 1 }, /* ... */ ]
  }
}
```

---

## `notebook.controller.ts`

1) POST /api/notebook/words  (Body: { wordId })

成功示例：

```json
{
  "success": true,
  "message": "成功添加到生词本",
  "data": {
    "id": 1001,
    "userId": 123,
    "wordId": 456,
    "addedAt": "2025-10-29T...Z"
  }
}
```

2) DELETE /api/notebook/words/:wordId

成功示例：

```json
{
  "success": true,
  "message": "成功从生词本删除"
}
```

3) GET /api/notebook/words

成功示例：

```json
{
  "success": true,
  "data": {
    "total": 2,
    "words": [
      {
        "notebookId": 1001,
        "wordId": 456,
        "word": "example",
        "pronunciation": { "uk": "", "us": "" },
        "addedAt": "2025-10-29T...Z",
        "meanings": [
          { "meaningId": 789, "partOfSpeech": "n.", "definition": "...", "examples": [ { "sentence": "...", "highlightWord": "..." } ] }
        ]
      }
    ]
  }
}
```

---

## `checkin.controller.ts`

1) GET /api/checkin/today

成功示例（已打卡）：

```json
{
  "success": true,
  "message": "今日已打卡",
  "data": {
    "checkedIn": true,
    "checkInDate": "2025-10-29",
    "wordsLearned": 3,
    "wordsReviewed": 2,
    "meaningsLearned": 5,
    "meaningsReviewed": 4,
    "dailyGoal": 10,
    "goalCompleted": false,
    "consecutiveDays": 4
  }
}
```

成功示例（未打卡）：

```json
{
  "success": true,
  "message": "今日未打卡",
  "data": {
    "checkedIn": false,
    "checkInDate": "2025-10-29",
    "wordsLearned": 0,
    "wordsReviewed": 0,
    "meaningsLearned": 0,
    "meaningsReviewed": 0,
    "dailyGoal": 10,
    "goalCompleted": false,
    "consecutiveDays": 0
  }
}
```

2) GET /api/checkin/history?days=N

成功示例：

```json
{
  "success": true,
  "message": "获取打卡历史成功",
  "data": {
    "checkIns": [ /* dailyCheckIn 对象数组（含日期与计数） */ ],
    "statistics": { "totalCheckInDays": 20, "maxConsecutiveDays": 10, "queryDays": 30 }
  }
}
```

---

## `user.controller.ts`（用户设置）

1) GET /api/user/settings/daily-goal

成功示例：

```json
{
  "success": true,
  "message": "获取每日目标成功",
  "data": {
    "userId": 123,
    "username": "alice",
    "dailyGoal": 10
  }
}
```

2) PUT /api/user/settings/daily-goal  (Body: { dailyGoal: number })

成功示例：返回更新后的 `dailyGoal`，结构同上。

---

---

## 与 `frontend_api_spec.md` 的差异对比

### ✅ 一致的接口

- POST /api/auth/register
- POST /api/auth/login
- GET /api/books
- GET /api/user/current-book
- PUT /api/user/current-book
- GET /api/user/settings/daily-goal
- PUT /api/user/settings/daily-goal
- GET /api/learning/next
- POST /api/learning/progress
- GET /api/learning/review/today
- POST /api/learning/review/submit
- GET /api/learning/word/next
- POST /api/learning/meaning/submit
- POST /api/learning/word/complete
- GET /api/learning/today-plan
- GET /api/notebook/words
- POST /api/notebook/words
- DELETE /api/notebook/words/:wordId
- GET /api/checkin/today
- GET /api/checkin/history
- GET /api/stats/overview
- GET /api/stats/progress

### ⚠️ 字段差异（需前端修正）

1. **GET /api/learning/word/next**
   - `frontend_api_spec.md` 描述：返回 `word: { id, word, pronunciation }` + `partsOfSpeech` 数组
   - **实际返回**：扁平化结构，直接返回 `wordId`、`word`、`pronunciation`、`meanings` 数组（meanings 内含 `partOfSpeech`）
   - **影响**：前端类型需修改为扁平结构

2. **POST /api/learning/meaning/submit**
   - `frontend_api_spec.md` 描述：返回 `{ nextMeaningId?, wordComplete? }`
   - **实际返回**：返回 `{ meaningId, isCorrect, masteryLevel, nextReviewAt, consecutiveCorrect, reviewCount }`
   - **影响**：前端不应期待 `nextMeaningId` 字段

3. **GET /api/user/current-book**
   - `frontend_api_spec.md` 描述：返回 `{ id, tagName }`
   - **实际返回**：返回 `{ id, tagName, isUserDefined, wordCount, createdAt }`
   - **影响**：前端可以使用额外字段展示词书详情

4. **PUT /api/user/current-book**
   - `frontend_api_spec.md` 请求体：`{ bookTagId: number }`
   - **实际请求体**：`{ bookId: number }`
   - **⚠️ 严重不匹配**：字段名不一致，前端必须使用 `bookId`

5. **GET /api/checkin/today**
   - `frontend_api_spec.md` 描述：返回 `{ goalCompleted, consecutiveDays, todayCount }`
   - **实际返回**：返回完整结构 `{ checkedIn, checkInDate, wordsLearned, wordsReviewed, meaningsLearned, meaningsReviewed, dailyGoal, goalCompleted, consecutiveDays }`
   - **影响**：前端可以利用更多字段展示详细进度

6. **GET /api/stats/progress**
   - `frontend_api_spec.md` 描述：返回 `{ dates: [...], values: [...] }`
   - **实际返回**：返回 `{ period: {...}, summary: {...}, curve: [{ date, learned, reviewed, total }] }`
   - **影响**：前端需调整图表数据映射

### ❌ `frontend_api_spec.md` 中描述但未在实际代码找到的接口

- **GET /api/user/profile**：控制器中未找到该接口实现
  - 建议：前端可用 GET /api/user/settings/daily-goal 替代（返回包含 userId 和 username）

### 📝 其他发现

- **review.controller.ts 不存在**：所有复习相关接口已在 `learning.controller.ts` 中实现
- **词书导入接口**：`frontend_api_spec.md` 提到但未详述，当前控制器中也未找到相关实现（可能需要新增）

---

## 结论与行动计划

所有核心 API 已提取完毕。接下来严格按照本文档（而非 `frontend_api_spec.md`）生成前端类型定义与代码。

---

生成时间：2025-10-29
最后更新：对比完成
