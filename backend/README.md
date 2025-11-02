# 语境记忆背单词 - 后端服务

## 项目结构

```
backend/
├── src/
│   ├── index.ts              # 服务器入口文件
│   ├── routes/               # 路由定义
│   ├── controllers/          # 业务逻辑控制器
│   ├── middleware/           # 中间件（如JWT验证）
│   └── utils/                # 工具函数
├── prisma/
│   ├── schema.prisma         # Prisma 数据模型定义
│   └── seed.ts               # 种子数据脚本
├── .env                      # 环境变量配置
├── .env.example              # 环境变量模板
├── package.json              # 项目依赖
└── tsconfig.json             # TypeScript 配置
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置 MySQL 数据库

#### 2.1 使用 root 用户登录 MySQL

```bash
mysql -u root -p
```

输入密码后，执行以下 SQL 命令：

#### 2.2 创建数据库

```sql
CREATE DATABASE IF NOT EXISTS vocabulary_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

#### 2.3 创建专用数据库用户（推荐）

```sql
-- 创建用户（请将 'your_password' 替换为您的安全密码）
CREATE USER IF NOT EXISTS 'vocab_user'@'localhost' IDENTIFIED BY 'your_password';

-- 授予权限
GRANT ALL PRIVILEGES ON vocabulary_db.* TO 'vocab_user'@'localhost';

-- 刷新权限
FLUSH PRIVILEGES;

-- 退出 MySQL
EXIT;
```

#### 2.4 验证数据库用户

您可以使用新创建的用户直接登录数据库：

```bash
# 方式1：登录时指定数据库
mysql -u vocab_user -p vocabulary_db

# 方式2：登录后切换数据库
mysql -u vocab_user -p
USE vocabulary_db;
```

### 3. 配置环境变量

复制 `.env.example` 为 `.env` 并修改配置：

```bash
cp .env.example .env
```

然后编辑 `.env` 文件，修改 `DATABASE_URL`：

```env
# 格式：mysql://用户名:密码@主机:端口/数据库名
DATABASE_URL="mysql://vocab_user:your_password@localhost:3306/vocabulary_db"
```

**注意事项：**
- 端口号必须与 MySQL 实际运行端口一致（默认 3306）
- 可以通过 `netstat -ano | findstr "3306"` 检查 MySQL 端口
- 字符串中的密码需要替换为您在步骤 2.3 中设置的密码

### 4. 启动开发服务器

```bash
npm run dev
```

服务器将在 `http://localhost:3000` 启动。

## API 端点

### 公开端点（无需认证）

#### 健康检查
```http
GET /health
```

#### 用户注册
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "your_username",
  "password": "your_password"
}
```

#### 用户登录
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "your_username",
  "password": "your_password"
}
```

**响应示例：**
```json
{
  "success": true,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "your_username"
    }
  }
}
```

### 受保护端点（需要认证）

所有受保护的端点都需要在请求头中包含 JWT token：

```http
Authorization: Bearer <your_token_here>
```

#### 获取用户信息
```http
GET /api/user/profile
Authorization: Bearer <token>
```

## 测试 API

### 使用 PowerShell 测试

项目包含一个测试脚本 `test-auth.ps1`，可以快速测试认证功能：

```bash
.\test-auth.ps1
```

### 手动测试

```powershell
# 1. 注册用户
$body = @{ username = "testuser"; password = "test123456" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/api/auth/register" -Method POST -Body $body -ContentType "application/json"

# 2. 登录获取 token
$response = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method POST -Body $body -ContentType "application/json"
$token = $response.data.token

# 3. 使用 token 访问受保护的端点
$headers = @{ Authorization = "Bearer $token" }
Invoke-RestMethod -Uri "http://localhost:3000/api/user/profile" -Method GET -Headers $headers
```

## 可用脚本

- `npm run dev` - 启动开发服务器（带热重载）
- `npm run build` - 编译 TypeScript 到 JavaScript
- `npm start` - 启动生产服务器
- `npm run prisma:generate` - 生成 Prisma Client
- `npm run prisma:migrate` - 执行数据库迁移
- `npm run prisma:seed` - 填充种子数据

## 技术栈

- **运行环境**: Node.js
- **Web 框架**: Express
- **语言**: TypeScript
- **ORM**: Prisma
- **数据库**: MySQL
- **认证**: JWT (jsonwebtoken)
- **密码加密**: bcryptjs
