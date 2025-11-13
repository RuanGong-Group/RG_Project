前端 API 调用规范（供前端开发与 bolt.new 生成的前端直接使用）

全局约定
- Base URL: 环境变量 VITE_API_BASE_URL（示例: http://localhost:3000/api）
- Auth: 登录后在 Authorization Header 中使用 Bearer <token>
- 错误响应：
  - 统一格式：{ success: false, message: string, code?: number }
- 成功响应：通常格式：{ success: true, data: ... }

1. Auth（注册 / 登录）

POST /api/auth/register
- Auth: Public
- Body (application/json): { username: string, password: string }
- 验证规则：username 长度 3-50，password 最少 6
- 成功响应 (201):
  {
    "success": true,
    "message": "注册成功",
    "data": { "user": { "id": 123, "username": "alice", "createdAt": "2025-10-27T..." } }
  }
- 常见错误：400（参数错误）、409（用户名已被使用）

POST /api/auth/login
- Auth: Public
- Body: { username: string, password: string }
- 成功响应 (200):
  {
    "success": true,
    "message": "登录成功",
    "data": {
      "token": "<jwt-token>",
      "user": { "id": 123, "username": "alice" }
    }
  }
- 前端行为：保存 token 到 localStorage（jm_token），并在 axios 实例中设置 Authorization


2. 用户接口

GET /api/user/current-book
- Auth: Bearer
- 成功示例：
  { success: true, data: { id: 10, tagName: "CET-4" } }

PUT /api/user/current-book
- Auth: Bearer
- Body: { bookId: number }
- 成功示例：{ success: true, message: "切换成功" }

GET /api/user/settings/daily-goal
- Auth: Bearer
- 成功示例：{ success: true, data: { dailyLearningGoal: 10 } }

PUT /api/user/settings/daily-goal
- Auth: Bearer
- Body: { dailyLearningGoal: number }
- 成功示例：{ success: true, message: "更新成功" }


3. 学习模块（核心）

GET /api/learning/next
- 说明：获取下一个学习内容（通用接口）
- Auth: Bearer
- 成功示例：
  {
    "success": true,
    "data": {
      "type": "meaning", // or "spelling" etc.
      "payload": { /* 根据 type 返回不同结构 */ }
    }
  }

POST /api/learning/progress
- 说明：更新学习进度（通用）
- Auth: Bearer
- Body: { results: [{ meaningId: number, isCorrect: boolean }] }
- 成功示例：{ success: true, message: "学习进度更新成功", data: [{ meaningId: 501, masteryLevel: 1, nextReviewAt: "2025-11-13T..." }] }

GET /api/learning/review/today
- Auth: Bearer
- 返回：数组，元素包含 { meaningId, word:{id,word,pronunciation}, masteryFocus: 'recognition'|'production', examples: [...] }

POST /api/learning/review/submit
- Auth: Bearer
- Body: { reviewId: number, meaningId: number, isCorrect: boolean, details?: { typed?: string } }
- 成功示例：{ success: true }

// 新的完整单词学习流程接口（V2 架构）
GET /api/learning/word/next
- Auth: Bearer
- 返回示例：
  {
    "success": true,
    "data": {
      "wordId": 101,
      "word": "abandon",
      "pronunciation": { "uk": "/əˈbændən/", "us": "/əˈbændən/" },
      "lemma": "abandon",
      "meanings": [
        {
          "meaningId": 501,
          "partOfSpeech": "v.",
          "definition": "放弃；抛弃",
          "extra": null,
          "examples": [
            {
              "id": 9001,
              "sentence": "Many people had to abandon their homes.",
              "sourceType": "真题",
              "sourceDetail": "CET-4 2023-06"
            }
          ]
        }
      ],
      "masteryFocus": "recognition",
      "bookTag": "CET-4"
    }
  }

POST /api/learning/meaning/submit
- Auth: Bearer
- Body: { meaningId: number, isCorrect: boolean }
- 成功示例：{ success: true, message: "记录成功", data: { nextMeaningId?: number, wordComplete?: boolean } }

POST /api/learning/word/complete
- Auth: Bearer
- Body: { wordId: number }
- 成功示例：{ success: true, message: "单词学习完成" }

GET /api/learning/today-plan
- Auth: Bearer
- 返回示例：智能分配列表：
  [ { type: 'review', meaningId: 501, word: {...}, masteryFocus: 'recognition' }, { type: 'new', meaningId: 610, word: {...} } ]


4. 词书管理

GET /api/books
- Auth: Bearer
- 返回：词书列表 { id, tagName, isUserDefined }

（后端还支持纯文本导入词书的接口，前端在导入页面提供文本框，提交后会触发后端的导入流程；若需要我可以把导入接口的具体路径与字段补充到本文件）


5. 生词本 (Notebook)

GET /api/notebook/words
- Auth: Bearer
- 返回：[{ wordId, word, pronunciation, addedAt }]

POST /api/notebook/words
- Auth: Bearer
- Body: { wordId: number }
- 成功示例：{ success: true }

DELETE /api/notebook/words/:wordId
- Auth: Bearer
- 成功示例：{ success: true }


6. 打卡系统

GET /api/checkin/today
- Auth: Bearer
- 返回：{ success: true, data: { goalCompleted: boolean, consecutiveDays: number, todayCount: number } }

GET /api/checkin/history?days=30
- Auth: Bearer
- 返回：{ success: true, data: [ { date: '2025-10-01', completed: true }, ... ] }


7. 统计

GET /api/stats/overview
- Auth: Bearer
- 返回：{ success: true, data: { todayLearned: number, todayReviewed: number, consecutiveDays: number } }

GET /api/stats/progress
- Auth: Bearer
- 返回：{ success: true, data: { dates: ['2025-09-29', ...], values: [3,5,2,...] } }


错误码与前端处理建议
- 400: 请求参数错误 -> 在表单层给出友好提示
- 401: 未授权/Token 过期 -> 清理本地 token，跳转登录
- 403: 权限不足 -> 展示错误提示
- 404: 资源不存在 -> 友好展示空状态
- 429: 速率限制 -> 展示稍后重试
- 500: 服务器错误 -> 展示通用错误页，并可上报

Mock 示例（供本地运行）
- mock/learning/wordNext.json
  {
    "success": true,
    "data": {
      "wordId": 101,
      "word": "abandon",
      "pronunciation": { "uk": "/əˈbændən/", "us": "/əˈbændən/" },
      "lemma": "abandon",
      "meanings": [
        {
          "meaningId": 501,
          "partOfSpeech": "v.",
          "definition": "放弃；抛弃",
          "extra": null,
          "examples": [{ "id": 9001, "sentence": "Many people had to abandon their homes.", "sourceType": "ecdict", "sourceDetail": null }]
        }
      ],
      "masteryFocus": "recognition",
      "bookTag": "CET-4"
    }
  }

开发注意事项
- axios 实例里设置超时 10s，开启请求重试（可选）
- 对响应进行统一解析：若 success === false 则抛错
- 在生产模式关闭 mock

环境变量（.env.example）
VITE_API_BASE_URL=http://localhost:3000/api
VITE_APP_NAME=语境记忆


附录：常见请求示例（axios）
const axiosInstance = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL, timeout: 10000 });
axiosInstance.interceptors.request.use(config => { const token = localStorage.getItem('jm_token'); if(token) config.headers['Authorization'] = `Bearer ${token}`; return config; });

示例：获取今日计划
const res = await axiosInstance.get('/learning/today-plan');
if(!res.data.success) throw new Error(res.data.message);
return res.data.data;


---
如果你需要，我可以把这些文档进一步转换成 OpenAPI (YAML/JSON) 格式，或把 API mock 生成为 msw/Mock Service Worker 的配置文件，便于本地联调。