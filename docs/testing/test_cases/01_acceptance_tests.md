# 验收测试用例 (Acceptance Tests)

本文件包含 A001-A050 共 50 条验收用例，旨在验证软件最基础、最核心的业务流程是否跑通。
**优先级**：最高 (P0)
**执行阶段**：冒烟测试、版本发布前验收

| 用例ID | 模块 | 用例标题 | 预期结果 |
| :--- | :--- | :--- | :--- |
| A001 | 用户认证 | 注册-有效用户名密码成功创建账号 | 数据库 users 表新增记录，密码加密存储，返回注册成功消息 |
| A002 | 用户认证 | 登录-正确凭证获取JWT并跳转首页 | 返回 200 及 token，前端存储 token 并重定向至 /today-plan |
| A003 | 用户认证 | 登录-错误密码提示并拒绝发放JWT | 返回 401 及错误提示，前端停留在登录页 |
| A004 | 用户认证 | 认证-携带有效JWT访问受保护接口成功 | 接口返回 200 及预期数据 |
| A005 | 用户认证 | 认证-缺失JWT访问受保护接口返回401 | 接口返回 401，前端重定向至登录页 |
| A006 | 用户认证 | OAuth-回调接口参数完整时绑定成功 | 根据 GitHub ID 创建或关联用户，返回 token |
| A007 | 用户认证 | OAuth-未授权状态回调提示错误 | 返回 400/401 错误，提示授权失败 |
| A008 | 用户认证 | 会话保持-刷新页面仍保持登录态 | 刷新后无需重新登录，store 中 isAuthenticated 仍为 true |
| A009 | 用户认证 | 登出-清除令牌并跳转登录页 | 清除本地存储 token，重定向至 /login |
| A010 | 用户认证 | 用户信息-获取当前用户基本资料成功 | 返回 id, username, dailyLearningGoal 等字段 |
| A011 | 词书管理 | 获取词书列表（CET4/CET6等）成功 | 返回包含 id, tagName, count 等信息的列表 |
| A012 | 词书管理 | 切换当前学习词书成功与持久化 | 数据库 users.current_book_tag_id 更新，返回新词书信息 |
| A013 | 词书管理 | 稳定乱序-同用户同书顺序稳定 | 多次调用 getTodayPlan 或 getNewMeanings，新词顺序一致 |
| A014 | 词书管理 | 稳定乱序-不同salt顺序不同 | reshuffle 后，新词顺序发生变化 |
| A015 | 词书管理 | 每日目标设置-更新并生效 | 更新 users.daily_learning_goal，今日计划配额即时变化 |
| A016 | 今日计划 | 获取今日计划-含进度/复习/新学配额 | 返回结构包含 progress, review, newLearning 且数值非空 |
| A017 | 今日计划 | 配额计算=目标-（已学+复习）正确 | newLearning.quota 数值逻辑正确，最小为 0 |
| A018 | 今日计划 | 待复习统计-返回due meanings与单词数 | review.dueCount 与 review.words 列表长度一致 |
| A019 | 今日计划 | 新学候选-返回10个稳定乱序单词 | newLearning.words 长度为 10 (或剩余不足10)，且顺序稳定 |
| A020 | 今日计划 | 未选择词书时提示选择 | 接口返回特定错误码或前端检测到无 currentBook 跳转选择页 |
| A021 | 学习会话 | 新学模式-startSession返回show-sentence | 响应 type 为 show-sentence，包含 sentence, word, meaningId |
| A022 | 学习会话 | 复习模式-startSession识别/拼写题 | 响应 type 为 show-question 或 show-spelling-question |
| A023 | 学习会话 | 路径A-选择题正确返回continue-next | 提交正确答案，响应 type 为 continue-next，无卡片阻断 |
| A024 | 学习会话 | 路径A-选择题错误返回show-card | 提交错误答案，响应 type 为 show-card，显示正确释义 |
| A025 | 学习会话 | 路径B-返回选择题并反馈卡片 | 无论对错，最终都会展示 show-card (或根据新逻辑调整) |
| A026 | 学习会话 | 路径C-直接教学卡片并创建Booster | 响应 type 为 show-card，后端创建 Booster 任务 |
| A027 | 学习会话 | submitAnswer-正确写入进度与打卡 | user_learning_progress 更新，daily_check_ins 计数增加 |
| A028 | 学习会话 | submitAnswer-错误创建Booster并写进度 | user_learning_progress 降级，session.boosters 增加 |
| A029 | 学习会话 | submitSpelling-规范化比对正确记录 | 忽略大小写标点后匹配成功，视为正确 |
| A030 | 学习会话 | getNextQuestions-触发到期Booster | 当 booster.afterN <= 0，优先返回 show-booster-question |
| A031 | 学习会话 | 单词所有词义学完返回show-word-summary | 当前单词所有 meaning.learned=true，返回单词总结页 |
| A032 | 学习会话 | 目标达成-new-only返回session-complete | 今日完成数 >= 目标，且模式为 new-only，结束会话 |
| A033 | 学习会话 | sessionId过期返回错误并前端重建 | 接口报 404 Session Not Found，前端自动重新 startSession |
| A034 | 学习会话 | heartbeat返回当前状态与booster数 | 返回 session 存活状态及待处理 booster 数量 |
| A035 | 学习会话 | 跳过词义skipMeaning推进到下一项 | 当前 meaning 加入 skipped 集合，直接进入下一题 |
| A036 | 打卡成就 | 更新daily_check_ins（learn-meaning） | 数据库 meanings_learned +1 |
| A037 | 打卡成就 | 更新daily_check_ins（review-meaning） | 数据库 meanings_reviewed +1 |
| A038 | 打卡成就 | 统计今日learned/reviewed/total正确 | 数据库记录与前端今日计划展示一致 |
| A039 | 统计分析 | 获取概览-总学习数与待复习数 | stats/overview 接口返回数据与数据库 count 一致 |
| A040 | 统计分析 | 掌握度分布-0-5级计数正确 | stats/overview 返回的分布总和等于总学习单词数 |
| A041 | 视频生成 | 今日无学习拒绝生成并提示 | 接口返回 400，提示先完成学习 |
| A042 | 视频生成 | 生成今日视频并返回jobId | 接口返回 201，video_generation_jobs 表新增记录 |
| A043 | 视频生成 | status轮询至completed含videoUrl | 任务状态最终变为 completed，videoUrl 非空 |
| A044 | 视频生成 | 今日重复生成直接返回已生成任务 | 不创建新 Job，返回已存在的 Job 信息 |
| A045 | 视频生成 | 次日清理videoPath与标记cleaned | 运行清理脚本后，物理文件删除，数据库状态更新 |
| A046 | 静态资源 | /api/static访问视频文件成功 | 通过浏览器或 curl 可下载/播放生成的视频 |

## 部署与运维验收 (仅限管理员/DevOps)

以下用例用于验证系统部署状态。

| 用例ID | 模块 | 用例标题 | 预期结果 |
| :--- | :--- | :--- | :--- |
| A047 | 部署 | docker-compose启动后端前端成功 | 容器状态均为 Up，日志无报错 |
| A048 | 部署 | prisma migrate与seed执行成功 | 数据库表结构创建完整，初始词书数据存在 |
| A049 | 安全 | 未匹配路由返回规范404与AppError | 访问不存在接口返回 JSON 格式错误信息 |
| A050 | 安全 | 未捕获异常与未处理拒绝统一退出日志 | 后端日志捕获异常堆栈，进程优雅退出或重启 |
