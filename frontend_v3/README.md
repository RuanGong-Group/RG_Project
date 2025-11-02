# Frontend V3 - 最小可用版本

## 当前状态：测试点 1 - 登录功能

### 已完成
- ✅ 项目配置（package.json, tsconfig.json, vite.config.ts）
- ✅ 严格的类型定义（基于 BACKEND_API_ACTUAL_RESPONSES.md）
- ✅ Axios 实例配置
- ✅ Auth API 服务
- ✅ Auth Store（Zustand）
- ✅ 登录页面
- ✅ 首页（临时占位）

### 安装依赖

```powershell
cd frontend_v3
npm install
```

### 启动开发服务器

确保后端已启动（端口 3000），然后：

```powershell
npm run dev
```

访问：http://localhost:5173

### 测试步骤

1. 打开浏览器访问 http://localhost:5173
2. 自动跳转到登录页 `/login`
3. 输入已注册的用户名和密码
4. 点击"登录"按钮
5. **预期结果**：
   - 成功后跳转到首页，显示用户名和ID
   - 失败则显示错误提示

### 验证点

- [ ] 登录页面正常显示
- [ ] 输入验证工作正常（用户名3-50字符，密码至少6字符）
- [ ] 登录成功后跳转到首页
- [ ] 首页显示正确的用户信息（用户名、ID）
- [ ] Token 正确保存到 localStorage（检查 `jm_token`）
- [ ] 退出登录功能正常

### 已知问题

TypeScript 错误是正常的（依赖包未安装），运行 `npm install` 后会消失。

### 下一步（等待测试通过）

测试点1通过后，我将实现：
- 测试点2：今日学习计划页面
- 测试点3：学习会话页面（完整的单词学习流程）

---

**重要提醒**：所有类型定义严格基于后端实际返回格式，不含任何想象成分！
