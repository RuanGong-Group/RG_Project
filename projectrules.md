---
type: "manual"
---

# 项目核心开发准则

**版本:** v2.1
**日期:** 2025年11月6日
**核心思想:** 本准则旨在确保AI助手在开发过程中的行为是可预测、可靠且高质量的。它基于用户的核心要求：避免模型幻觉、防止随意生成、行动前复述想法、及时沟通、同步文档。

---

### 1. 沟通与确认原则 (Communication & Confirmation)

1.1. **完整阅读核心文档 (Complete Document Reading):** **【最高优先级】** 在开始任何新任务或阶段性工作之前，必须完整阅读所有核心设计文档。
    - **当前最新版本:** `PRD_V2.md`, `Database_Design_Document_V2.md`
    - **历史参考:** `PRD.md`、`Technical_Design_Document.md`、`Database_Design_Document.md`、`Design_Thought_Summary.md`
    - **原则:** 当新版文档（如 V2）存在时，必须以新版为准。这是确保理解项目全貌、避免设计偏差的根本保证。

1.2. **复述确认 (Restate and Confirm):** 在执行任何实质性操作（如修改文件、创建文件、执行关键命令）之前，必须先用自己的话清晰地复述我的理解和即将执行的详细计划。

1.3. **等待批准 (Await Approval):** 只有在计划获得你的明确同意（如 "好的"、"可以"、"执行吧"）后，才能开始执行。

1.4. **主动询问 (Proactive Inquiry):** 当需求不明确、存在多种可能性、或对设计有疑问时，必须第一时间向你提问以澄清。**严禁擅自猜测或做主。**

1.5. **承认错误 (Acknowledge Mistakes):** 如果出现错误，必须坦诚承认，并解释错误原因，然后提出清晰的修正方案。

1.6. **高效沟通 (Efficient Communication):** **注意，模型额度有限。** 对于非常简单、明确、无风险的操作（例如，格式化代码、修正明显的拼写错误），可以自主完成，无需事事询问。但任何涉及逻辑、设计或潜在风险的修改，仍需严格遵守 `1.2` 和 `1.3`。

---

### 2. 操作执行原则 (Execution)

2.1. **严格遵循计划 (Strict Adherence to Plan):** 执行过程必须严格遵循已获得批准的计划。如果中途发现计划需要调整，必须暂停执行，并回到 `1.1` 重新沟通确认。

2.2. **验证操作结果 (Verify Actions):** **【最高优先级】** 每次声称完成了文件修改后，必须进行自我核查（例如，通过内部工具检查或重新读取文件），确保文件内容确实已经被成功更新。**绝不允许出现“说了但没做”的情况。**

2.3. **一次只做一件事 (One Thing at a Time):** 对于复杂任务，应分解为更小的、可管理的步骤，并逐一执行和确认，以确保每一步的正确性。

---

### 3. 文档同步原则 (Documentation Synchronization)

3.1. **设计先行 (Design First):** 在进行任何重要功能的代码实现之前，必须先更新或创建相关的设计文档（PRD, 技术设计文档, 数据库设计文档）。

3.2. **代码与文档一致 (Code-Doc Consistency):** 代码实现必须与最新的设计文档保持一致。如果实现过程中发现需要对设计进行调整，应先更新文档，并与我（用户）沟通确认。

3.3. **注释即文档 (Comments as Documentation):** 对复杂的逻辑、算法或数据结构，应在代码中添加清晰的注释。

### 4. 数据结构验证规则 (Data Structure Validation)

4.1. **严格遵循 Prisma Schema:** 所有与数据库交互的代码，都必须严格遵循 `prisma/schema.prisma` 的定义。

4.2. **V2 核心模型规则:**
    - **`Word` 模型:**
        - `word` 字段必须是唯一的、小写的、经过 trim 处理的。
        - `lemma` 字段用于存储单词的原型。如果一个单词本身就是原型，则该字段为 `null`。所有非原型的单词（如 `went`, `better`）都应指向其原型（`go`, `good`）。
    - **`Meaning` 模型:**
        - `word_id` 必须关联到一个有效的 `Word` 记录。
        - `part_of_speech` 和 `definition` 是核心含义的必要字段。
        - `extra` 字段 (JSON 类型) 用于存储所有附加信息，如英文定义 (`definition_en`)、标签 (`tags`)、音标 (`phonetic`) 等。在写入前，必须确保其结构符合 `Database_Design_Document_V2.md` 中定义的规范。
    - **`ExamplePool` 模型:**
        - `sentence` 字段在入库前必须经过清洗，去除不必要的空白和特殊字符。
        - `embedding` 字段的生成和使用必须遵循技术设计文档中的向量语义模型规范。

4.3. **数据导入脚本 (`import-*.ts`):**
    - **原子性:** 单词及其所有相关数据（词义、例句、变形关系）的导入应在一个事务中完成。
    - **幂等性:** 脚本应能够重复执行而不会产生重复数据或错误。在插入新数据前，必须检查数据是否已存在。
    - **清晰的日志:** 必须为每个导入任务记录详细的日志，包括成功、失败、跳过的单词数量。

4.4. **API 响应格式:**
    - 所有 API 响应都必须使用 `src/utils/response.ts` 中的标准化格式进行包装。
    - 返回给前端的数据应严格遵循 `frontend_api_spec.md` 中定义的结构，避免泄露不必要的后端细节。

---

### 5. 前端开发规范 - 错误处理与拦截器 (Frontend Error Handling)

**【2025-10-29 新增】基于测试点1的教训**

5.1. **拦截器规范 (Interceptor Rules)**
- ❌ **禁止**在拦截器中直接使用 `window.location.href` 跳转（会导致页面刷新，错误信息丢失）
- ❌ **禁止**在拦截器中使用 `alert()` / `confirm()`（阻塞用户操作）
- ✅ 拦截器**只负责转换错误**，不做副作用（跳转、弹窗等）
- ✅ 使用**白名单/黑名单**判断特殊场景（如：登录接口的 401 不应触发跳转）
- ✅ 页面跳转由 **Store/Router 层**控制，而非拦截器

**正确示例**：
```typescript
// ✅ 正确：根据场景判断
if (error.response?.status === 401) {
  if (!window.location.pathname.includes('/login')) {
    // 非登录页面才跳转
    navigate('/login');
  }
  return Promise.reject(new Error(error.response?.data?.message));
}
```

5.2. **错误处理层级 (Error Handling Hierarchy)**

正确的错误处理流程：
```
后端返回错误
  ↓
Axios 拦截器（只做转换，返回 Promise.reject）
  ↓
API 层（抛出 Error 对象）
  ↓
Store 层（捕获错误，更新 error 状态）
  ↓
UI 层（显示错误提示，不刷新页面）
```

- ❌ **禁止**错误在某一层被"吞掉"（如：拦截器直接跳转导致错误信息丢失）
- ✅ 每一层都应该**转发错误**给上层，最终由 UI 层显示

5.3. **强制测试场景 (Mandatory Test Scenarios)**

在完成任何关键功能后，必须测试以下场景：
- [ ] **成功场景**：正常流程（如：正确的账号密码）
- [ ] **失败场景**：用户输入错误（如：错误的密码）
- [ ] **网络错误**：后端服务关闭或超时
- [ ] **边界条件**：空输入、超长输入、特殊字符

**重点关注**：
- 错误提示是否友好？
- 页面是否刷新？（应该不刷新）
- Console 是否有未捕获的错误？
- 用户能否看到具体的错误信息？

5.4. **代码提交前自查清单 (Pre-commit Checklist)**

在提交任何前端代码前，必须检查：
- [ ] 是否有 `window.location.href`？是否必要？能否用 `navigate()` 替代？
- [ ] 是否有 `alert()` / `confirm()`？能否用 UI 组件（Modal、Toast）替代？
- [ ] 错误处理是否完整？（try-catch、Promise.reject、错误状态）
- [ ] 是否有调试用的 `console.log` 需要删除？
- [ ] TypeScript 是否有类型错误？（运行 `npm run typecheck`）
- [ ] 是否测试了失败场景？

5.5. **禁止的反模式 (Anti-patterns)**

❌ **反模式1：拦截器直接跳转**
```typescript
// ❌ 错误：会导致登录页面刷新
apiClient.interceptors.response.use(null, (error) => {
  if (error.response?.status === 401) {
    window.location.href = '/login';  // 不考虑当前页面！
  }
});
```

❌ **反模式2：错误被"吞掉"**
```typescript
// ❌ 错误：用户看不到错误信息
try {
  await login();
} catch (error) {
  console.error(error);  // 只打日志，不显示给用户
}
```

❌ **反模式3：没有测试失败场景**
```typescript
// ❌ 只测试了正确的账号密码，没测试错误密码
// 导致拦截器 bug 一直未被发现
```

---

## 6. 数据结构验证规则 (Data Structure Validation Rules)

**更新时间**: 2025-10-29（测试点3后添加）

### 6.1. **前端类型定义流程 (Frontend Type Definition Process)** ⚠️ 强制

定义前端 TypeScript 类型时，必须按以下顺序检查：

1. ✅ **阅读 API 文档示例**（`BACKEND_API_ACTUAL_RESPONSES.md`）
2. ✅ **检查数据库 Schema**（`backend/prisma/schema.prisma`）
   - 字段类型（String / Int / Json / DateTime）
   - 字段注释（是否说明 JSON 格式、枚举值等）
3. ✅ **检查后端代码的数据转换**（controller 文件）
   - 是否有 `JSON.parse` / `safeJsonParse`？
   - 是否有数据格式化逻辑？
4. ✅ **查看实际数据**（Prisma Studio 或 SQL 查询）
   - 字段的真实值是什么？
   - 是否有 null / 空字符串 / 空数组？
5. ✅ **定义类型覆盖所有可能值**
   ```typescript
   // ❌ 错误：只考虑了 null
   relatedInfo: any | null;
   
   // ✅ 正确：考虑了所有可能的类型
   relatedInfo: string | { synonyms?: string[]; examples?: string[] } | null;
   ```

### 6.2. **渲染前验证 (Pre-render Validation)** ⚠️ 强制

在 JSX 中渲染变量前，必须验证类型：

❌ **反模式4：直接渲染未知类型**
```typescript
// ❌ 错误：如果 relatedInfo 是对象，React 会报错
<p>{currentMeaning.relatedInfo}</p>
```

✅ **正确做法：类型检查后渲染**
```typescript
// ✅ 方案1：检查类型
{currentMeaning.relatedInfo && typeof currentMeaning.relatedInfo === 'string' && (
  <p>{currentMeaning.relatedInfo}</p>
)}

// ✅ 方案2：JSON 序列化
{currentMeaning.relatedInfo && (
  <p>{typeof currentMeaning.relatedInfo === 'object' 
    ? JSON.stringify(currentMeaning.relatedInfo) 
    : currentMeaning.relatedInfo}</p>
)}

// ✅ 方案3：条件渲染（最安全）
{currentMeaning.relatedInfo && typeof currentMeaning.relatedInfo === 'object' && (
  <div>
    {currentMeaning.relatedInfo.synonyms && (
      <p>同义词：{currentMeaning.relatedInfo.synonyms.join(', ')}</p>
    )}
  </div>
)}
```

### 6.3. **边缘情况测试 (Edge Case Testing)** ⚠️ 强制

在完成数据展示功能后，必须测试以下边缘情况：

- [ ] 字段为 `null` 的情况
- [ ] 字段为空字符串 `""` 的情况
- [ ] 字段为空数组 `[]` 的情况
- [ ] 字段为对象的情况（如果可能）
- [ ] 字段为意外类型的情况（后端返回错误数据）

**测试方法**：
1. 用 Prisma Studio 手动修改数据
2. 或在代码中临时 mock 数据
3. 观察页面是否白屏、是否有 Console 错误

### 6.4. **Console 错误零容忍 (Zero Console Errors)**

部署到生产环境前：
- ❌ Console 不能有任何 React 错误（红色）
- ❌ Console 不能有类型错误
- ⚠️ Console 警告（黄色）需要评估是否修复

**检查方法**：
```bash
# 打开浏览器开发者工具
F12 → Console 标签 → 清空日志 → 完整测试一遍流程
```

---
