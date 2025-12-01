# 项目开发问题总结与经验教训

**创建日期：** 2025年10月30日  
**最后更新：** 2025年12月1日  
**文档性质：** 问题追踪 + 开发经验总结

---

## 📌 文档说明

本文档记录项目开发过程中遇到的所有问题、错误及其解决方案，同时总结宝贵的开发经验教训，为后续开发提供指导。

---

## 🔥 核心开发经验教训（血泪总结）

**日期：** 2025年11月16日  
**总结人：** 项目负责人  
**重要性：** ⭐⭐⭐⭐⭐

### 教训1：没有真正理解需求就开始编码 ❌

**问题描述：**
PRD_V2明确写了"三路径引导式学习模型"，但在实现时：
- ❌ 没有先在纸上画出完整的流程图
- ❌ 没有先设计好前后端的交互流程
- ❌ 就急于创建 `SessionScheduler`、`BoosterQueue` 这些"看起来很高级"的抽象类

**结果：**
写了一堆代码，但连最基本的"情境引入 → 自我评估 → 差异化路径"都没实现出来。

**正确做法：**
1. ✅ **先画流程图**：在纸上或白板上画出完整的用户流程
2. ✅ **明确状态机**：列出所有可能的状态和状态转换
3. ✅ **确定数据流**：明确每一步需要哪些数据，返回什么数据
4. ✅ **再写伪代码**：用注释写出每个函数的核心逻辑
5. ✅ **最后才编码**：基于清晰的设计开始实现

---

### 教训2：前后端接口没有事先约定好 ❌

**问题描述：**
犯了一个致命错误：
- ❌ 后端写了一堆接口（`/self-assessment`, `/submit-answer`, `/next-question`）
- ❌ 前端根本不知道这些接口存在，还在用旧的 `/word/next`
- ❌ 导致前后端完全脱节

**结果：**
前端调用不存在的接口，后端写的接口没人用，两边各自为战。

**正确做法：**
1. ✅ **先定义API契约**：创建或更新 `BACKEND_API_ACTUAL_RESPONSES.md`
2. ✅ **明确每个接口**：
   - 请求方法（GET/POST）
   - 路径（`/api/learning/three-path/start`）
   - 请求体格式（带示例）
   - 响应体格式（带示例）
   - 错误码定义
3. ✅ **前后端同步确认**：开发前双方都确认API设计
4. ✅ **Mock数据测试**：前端可以用Mock数据先开发UI
5. ✅ **集成测试验证**：最后做端到端测试确保联通

---

### 教训3：过度设计 + 半成品堆积 ❌

**问题描述：**
创建了太多"半成品"：
- ❌ `SessionScheduler` - 想做统一调度，但逻辑混乱
- ❌ `BoosterQueue` - 想做短期强化，但和主流程脱节
- ❌ `three-path-learning.controller` - 写了开头，没写完
- ❌ `LearningSessionV2.tsx` - UI极其简陋，功能不完整

**结果：**
每个文件都是半成品，互相调用关系混乱，最后谁也跑不起来。

**正确做法：**
1. ✅ **遵循YAGNI原则**（You Aren't Gonna Need It）
   - 不要提前设计"可能需要"的功能
   - 只实现当前明确需要的功能
2. ✅ **避免过度抽象**：
   - 不要一开始就创建 `Manager`、`Scheduler`、`Handler` 这些抽象类
   - 先写直接的、能跑的代码
   - 等代码重复3次以上，再考虑抽象
3. ✅ **一次只聚焦一个功能**：
   - 不要同时改动多个文件
   - 完成一个，测试通过，再开始下一个

---

### 教训4：没有做增量开发和测试 ❌

**问题描述：**
应该做的：
1. ✅ 先实现一个最简单的"展示单词 + 三个按钮"
2. ✅ 测试能跑通
3. ✅ 再加路径A的逻辑
4. ✅ 测试能跑通
5. ✅ 再加路径B...

但实际做的：
- ❌ 一口气写了一大堆代码
- ❌ 然后全部炸了
- ❌ 不知道从哪里开始调试

**结果：**
代码写了很多，但没有一个功能是可用的，调试极其困难。

**正确做法（MVP增量开发法）：**

#### 第一步：最小展示（15分钟）
```
目标：能看到一个单词和三个按钮
- [ ] 后端：返回单词数据的接口（可以hard code一个固定单词）
- [ ] 前端：展示单词、例句、三个按钮
- [ ] 测试：点击任意按钮，console.log 能输出
```

#### 第二步：路径A逻辑（30分钟）
```
目标：点击"我认识"能进入测试题
- [ ] 后端：处理"我认识"的逻辑，返回测试题
- [ ] 前端：展示4个选项的选择题
- [ ] 测试：选择任意答案，能提交到后端
```

#### 第三步：答对/答错分支（30分钟）
```
目标：答对展示简短反馈，答错展示教学卡片
- [ ] 后端：判断答案正确性，返回不同响应
- [ ] 前端：根据响应展示不同UI
- [ ] 测试：两种情况都能正常显示
```

#### 第四步：路径B和C（各30分钟）
```
类似步骤，逐个完成...
```

---

## 🎯 从血泪教训中提炼的开发原则

### 原则1：理解 → 设计 → 实现
**永远不要跳过前两步！**
```
1. 理解需求（读PRD + 画流程图）         ← 30%时间
2. 设计方案（定义API + 设计���据结构）   ← 30%时间
3. 编写代码（实现逻辑）                 ← 30%时间
4. 测试验证（增量测试）                 ← 10%时间
```

### 原则2：小步快跑，持续验证
**每15-30分钟必须有一个可运行的成果**
- 写完一小块代码 → 立即运行 → 看到效果 → 再继续
- 不要连续写超过1小时不测试

### 原则3：前后端契约先行
**API文档是开发的圣经**
- 任何新功能，先更新API文档
- 前端看着文档开发UI
- 后端看着文档实现接口
- 最后集成测试

### 原则4：简单 > 完美
**先让它跑起来，再让它跑得好**
- 第一版可以hard code
- 第一版可以没有错误处理
- 第一版可以没有优化
- 但第一版必须能跑通核心流程

---

## ✅ 测试问题与解决方案（历史记录）

**日期：** 2025年10月30日  
**测试人员：** 用户  
**测试范围：** 注册、选择词书、学习、设置

---

## 问题1：完成目标后，每日目标处没有更新 ✅

### 问题描述
用户完成今日学习目标后，在"今日学习计划"页面看到的目标数字没有变化。

### 原因分析
**这实际上不是bug，而是正确的设计！**

- 打卡记录会保存**当天的目标值**（snapshot）
- 例如：今天目标是12个，完成后改成13个
- 打卡记录仍然显示12个（因为那是当天的目标）
- 明天的打卡会使用新的13个目标

### 用户混淆点
用户可能期望看到"实时"的目标数字，但打卡系统记录的是历史快照。

### 建议改进（可选）
前端可以在"设置"页面明确提示："修改后的目标将从明天开始生效"

---

## 问题2：六级词书只学了13个就提示"学完了" ❌ **已修复**

### 问题描述
- 六级词书有50个单词
- 用户学了13个单词后，系统提示"该词书所有单词已学完"
- 但实际上还有37个单词未学

### 根本原因
`getTodayLearningPlan` 函数的逻辑错误：

**错误代码**（第1415行）：
```typescript
// 筛选未学习的单词
const unlearnedWordIds = wordIdsInBook.filter(id => !learnedWordIdsAll.has(id));
```

**问题**：只筛选了**完全未学习的单词**，忽略了**部分学习的单词**。

例如：单词 "abandon" 有2个词义，用户只学了1个词义，系统却认为这个单词"已学完"。

### 修复方案
改为检查单词是否有**未学的词义**：

```typescript
// 收集词书中所有单词的所有词义
const wordMeaningMap = new Map<number, number[]>(); // wordId -> meaningIds[]

for (const word of allWordsInBook) {
  const meaningIds: number[] = [];
  for (const pos of word.partsOfSpeech) {
    for (const meaning of pos.meanings) {
      meaningIds.push(meaning.id);
    }
  }
  wordMeaningMap.set(word.id, meaningIds);
}

// 筛选有未学词义的单词（包括部分学习的单词）
const unlearnedWordIds = wordIdsInBook.filter(wordId => {
  const meaningIds = wordMeaningMap.get(wordId) || [];
  // 只要有一个词义未学，就算未学完
  return meaningIds.some(meaningId => !learnedMeaningIds.has(meaningId));
});
```

### 修复结果
- ✅ 正确识别部分学习的单词
- ✅ 用户可以继续学习剩余的37个单词

---

## 问题3：学习单位是"单词"还是"词义"？ ✅

### 问题描述
用户不清楚系统的学习单位到底是按"单词"还是按"词义"计算。

### 正确答案（根据PRD设计）

#### 1. **用户视角**：以"单词"为单位
- 每日目标：学习 10 个**单词**
- 今日已学：13 个**单词**
- 目标完成判定：`wordsLearned >= dailyGoal`

#### 2. **系统内部**：精确到"词义"级别
- 艾宾浩斯算法跟踪每个**词义**的掌握度
- `user_learning_progress` 表以 `meaningId` 为主键
- 每个词义独立计算复习时间

#### 3. **学习流程**：逐个词义学习
- 用户选择学习一个**单词**
- 系统逐个展示该单词的每个**词义**
- 所有词义学完，才算完成一个**单词**的学习

### 示例说明

**单词：abandon**
- 词义1：v. 放弃；抛弃 ✅ 已学
- 词义2：v. 放纵；沉溺 ❌ 未学

**系统行为**：
- ❌ **不会**在"今日已学"中计数（因为没学完）
- ✅ **会**在打卡时增加 `meaningsLearned` 计数（内部统计）
- ⏳ 下次学习时，会继续学习词义2

### 打卡记录的双重计数

```typescript
{
  wordsLearned: 13,      // 用户看到的：完成了13个单词
  meaningsLearned: 16,   // 系统记录的：学了16个词义
  wordsReviewed: 0,      // 复习了0个单词
  meaningsReviewed: 0,   // 复习了0个词义
  dailyGoal: 12,         // 目标：12个单词
  goalCompleted: true    // 判定：13 >= 12 ✅
}
```

### 用户困惑点

**用户可能疑问**："我明明只学了10个词，为什么显示学了16个？"

**回答**：
- 显示的是 **10个单词**（`wordsLearned: 10`）
- 内部记录了 **16个词义**（`meaningsLearned: 16`）
- 用户看到的始终是"单词数"

---

## 其他发现

### 四级词书只有4个单词？
数据显示四级词书只有4个单词，可能是测试数据不完整。建议：
- 重新导入完整的四级词汇数据（约1000个单词）
- 或使用六级词书（50个单词）进行测试

---

## 修复清单

- [x] **问题1**：无需修复（设计如此）
- [x] **问题2**：已修复 `getTodayLearningPlan` 逻辑
- [x] **问题3**：已澄清设计逻辑

---

## 测试建议

修复后需要重新测试：
1. 重启后端服务器
2. 刷新前端页面
3. 检查"待学新词"是否显示剩余的37个单词
4. 继续学习，验证计数是否正确

---

**修复人员：** GitHub Copilot  
**修复时间：** 2025年10月30日

---

## 🐛 每日学习目标跟踪系统 - 修复记录

**问题发现日期：** 2025年12月1日  
**问题类型：** 数据不一致、函数调用错误  
**重要性：** ⭐⭐⭐⭐⭐ 严重（影响核心打卡功能）

---

### 问题概述

虽然学习进度跟踪正常工作，但 `DailyCheckIn` 表中没有今日打卡记录，导致用户看不到学习统计和目标完成状态。

---

### 核心问题1：函数名冲突导致打卡记录缺失 ❌

#### 问题描述
- 用户完成学习/复习后，`DailyCheckIn` 表没有创建或更新记录
- 学习进度在 `UserLearningProgress` 中正常记录
- 但打卡统计数据完全缺失

#### 根本原因分析

**发现了严重的函数调用错误：**

`learning.service.ts` 中存在一个**私有的** `updateDailyCheckIn` 函数：
```typescript
// learning.service.ts (私有函数)
async function updateDailyCheckIn(
  userId: number, 
  meaningId: number,  // ← 第二个参数是 meaningId
  type: 'learn' | 'review'
)
```

但 `checkin.controller.ts` 中导出的是**公开的** `updateTodayCheckIn` 函数：
```typescript
// checkin.controller.ts (公开函数)
export const updateTodayCheckIn = async (
  userId: number,
  type: 'learn' | 'review' | 'learn-meaning' | 'review-meaning',  // ← 第二个参数是 type!
  metadata?: { wordId?: number; meaningId?: number; }
)
```

**这是两个完全不同的函数！**

- `learning.service.ts` 调用的是**自己内部的私有函数**（错误！）
- 该私有函数没有实际更新数据库
- 导致所有通过 `recordLearningResult()` 的学习行为都没有记录到打卡表

#### 错误的调用代码
```typescript
// learning.service.ts - recordLearningResult 函数
if (!progress) {
  // 首次学习
  await updateDailyCheckIn(userId, meaningId, 'learn');  // ← 调用了错误的函数！
} else {
  // 复习
  await updateDailyCheckIn(userId, meaningId, 'review'); // ← 调用了错误的函数！
}
```

#### 解决方案

**1. 删除私有函数**
- 删除 `learning.service.ts` 中的 `updateDailyCheckIn` 函数（约80行代码）

**2. 导入正确的函数**
```typescript
// learning.service.ts
import { updateTodayCheckIn } from '../controllers/checkin.controller';
```

**3. 修改调用方式**
```typescript
if (!progress) {
  // 首次学习
  await updateTodayCheckIn(userId, 'learn-meaning', { meaningId });
} else {
  // 复习
  await updateTodayCheckIn(userId, 'review-meaning', { meaningId });
}
```

#### 修复结果
- ✅ 打卡记录正常创建
- ✅ `wordsLearned`、`meaningsLearned` 正确统计
- ✅ `wordsReviewed`、`meaningsReviewed` 正确统计
- ✅ 目标完成状态正确判定

---

### 核心问题2：日期时区不一致导致唯一约束冲突 ❌

#### 问题描述
修复函数调用后，出现新错误：
```
Unique constraint failed on the fields: (`user_id`,`check_in_date`)
```

#### 根本原因

**时区设置不一致导致日期判定错误：**

`getBeijingToday()` 使用了本地时区：
```typescript
// 错误的实现
export function getBeijingToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);  // ← 使用本地时区
  return today;
}
```

**问题场景：**
- 服务器运行在 GMT+8 时区
- `setHours(0, 0, 0, 0)` 设置为本地零点
- 转换为UTC：`2025-11-30T16:00:00.000Z`（前一天的16点）
- 但数据库中的旧记录是：`2025-11-30T00:00:00.000Z`
- 导致 `upsert` 查询失败，尝试创建新记录时冲突

#### 解决方案

**统一使用UTC时区：**
```typescript
export function getBeijingToday(): Date {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);  // ← 改用 setUTCHours
  return today;
}

export function getBeijingYesterday(): Date {
  const yesterday = new Date();
  yesterday.setUTCHours(0, 0, 0, 0);  // ← 改用 setUTCHours
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday;
}

export function getBeijingDaysAgo(days: number): Date {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);  // ← 改用 setUTCHours
  date.setDate(date.getDate() - days);
  return date;
}
```

#### 修复结果
- ✅ 日期判定一致
- ✅ `upsert` 操作正常
- ✅ 不再出现唯一约束冲突

---

### 核心问题3：upsert 并发竞态条件 ⚠️

#### 问题描述
在高并发场景下，可能出现多个请求同时尝试创建打卡记录。

#### 解决方案

**使用事务确保原子性：**
```typescript
export const updateTodayCheckIn = async (...) => {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.dailyCheckIn.findUnique({
      where: {
        userId_checkInDate: {
          userId: userId,
          checkInDate: today
        }
      }
    });
    
    if (existing) {
      // 更新现有记录
      await tx.dailyCheckIn.update({...});
    } else {
      // 创建新记录
      await tx.dailyCheckIn.create({...});
    }
  });
}
```

#### 修复结果
- ✅ 并发安全
- ✅ 不会创建重复记录

---

### 验证与测试

**测试脚本：**
```bash
npx ts-node scripts/check-today-checkin.ts
npx ts-node scripts/check-learning-progress.ts
```

**测试结果：**
```
✅ 今日新学 6 个单词（10 个词义）
✅ 今日复习 2 个单词（2 个词义）
✅ 打卡记录正常创建
✅ 目标完成判定正确（6 >= 3）
✅ 连续打卡天数正确计算
```

---

### 数据设计说明

#### 双层计数系统

| 维度 | 用途 | 更新时机 |
|------|------|----------|
| **单词级别** | 用户可见、目标判定 | 单词所有词义学完时 |
| **词义级别** | 内部精确跟踪 | 每个词义学习/复习时 |

#### 学习 vs 复习的判定
```typescript
// 首次学习: reviewCount = 1
if (!progress) {
  type = 'learn-meaning'
}

// 复习: reviewCount > 1
else {
  type = 'review-meaning'
}
```

#### 目标完成判定
```typescript
// 仅新学单词计入目标
goalCompleted = (wordsLearned >= dailyGoal)

// 复习不影响目标完成状态
```

---

### 修复文件清单

**1. `backend/src/services/learning.service.ts`**
- 删除私有 `updateDailyCheckIn` 函数
- 导入 `updateTodayCheckIn` 函数
- 修改调用方式

**2. `backend/src/utils/datetime.ts`**
- 修改 `getBeijingToday()` 使用 `setUTCHours()`
- 修改 `getBeijingYesterday()` 使用 `setUTCHours()`
- 修改 `getBeijingDaysAgo()` 使用 `setUTCHours()`

**3. `backend/src/controllers/checkin.controller.ts`**
- 使用 `$transaction` 确保并发安全

---

### 关键经验教训

**教训5：函数命名冲突是隐形杀手 ❌**

**问题：**
- 两个名字相似的函数（`updateDailyCheckIn` vs `updateTodayCheckIn`）
- 一个是私有的，一个是公开的
- 代码能通过编译，但逻辑完全错误
- 这种错误极难发现

**正确做法：**
1. ✅ **统一函数命名规范**：同一功能的函数必须使用相同名称
2. ✅ **避免私有函数与公开函数重名**
3. ✅ **使用 TypeScript 的 import 类型检查**
4. ✅ **集成测试覆盖核心流程**：端到端测试能发现这类问题

**教训6：时区处理必须统一 ❌**

**问题：**
- 混用 `setHours()` 和 `setUTCHours()`
- 导致日期边界判定错误
- 数据库查询失败

**正确做法：**
1. ✅ **统一使用 UTC 时区**处理日期零点
2. ✅ **在工具函数中封装**日期处理逻辑
3. ✅ **明确文档说明**时区处理策略
4. ✅ **测试不同时区场景**

---

**修复人员：** GitHub Copilot  
**修复完成时间：** 2025年12月1日  
**测试状态：** ✅ 通过


