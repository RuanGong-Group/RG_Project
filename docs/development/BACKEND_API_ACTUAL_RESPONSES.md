# 后端 API 响应格式参考文档

**最后更新**: 2025/12/02
**数据来源**: 后端控制器代码 + 人工整理

---

## ⚠️ 重要说明

- 本文档基于脚本辅助提取 + 人工校对完成
- 前端类型定义应严格遵循本文档中的响应格式
- 修改 API 后，运行 `npm run docs` 获取响应示例草稿，然后手动补充完整信息
- 脚本仅提取 `res.json()` 内容，路径、方法等需手动维护

---

## 通用响应格式

```typescript
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}
```

---

## video

### 1. generateVideo

**路径**: `POST /api/video/generate`

**成功响应示例**:

```json
{
  "success": true,
  "message": "视频生成任务已创建",
  "data": {
    "jobId": "uuid-string",
    "status": "pending",
    "message": "Video generation started"
  }
}
```

**已存在视频响应示例**:

```json
{
  "success": true,
  "message": "今日视频已生成",
  "data": {
    "jobId": "uuid-string",
    "status": "completed",
    "message": "今日视频已生成",
    "videoPath": "videos/daily/daily_video_xxx.mp4"
  }
}
```

---

### 2. getTodayVideo

**路径**: `GET /api/video/today`

**成功响应示例 (存在视频)**:

```json
{
  "success": true,
  "data": {
    "hasVideo": true,
    "job": {
      "id": 1,
      "jobId": "uuid-string",
      "status": "completed",
      "videoPath": "videos/daily/daily_video_xxx.mp4",
      "wordIds": [1, 2, 3],
      "createdAt": "2025-11-29T..."
    }
  }
}
```

**成功响应示例 (不存在视频)**:

```json
{
  "success": true,
  "data": {
    "hasVideo": false
  }
}
```

---

### 3. getJobStatus

**路径**: `GET /api/video/status/:jobId`

**成功响应示例**:

```json
{
  "success": true,
  "data": {
    "job": {
      "status": "processing",
      "progress": 45,
      "videoPath": null,
      "errorMessage": null
    }
  }
}
```

---

## learning

### 1. getTodayNewWords

**路径**: `GET /api/learning/today-new-words`

**成功响应示例**:

```json
{
  "success": true,
  "data": {
    "words": [
      { "word": "abandon", "meaning": "放弃" },
      { "word": "absolute", "meaning": "绝对的" }
    ],
    "count": 2
  }
}
```

---

## book

### 1. getAllBooks

**路径**: `GET/POST/PUT/DELETE /api/...`

**成功响应示例**:

```json
{
      success: true,
      data: formattedBooks,
      message: '成功获取词书列表'
    }
```

---

### 2. getCurrentBook

**路径**: `GET/POST/PUT/DELETE /api/...`

**成功响应示例**:

```json
{
        success: true,
        data: null,
        message: '用户尚未选择学习词书'
      }
```

---

### 3. updateCurrentBook

**路径**: `GET/POST/PUT/DELETE /api/...`

**成功响应示例**:

```json
{
      success: true,
      data: currentBook,
      message: `成功切换到词书：${currentBook.tagName}`
    }
```

---

### 4. getBookWords

**路径**: `GET/POST/PUT/DELETE /api/...`

**成功响应示例**:

```json
{
      success: true,
      data: result,
      message: '成功获取词书单词列表'
    }
```

---

### 5. reshuffleBook

**路径**: `GET/POST/PUT/DELETE /api/...`

**成功响应示例**:

```json
{
      success: true,
      data: {
        bookId: result.bookId,
        salt: result.salt.substring(0, 8) + '...' // 只返回部分salt用于确认
      },
      message: `成功重新乱序词书：${result.bookName}`
    }
```

---

## checkin

### 1. getTodayCheckIn

**路径**: `GET/POST/PUT/DELETE /api/...`

**成功响应示例**:

```json
{
        success: true,
        message: '今日已打卡',
        data: {
          checkedIn: true,
          checkInDate: todayCheckIn.checkInDate,
          wordsLearned: todayCheckIn.wordsLearned,
          wordsReviewed: todayCheckIn.wordsReviewed,
          meaningsLearned: todayCheckIn.meaningsLearned,
          meaningsReviewed: todayCheckIn.meaningsReviewed,
          dailyGoal: todayCheckIn.dailyGoal,
          goalCompleted: todayCheckIn.goalCompleted,
          consecutiveDays: todayCheckIn.consecutiveDays
        }
      }
```

---

### 2. getCheckInHistory

**路径**: `GET/POST/PUT/DELETE /api/...`

**成功响应示例**:

```json
{
      success: true,
      message: '获取打卡历史成功',
      data: {
        checkIns: checkIns,
        statistics: {
          totalCheckInDays: totalCheckInDays,
          maxConsecutiveDays: maxConsecutiveDays,
          queryDays: days
        }
      }
    }
```

---

## common

### 1. getTodayPlan

**路径**: `GET/POST/PUT/DELETE /api/...`

**成功响应示例**:

```json
{
      success: true,
      message: '获取今日计划成功',
      data: {
        dailyGoal,
        progress: {
          learned: learnedWordsToday.size,
          reviewed: reviewedWordsToday.size,
          total: learnedWordsToday.size + reviewedWordsToday.size
        },
        review: {
          dueCount: dueReviews.length,
          words: reviewWords
        },
        newLearning: {
          quota: newLearningQuota,
          available: newWordsAvailable.length,
          words: newWordsToShow.map(w => ({
            wordId: w.id,
            word: w.word,
            totalMeanings: w._count.meanings
          }))
        }
      }
    }
```

---

## session

### 1. startSession

**路径**: `GET/POST/PUT/DELETE /api/...`

**成功响应示例**:

```json
{ success: true, message: '无可学习项目', data: { sessionId: session.id, type: 'session-complete', data: null, step: session.step } }
```

---

### 2. actionSession

**路径**: `GET/POST/PUT/DELETE /api/...`

**成功响应示例**:

```json
{ 
          success: true, 
          data: { 
            sessionId: session.id, 
            type: 'show-card', 
            data: { 
              meaningId: m.id, 
              showResult: false, // 路径C不显示对错
              word: {
                id: session.currentWord.wordId,
                word: session.currentWord.word,
                lemma: session.currentWord.lemma,
                pronunciations: session.currentWord.pronunciations
              },
              sentence: exampleSentences[0]?.sentence || '', // 添加例句用于固定上下文
              highlightWord: session.currentWord.word,
              card: { 
                definition: m.definition, 
                partOfSpeech: m.partOfSpeech, 
                pronunciations: parsePronunciations(m.word.pronunciation), 
                examples: exampleSentences 
              },
              wordProgress: {
                currentMeaning: currentMeaningIndex + 1,
                totalMeanings: session.currentWord.meanings.length
              }
            }, 
            createdBooster, 
            step: session.step 
          } 
        }
```

---

### 3. getSessionState

**路径**: `GET/POST/PUT/DELETE /api/...`

**成功响应示例**:

```json
{ success: true, data: { sessionId: session.id, state: session.state, currentStep: session.step, queueSummary: { boosterPending: session.boosters.length, reviewsPending: 0, newPending: 0 } } }
```

---

### 4. getNextQuestions

**路径**: `GET/POST/PUT/DELETE /api/...`

**成功响应示例**:

```json
{ 
          success: true, 
          data: { 
            sessionId: session.id, 
            steps: [{ 
              type: 'show-booster-question', 
              data: { 
                questionId: q.questionId, 
                meaningId: chosen.meaningId, 
                prompt: q.prompt, 
                options: q.options, 
                timeLimitSec: q.timeLimitSec, 
                isBooster: true,
                sentence,
                word: wordInfo
              } 
            }] 
          } 
        }
```

---

## stats

### 1. getOverview

**路径**: `GET/POST/PUT/DELETE /api/...`

**成功响应示例**:

```json
{
      success: true,
      message: '获取学习概览成功',
      data: {
        totalWords: totalWordsInBook,
        learnedWords: totalLearnedWords,
        masteryDistribution: masteryDistribution,
        progressPercentage: progressPercentage,
        masteredMeanings: masteredMeanings,
        today: {
          learned: todayLearned,
          reviewed: todayReviewed,
          total: todayLearned + todayReviewed
        }
      }
    }
```

---

### 2. getProgressCurve

**路径**: `GET/POST/PUT/DELETE /api/...`

**成功响应示例**:

```json
{
      success: true,
      message: '获取学习进度曲线成功',
      data: {
        progressData: progressData, // 直接返回数组，符合前端期望
        period: {
          startDate: thirtyDaysAgo.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0],
          days: 30
        },
        summary: {
          totalLearned: totalLearned,
          totalReviewed: totalReviewed,
          totalWords: totalLearned + totalReviewed,
          activeDays: activeDays
        }
      }
    }
```

---

## user

### 1. getDailyGoal

**路径**: `GET/POST/PUT/DELETE /api/...`

**成功响应示例**:

```json
{
      success: true,
      message: '获取每日目标成功',
      data
    }
```

---

### 2. updateDailyGoal

**路径**: `GET/POST/PUT/DELETE /api/...`

**成功响应示例**:

```json
{
      success: true,
      message: '更新每日目标成功',
      data
    }
```

---

