# 云端部署指南

本文档介绍如何将项目部署到云服务器，实现生产级别的运行环境。文档以 **腾讯云** 为例，讲解使用 **Docker** 容器化部署和 **COS 对象存储** 的配置方法。

**更新日期**: 2025年12月12日  
**版本**: v3.0 - 优化文档结构，更新部署流程

---

## 目录
- [第一部分：架构认知](#第一部分架构认知-what--why)
- [第二部分：三种部署场景选择](#第二部分三种部署场景选择)
- [第三部分：小组内部部署（推荐入门）](#第三部分小组内部部署推荐入门)
- [第四部分：本地 Docker 测试](#第四部分本地-docker-测试)
- [第五部分：开发流程与协作](#第五部分开发流程与协作)
- [第六部分：硬编码问题与解决方案](#第六部分硬编码问题与解决方案)

---

## 第一部分：架构认知 (What & Why)

### 1.1 重构后的架构图

想象你在经营一家连锁餐厅（软件）：

*   **旧架构 (本地开发)**：
    *   你在自己家厨房（本地电脑）做饭。
    *   客人（用户）必须来你家吃饭。
    *   食材（数据）堆在卧室里。
    *   如果搬家，厨房得拆了重装。

*   **新架构 (Docker + 云)**：
    *   **云服务器 (CVM)**：你租了一个标准化的商铺。
    *   **Docker 容器**：你在商铺里放了一个“预制厨房集装箱”。不管商铺在哪，集装箱里的炉灶、锅碗瓢盆（运行环境）都是一模一样的。
    *   **对象存储 (COS)**：你租了一个无限大的冷库。做好的菜（视频）直接存冷库，客人拿号（URL）去冷库取，不占厨房空间。
    *   **云数据库 (MySQL)**：你租了一个专业的保险柜存账本（用户数据）。

### 1.2 核心组件关系

1.  **代码 (Code)**: 依然在你的电脑上写，通过 Git 同步。
2.  **Docker**: 一个“盒子”。我们把代码、Node.js、Python、FFmpeg 全部打包进这个盒子。
3.  **腾讯云 CVM (云服务器)**: 一台 24 小时开机的远程电脑，用来运行 Docker 盒子。
4.  **腾讯云 COS (对象存储)**: 一个网盘。Python 脚本生成视频后，自动上传到这里，然后把本地文件删掉。

### 1.3 部署后的本地文件夹

部署后，你的本地文件夹结构**不需要大变**，但会多出几个配置文件：

```text
RG_project/
├── docker-compose.yml      <-- [新增] 总指挥官，告诉 Docker 怎么启动所有服务
├── backend/
│   ├── Dockerfile          <-- [新增] 后端盒子的说明书
│   ├── assets/
│   │   └── fonts/          <-- [新增] 字体文件移到这里
│   └── ...
├── frontend_v3/
│   ├── Dockerfile          <-- [新增] 前端盒子的说明书
│   └── nginx.conf          <-- [新增] 前端服务器配置
└── ...
```

---

## 第二部分：腾讯云资源准备 (傻瓜式操作)

你需要购买/开通以下两样东西（学生通常有优惠）：

### 2.1 轻量应用服务器 (Lighthouse) 或 云服务器 (CVM)
*   **作用**: 运行 Docker，跑你的代码。
*   **配置建议**:
    *   **系统**: Ubuntu 22.04 LTS (推荐) 或 CentOS 7.9。
    *   **配置**: 2核 4G (最小配置，因为要跑 Python 和 MySQL)。
    *   **防火墙**: 在腾讯云控制台“防火墙”页面，开放 `80` (HTTP), `443` (HTTPS), `3000` (后端测试), `8888` (宝塔面板可选)。

### 2.2 对象存储 (COS)
*   **作用**: 存视频、图片。
*   **操作步骤**:
    1.  登录腾讯云控制台，搜索 "COS"。
    2.  点击“存储桶列表” -> “创建存储桶”。
    3.  **名称**: 例如 `rg-vocab-video`。
    4.  **地域**: 选和你服务器同一个地域（例如都在“北京”），这样内网传输免费且快。
    5.  **访问权限**: 选择 **“公有读私有写”** (Public Read, Private Write)。这很重要！意味着谁都能看视频，但只有你的代码能上传。
    6.  创建完成后，进入“密钥管理” (API Key)，获取 `SecretId` 和 `SecretKey`。记下来！

---

## 第三部分：代码改造实战 (Step-by-Step)

### 步骤 1: 拯救 Python 脚本 (去除 Windows 依赖)

我们需要修改 `backend/scripts/video_gen/generate_daily_video.py`。

1.  **下载字体**: 找一个 `simhei.ttf` 文件，在 `backend` 下新建文件夹 `assets/fonts/`，放进去。
2.  **修改代码**: (稍后我会直接帮你改文件，这里是原理)
    *   把 `C:/Windows/Fonts/...` 删掉。
    *   改成 `os.path.join(os.path.dirname(__file__), '../../assets/fonts/simhei.ttf')`。

### 步骤 2: 接入腾讯云 COS SDK

我们需要在 Python 脚本里加一段“上传并删除”的逻辑。

1.  **安装库**: `pip install cos-python-sdk-v5` (会加到 requirements.txt)。
2.  **配置**: 从环境变量读取 `TENCENT_SECRET_ID`, `TENCENT_SECRET_KEY`, `COS_BUCKET`, `COS_REGION`。

### 步骤 3: 前端配置解耦

修改 `frontend_v3`，让它不再死磕 `localhost`。

1.  **修改 `vite.config.ts`**: 设置开发环境代理。
2.  **修改 `axios.ts`**: 生产环境使用 `/api` 相对路径。

---

## 第四部分：Docker 部署实战

### 4.1 编写 Dockerfile

(稍后我会为你创建这些文件)

### 4.2 服务器端操作

假设你已经买好了腾讯云服务器，并用 SSH (如 Xshell 或 VS Code Remote) 连上了。

1.  **安装 Docker**:
    ```bash
    curl -fsSL https://get.docker.com | bash -s docker --mirror Aliyun
    ```

2.  **拉取代码**:
    ```bash
    git clone https://github.com/RuanGong-Group/RG_project.git
    cd RG_project
    ```

3.  **配置环境变量**:
    创建一个 `.env` 文件，填入你的腾讯云密钥和数据库密码。

4.  **一键启动**:
    ```bash
    docker compose up -d --build
    ```

---

## 第五部分：OAuth 认证与学习流程详解

### 5.1 OAuth 2.0 认证流程 (GitHub 登录为例)

OAuth 让用户可以使用现有的 GitHub/微信/Google 账号登录，无需记住新密码。

#### 5.1.1 核心安全机制：GitHub 凭什么信任我们？

你可能会问：“随便一个网页都能让 GitHub 辅助完成 OAuth 吗？” 答案是**绝对不行**。GitHub 通过三大关卡确保安全：

1.  **实名备案 (App Registration)**:
    *   你必须在 GitHub 开发者后台注册应用，获得 **Client ID** (公钥) 和 **Client Secret** (私钥)。
    *   **Client Secret** 必须严格保存在后端服务器，绝不能泄露给前端或提交到 Git。

2.  **白名单回调 (Callback URL)**:
    *   这是最关键的防线。你在注册时必须填写允许的回调地址（如 `http://your-site.com/callback`）。
    *   当用户授权后，GitHub **只会** 将用户重定向回这个白名单地址。
    *   如果黑客伪造了一个网站并发起登录请求，GitHub 会检测到回调地址不匹配，直接拒绝跳转。

3.  **后端验签 (Server-to-Server Exchange)**:
    *   前端拿到的只是一个临时的 `Code`。
    *   必须由你的**后端服务器**，拿着 `Code` + **Client Secret** 去找 GitHub 换取真正的 Token。
    *   由于黑客没有你的 Client Secret，即使截获了 Code 也无法登录。

**流程图解**:

1.  **前端**: 用户点击 "Login with GitHub"。
2.  **前端**: 浏览器跳转到 `https://github.com/login/oauth/authorize?client_id=YOUR_ID`。
3.  **GitHub**: 用户在 GitHub 页面确认授权。
4.  **GitHub**: 浏览器跳回你的前端回调页 `http://your-site.com/callback?code=XYZ123`。
5.  **前端**: 拿到 `code=XYZ123`，发送给 **后端 API**。
6.  **后端**: 拿着 `code` 和 `client_secret` 去找 GitHub 换取 `access_token`。
7.  **后端**: 拿着 `access_token` 去 GitHub 获取用户信息 (用户名, 头像)。
8.  **后端**:
    *   如果数据库里有这个 GitHub ID -> 生成 JWT Token 登录。
    *   如果没有 -> 自动注册新用户 -> 生成 JWT Token 登录。
9.  **前端**: 收到 JWT Token，存入 LocalStorage，登录成功。

**实现步骤**:
1.  在 GitHub Developer Settings 注册 OAuth App，获取 Client ID 和 Secret。
2.  后端安装 `passport` 或直接写 HTTP 请求换取 Token。
3.  前端添加登录按钮和回调路由。

### 5.2 用户学习/复习流程 (SM-2 算法交互)

**场景：用户开始今天的复习**

1.  **前端**: 请求 `GET /api/learning/today-plan`。
2.  **后端**:
    *   查询 `UserLearningProgress` 表。
    *   找出 `nextReviewAt <= now` 的单词。
    *   找出 `isNew = true` 的新词。
    *   返回单词列表 (JSON)。
3.  **前端**: 展示单词卡片，用户点击 "认识" 或 "不认识"。
4.  **前端**: 请求 `POST /api/learning/record`，提交 `{ wordId: 1, quality: 5 }`。
5.  **后端**:
    *   调用 `learning.service.ts` 中的 `calculateSM2` 函数。
    *   根据当前 `easinessFactor` 和用户评分，计算下一次复习时间 (例如 3 天后)。

---

## 第二部分：三种部署场景选择

根据项目阶段和使用范围，选择合适的部署方案：

### 场景对比表

| 场景 | 适用人群 | 是否需要域名 | 成本 | 访问方式 | 推荐度 |
|------|---------|------------|------|---------|--------|
| **场景1: 小组内部使用** | 课程项目、团队测试 | ❌ 不需要 | 云服务器费用（~100元/月） | IP地址 + 端口 | ⭐⭐⭐⭐⭐ |
| **场景2: 本地 Docker 测试** | 开发调试 | ❌ 不需要 | 0元（本地运行） | localhost | ⭐⭐⭐⭐⭐ |
| **场景3: 正式对外服务** | 公开产品 | ✅ 需要 | 云服务器 + 域名（~15元/年） | 域名（https://） | ⭐⭐⭐ |

**推荐路线**：
1. 先做 **场景2**（本地 Docker 测试）→ 验证代码在 Docker 环境能跑通
2. 再做 **场景1**（小组内部部署）→ 让团队成员能访问
3. 未来需要时再升级到 **场景3**（正式上线）

---

## 第三部分：小组内部部署（推荐入门）

### 3.1 为什么推荐这个方案？

- ✅ **零学习成本**：不需要研究域名、DNS、SSL 证书
- ✅ **快速上线**：1小时内让团队所有人都能访问
- ✅ **GitHub OAuth 友好**：完美支持 IP 地址作为回调 URL
- ✅ **成本低**：只需云服务器，学生机 ~10元/月

### 3.2 架构图

```
小组成员A的电脑（浏览器）     小组成员B的手机（浏览器）
        ↓                              ↓
  http://123.45.67.89:5173  ←── 统一入口（云服务器IP）
        ↓
腾讯云服务器（123.45.67.89）
├── Docker 容器: rg_frontend（端口 5173）
│   └── Nginx 反向代理
│       └── /api → 转发给后端容器
├── Docker 容器: rg_backend（端口 3000）
├── Docker 容器: rg_db（MySQL）
└── Docker 容器: rg_redis
```

### 3.3 详细配置步骤

#### 步骤1：购买腾讯云轻量应用服务器

**推荐配置**：
- **系统**：Ubuntu 22.04 LTS
- **规格**：2核4G（足够运行 Docker + MySQL）
- **防火墙**：放行端口 `22` (SSH), `3000` (后端), `5173` (前端)

**学生优惠**：腾讯云/阿里云学生机约 10元/月

#### 步骤2：配置 GitHub OAuth（支持 IP 地址）

**假设您的云服务器 IP 是 `123.45.67.89`**

1. 登录 GitHub → Settings → Developer settings → OAuth Apps
2. 点击 "New OAuth App"
3. 填写信息：
   ```
   Application name: RG Vocabulary (测试版)
   Homepage URL: http://123.45.67.89:5173
   Authorization callback URL: http://123.45.67.89:5173/oauth/callback
   ```
4. 创建后获取 `Client ID` 和 `Client Secret`

#### 步骤3：更新配置文件

**后端 `.env`**（在 `backend/.env`）：
```env
# 修改这两项
FRONTEND_URL=http://123.45.67.89:5173
GITHUB_CLIENT_ID=你的ClientID
GITHUB_CLIENT_SECRET=你的ClientSecret

# 其他配置保持不变
DATABASE_URL=mysql://root:password@db:3306/rg_vocabulary
```

**前端 `.env`**（在 `frontend_v3/.env`）：
```env
VITE_API_BASE_URL=http://123.45.67.89:3000/api
VITE_GITHUB_CLIENT_ID=你的ClientID
```

#### 步骤4：部署到云服务器

**SSH 登录服务器**：
```bash
ssh root@123.45.67.89
```

**安装 Docker 和 Docker Compose**（Ubuntu）：
```bash
# 安装 Docker
curl -fsSL https://get.docker.com | sh

# 启动 Docker 服务
systemctl start docker
systemctl enable docker

# 验证安装
docker --version
```

**上传代码**：
```bash
# 方法1：直接 git clone
git clone https://github.com/RuanGong-Group/RG_project.git
cd RG_project

# 方法2：本地打包上传（如果有敏感配置）
# 在本地执行：scp -r ./RG_project root@123.45.67.89:/root/
```

**启动服务**：
```bash
cd RG_project

# 创建数据目录
mkdir -p RG_data/videos/daily RG_data/audio RG_data/images

# 启动所有容器
docker-compose up -d

# 等待约30秒让数据库初始化
sleep 30

# 初始化数据库
docker exec rg_backend npx prisma migrate deploy
docker exec rg_backend npx prisma db seed

# 查看日志
docker logs -f rg_backend
```

#### 步骤5：通知小组成员

在群里发消息：
```
📢 背单词系统已上线！
🔗 访问地址：http://123.45.67.89:5173
👤 使用 GitHub 账号登录即可
```

### 3.4 常见问题

**Q: 浏览器提示"不安全的连接"？**  
A: 正常现象，因为使用 HTTP（而非 HTTPS）。点击"继续访问"即可。小组内部使用无安全问题。

**Q: 无法访问 5173 端口？**  
A: 检查云服务器防火墙是否放行该端口。腾讯云在"防火墙"页面添加规则。

**Q: GitHub OAuth 跳转后显示错误？**  
A: 确认回调 URL 配置正确，必须与 `.env` 中的 `FRONTEND_URL` 一致。

---

## 第四部分：本地 Docker 测试

### 4.1 为什么先本地测试？

在部署到云服务器前，先在本地用 Docker 跑一遍：
- ✅ 提前发现 Docker 环境的兼容性问题
- ✅ 节省云服务器成本（不用反复部署调试）
- ✅ 云端部署时基本零意外

### 4.2 本地 Docker 启动步骤

**前提条件**：
- 已安装 Docker Desktop（Windows/Mac）
- 本地有完整代码（git clone 下来的）

**步骤**：
```bash
# 1. 进入项目目录
cd d:\桌面\RG_project\RG_project

# 2. 确保数据目录存在
mkdir RG_data\videos\daily
mkdir RG_data\videos\temp
mkdir RG_data\audio
mkdir RG_data\images

# 3. 启动 Docker 服务
docker-compose up --build

# 4. 等待启动完成（看到 "Server running on port 3000"）

# 5. 新开终端，初始化数据库
docker exec rg_backend npx prisma migrate deploy
docker exec rg_backend npx prisma db seed

# 6. 浏览器访问
# 前端：http://localhost:5173
# 后端 API：http://localhost:3000/api
```

**测试清单**：
- [ ] 能否正常访问前端页面
- [ ] 能否注册/登录（GitHub OAuth 或普通注册）
- [ ] 能否选择词书
- [ ] 能否开始学习会话（三路径模型）
- [ ] 能否生成视频（检查 `RG_data/videos/` 目录）

**如果出错**：
```bash
# 查看后端日志
docker logs rg_backend

# 查看数据库日志
docker logs rg_db

# 停止所有容器
docker-compose down

# 清理重来
docker-compose down -v  # -v 会删除数据库数据，慎用
```

---

## 第五部分：开发流程与协作

### 5.1 日常开发流程（本地 + 云端）

```
本地机（Windows）             GitHub                云服务器（生产环境）
     ↓                          ↓                         ↓
1. 写代码（npm run dev）                            运行 Docker 容器
     ↓                                               
2. git add & commit                                  
     ↓                                               
3. git push origin feature/xxx    
     ↓                          ↓
4. 创建 Pull Request  →   合并到 dev 分支
                               ↓
                          项目负责人审核
                               ↓
                          合并通过
                                                       ↓
                                                  5. SSH 登录服务器
                                                       ↓
                                                  6. git pull origin dev
                                                       ↓
                                                  7. docker-compose down
                                                       ↓
                                                  8. docker-compose up --build -d
                                                       ↓
                                                  9. 通知小组成员测试
```

### 5.2 推荐的分支策略

```
main (稳定版，标记版本号)
  ↑
dev (开发分支，日常合并到这里)
  ↑
  ├── feature/add-word-collection (功能分支)
  ├── feature/video-optimization (功能分支)
  └── bugfix/login-error (修复分支)
```

### 5.3 本地开发最佳实践

**日常开发（不用 Docker）**：
```bash
# 终端1：启动后端
cd backend
npm install  # 首次运行
npm run dev  # 热重载开发模式

# 终端2：启动前端
cd frontend_v3
npm install  # 首次运行
npm run dev  # 热重载开发模式
```

**为什么不用 Docker 开发？**
- ✅ 热重载快：改代码立刻生效，无需重启
- ✅ 调试方便：可以直接打断点、看日志
- ✅ 资源占用少：Docker 会消耗额外内存

**何时使用 Docker？**
- 🔸 提交代码前：本地 Docker 测试，确保容器环境没问题
- 🔸 生产部署：云服务器上必须用 Docker

### 5.4 部署到云服务器的完整命令

```bash
# SSH 登录
ssh root@你的服务器IP

# 进入项目目录
cd /root/RG_project

# 拉取最新代码（从 GitHub）
git pull origin dev

# 停止旧容器
docker-compose down

# 重新构建并启动（会自动包含新代码）
docker-compose up --build -d

# 查看启动日志
docker logs -f rg_backend

# 确认所有容器运行正常
docker ps
```

**注意事项**：
- ❌ **不要在容器内 git pull**：容器文件是临时的，重启会丢失
- ✅ **在宿主机（云服务器）上 pull**：然后重新构建容器

---

## 第六部分：Docker 核心概念与开发流程详解

### 6.1 镜像 vs 容器：最重要的概念

#### 什么是镜像 (Image)？
**镜像 = 蛋糕模具 / 游戏安装包 / 软件的"配方"**

```
镜像的特点：
✅ 只读的（Read-Only）：一旦构建完成，内容不会变
✅ 可复用的：一个镜像可以启动多个容器
✅ 分层的：每个 Dockerfile 指令都是一层
✅ 可版本化的：可以打标签（tag）如 v1.0, v2.0
```

**查看你的镜像：**
```bash
docker images

# 输出：
rg_project-backend    latest    219babe7dd58   2.36GB  ← 这是镜像
rg_project-frontend   latest    2be3e5a46bb9   54.1MB  ← 这也是镜像
```

#### 什么是容器 (Container)？
**容器 = 用模具做出的蛋糕 / 正在运行的游戏 / 软件的"实例"**

```
容器的特点：
✅ 可读写的：运行时会产生数据（日志、临时文件）
✅ 隔离的：每个容器有独立的文件系统、网络、进程
✅ 临时的：删除容器后，内部修改会丢失（除非挂载 Volume）
✅ 轻量的：多个容器共享同一个镜像，节省空间
```

**查看你的容器：**
```bash
docker ps

# 输出：
rg_backend    rg_project-backend    运行中  ← 这是容器
rg_frontend   rg_project-frontend   运行中  ← 这也是容器
```

#### 两者关系：
```
镜像 (Image)                    容器 (Container)
    ↓ docker run                     ↓
[只读模板]  ──────────────────→  [运行实例]
 2.36 GB                            2.36 GB + 运行数据
 
类比：
Word 软件安装包                  正在写的文档
蛋糕模具                        做出来的蛋糕
游戏安装包 (3GB)                 正在玩的游戏进程
```

---

### 6.2 完整的开发-部署工作流

#### 🔄 **流程图：从开发到生产**

```
┌──────────────────────────────────────────────────────┐
│  阶段 1: 本地开发（不用 Docker，效率最高）            │
└──────────────────────────────────────────────────────┘
你的电脑 (Windows)
├── 📝 写代码: backend/src/controllers/新功能.ts
├── 🔥 热重载开发: npm run dev
│   └── 改代码 → 自动重启 → 立刻看效果
└── ✅ 功能测试通过

        ↓ (提交代码前，先本地 Docker 测试)

┌──────────────────────────────────────────────────────┐
│  阶段 2: 本地 Docker 测试（确保容器环境没问题）       │
└──────────────────────────────────────────────────────┘
你的电脑 (Windows)
├── 📦 构建镜像: docker compose build
│   └── 读取 Dockerfile → 打包代码 → 生成镜像
│   └── rg_project-backend:latest (2.36GB)
├── 🚀 启动容器: docker compose up -d
│   └── 用镜像创建容器 → rg_backend (运行中)
├── 🧪 测试功能: 访问 http://localhost:5173
└── ✅ Docker 环境测试通过

        ↓ (只推送代码，不推送镜像)

┌──────────────────────────────────────────────────────┐
│  阶段 3: 提交到 GitHub                                │
└──────────────────────────────────────────────────────┘
git add .
git commit -m "feat: 新增视频生成功能"
git push origin dev

⚠️ 注意：只推送源代码（几 MB），不推送镜像（2.36GB）
GitHub 仓库只存储：
  - 代码文件 (.ts, .tsx, .py)
  - 配置文件 (Dockerfile, docker-compose.yml)
  - 不存储镜像！

        ↓ (云服务器拉取代码)

┌──────────────────────────────────────────────────────┐
│  阶段 4: 云服务器部署                                 │
└──────────────────────────────────────────────────────┘
腾讯云服务器 (Ubuntu 22.04)
├── 🔑 SSH 登录: ssh root@123.45.67.89
├── 📥 拉取代码: git pull origin dev
├── 📦 构建镜像: docker compose build
│   └── 云服务器读取 Dockerfile
│   └── 在云端重新构建镜像（不用下载本地镜像）
├── 🚀 启动容器: docker compose up -d
│   └── 用新镜像启动容器
│   └── 用户可以访问 http://123.45.67.89:5173
└── ✅ 部署完成
```

---

### 6.3 关键问题解答

#### ❓ **问题 1: 每次改代码都要重新构建镜像吗？**

**答案：不是！分场景使用。**

| 场景 | 是否用 Docker | 是否构建镜像 | 效率 |
|------|--------------|-------------|------|
| **日常开发调试** | ❌ 不用 | ❌ 不构建 | ⚡ 极快（热重载） |
| **提交代码前测试** | ✅ 用 Docker | ✅ 构建一次 | 🐢 慢（5-10分钟） |
| **云服务器部署** | ✅ 用 Docker | ✅ 构建一次 | 🐢 慢（5-10分钟） |

**推荐工作流：**
```bash
# 每天写代码（90% 的时间）
npm run dev  # 不用 Docker，改代码立刻生效

# 提交代码前（偶尔一次）
docker compose up --build  # 确保 Docker 环境能跑

# 部署到云服务器（周期性）
ssh 服务器 && git pull && docker compose up --build -d
```

#### ❓ **问题 2: 镜像是推送到 GitHub 还是自己构建？**

**答案：镜像不推送，每个环境自己构建！**

```
❌ 错误理解：
  本地构建镜像 → push 镜像到 Docker Hub → 云服务器 pull 镜像

✅ 正确流程：
  本地构建镜像（仅供本地测试）
      ↓
  push 源代码到 GitHub（只有代码）
      ↓
  云服务器 pull 代码 → 云服务器自己构建镜像
```

**为什么不推送镜像？**
- 镜像太大：backend 镜像 2.36GB，上传/下载很慢
- 源代码很小：整个项目才 10-20 MB
- 环境差异：云服务器可能需要不同配置

**例外情况（高级用法）：**
如果你有 Docker Hub 账号，可以这样：
```bash
# 本地构建并推送镜像到 Docker Hub（可选）
docker build -t yourusername/rg-backend:v1.0 ./backend
docker push yourusername/rg-backend:v1.0

# 云服务器直接拉取镜像（跳过构建步骤）
docker pull yourusername/rg-backend:v1.0
```

但对于课程项目，直接在云服务器构建更简单。

#### ❓ **问题 3: 重复构建镜像会浪费磁盘空间吗？**

**答案：会占用空间，但可以定期清理。**

**查看磁盘占用：**
```bash
docker system df

# 输出示例：
TYPE            TOTAL     ACTIVE    SIZE
Images          5         4         3.5GB   ← 镜像占用
Containers      4         4         100MB   ← 容器占用
Volumes         2         2         50MB    ← 数据卷占用
```

**清理无用镜像：**
```bash
# 删除所有未使用的镜像（<none> 标签的）
docker image prune

# 删除所有停止的容器
docker container prune

# 一键清理所有无用资源
docker system prune -a
```

**Docker 的智能缓存机制：**
```dockerfile
# Dockerfile 构建是分层的
COPY package.json ./        ← 第1层（很少变化）
RUN npm install             ← 第2层（只在依赖变化时重新执行）
COPY . .                    ← 第3层（代码变化时才重新复制）
RUN npm run build           ← 第4层（代码变化时才重新编译）
```

如果你只改了代码文件，前两层（依赖安装）会使用缓存，构建速度很快！

---

### 6.4 实际操作示例：模拟开发新功能

假设你要开发一个"单词收藏"功能：

```bash
# ──────────── 第 1 天：开发功能 ────────────
# 在本地用 npm run dev 开发，不用 Docker
cd backend
npm run dev  # 后端热重载

# 修改代码：src/controllers/word.controller.ts
# 测试：访问 http://localhost:3000/api/words/favorite
# ✅ 功能正常

# ──────────── 第 2 天：提交代码前测试 ────────────
# 确保 Docker 环境也能跑
docker compose down
docker compose up --build  # 构建新镜像 + 启动容器
# ✅ Docker 测试通过

git add .
git commit -m "feat: 新增单词收藏功能"
git push origin dev

# ──────────── 第 3 天：部署到云服务器 ────────────
ssh root@123.45.67.89

cd /root/RG_project
git pull origin dev              # 拉取最新代码
docker compose down              # 停止旧容器
docker compose up --build -d     # 构建新镜像 + 启动新容器

# ✅ 用户现在可以使用新功能了！
```

---

### 6.5 Docker 开发最佳实践总结

| 原则 | 说明 | 命令 |
|------|------|------|
| **开发用热重载** | 日常写代码不用 Docker | `npm run dev` |
| **测试用 Docker** | 提交前用 Docker 验证 | `docker compose up --build` |
| **部署用 Docker** | 云服务器必须用 Docker | `docker compose up -d` |
| **代码推 GitHub** | 只推送源代码，不推镜像 | `git push origin dev` |
| **云端自己构建** | 云服务器拉代码后构建镜像 | `docker compose build` |
| **定期清理镜像** | 避免磁盘空间被占满 | `docker system prune -a` |

### 6.6 其他常见问题

#### ❓ **问题 4: Redis 是干什么的？**

**答案：Redis 是内存数据库，用于缓存和会话管理。**

**在本项目中的作用：**
```typescript
// 示例：用户登录后，JWT Token 的黑名单存储
redis.set('blacklist:token123', 'true', 'EX', 3600)  // 1小时后过期

// 示例：缓存热门单词列表（避免频繁查数据库）
redis.set('hot_words', JSON.stringify(words), 'EX', 300)  // 5分钟缓存
```

**为什么需要 Redis？**
| 场景 | 没有 Redis | 有 Redis |
|------|-----------|----------|
| 用户登录验证 | 每次都查数据库 | 查内存（快 100 倍） |
| 热门单词列表 | 每次查询耗时 200ms | 从缓存读取 < 1ms |
| 用户在线状态 | 需要写数据库 | 写内存，定期同步 |

**Redis vs MySQL：**
```
MySQL (数据库)
  - 存储持久化数据（用户、单词、学习记录）
  - 数据写入磁盘，断电不丢失
  - 查询较慢（毫秒级）

Redis (缓存)
  - 存储临时数据（会话、缓存、排行榜）
  - 数据存在内存，断电会丢失（但可配置持久化）
  - 查询极快（微秒级）
```

**在 docker-compose.yml 中的配置：**
```yaml
redis:
  image: redis:alpine
  ports:
    - "6379:6379"
  volumes:
    - redis_data:/data  # 持久化存储
```

**如何查看 Redis 数据：**
```bash
# 进入 Redis 容器
docker exec -it rg_redis redis-cli

# 查看所有键
KEYS *

# 查看某个键的值
GET hot_words

# 退出
exit
```

---

#### ❓ **问题 5: 如何导入真正的单词数据？**

**答案：你的项目已经有导入脚本了！位于 `backend/scripts/`。**

**方法 1：使用现有的导入脚本**

```bash
# 1. 进入后端目录
cd backend

# 2. 导入四级单词（从 ECDICT）
npm run import-vocabulary -- --book cet4 --source ../RG_data_sources/processed/cet4-full.json

# 3. 导入六级单词
npm run import-vocabulary -- --book cet6 --source ../RG_data_sources/processed/cet6-full.json

# 4. 导入托福单词
npm run import-vocabulary -- --book toefl --source ../RG_data_sources/processed/toefl-full.json
```

**方法 2：在 Docker 容器中导入**

```bash
# 确保容器有数据源文件（通过 volume 挂载）
docker exec rg_backend npm run import-vocabulary -- --book cet4 --source /app/../RG_data_sources/processed/cet4-full.json

# 查看导入结果
docker exec rg_db mysql -uroot -ppassword -e "USE rg_vocabulary; SELECT COUNT(*) FROM words;"
```

**方法 3：直接导入 SQL 文件（最快）**

如果你有完整的数据库备份文件：
```bash
# 从本地 MySQL 导出数据
mysqldump -uvocab_user -pvocab_user_password vocabulary_db words meanings > words_backup.sql

# 导入到 Docker 容器数据库
docker exec -i rg_db mysql -uroot -ppassword rg_vocabulary < words_backup.sql
```

**验证数据导入：**
```bash
# 查看单词总数
docker exec rg_db mysql -uroot -ppassword -e "
  USE rg_vocabulary;
  SELECT 
    (SELECT COUNT(*) FROM words) as 单词数,
    (SELECT COUNT(*) FROM meanings) as 词义数,
    (SELECT COUNT(*) FROM example_pool) as 例句数;
"
```

**数据源说明：**
```
RG_data_sources/
├── ECDICT-master/
│   └── ecdict.csv              ← 原始词典数据（50万词条）
├── processed/
│   ├── cet4-full.json          ← 四级核心词汇（2500词）
│   ├── cet6-full.json          ← 六级核心词汇（2000词）
│   ├── toefl-full.json         ← 托福核心词汇（3000词）
│   └── ielts-full.json         ← 雅思核心词汇（3000词）
└── raw/corpus/                 ← 真题例句
```

---

#### ❓ **问题 6: 如何判断命令是在本地还是容器中执行？**

**答案：看命令前缀！**

**识别规则：**

| 命令形式 | 执行环境 | 示例 |
|---------|---------|------|
| `docker exec 容器名 命令` | **容器内部** | `docker exec rg_backend npm run dev` |
| `docker logs 容器名` | **本地查看容器输出** | `docker logs rg_backend` |
| `docker ps` | **本地查看容器状态** | `docker ps -a` |
| `curl http://localhost:4000` | **本地访问容器端口** | `curl http://localhost:4000/api/health` |
| 普通命令 | **本地 PowerShell** | `npm run dev` |

**详细示例：**

```powershell
# ═══════════════════════════════════════════════════
#  本地环境执行（PowerShell / CMD）
# ═══════════════════════════════════════════════════

# 查看本地文件
ls backend/src/

# 查看本地进程
Get-Process | Where-Object {$_.Name -like "*node*"}

# 启动本地开发服务器
cd backend
npm run dev  # 直接在本地运行，不通过 Docker

# 访问本地服务（通过宿主机网络）
curl http://localhost:3000/api/health


# ═══════════════════════════════════════════════════
#  容器内部执行（通过 docker exec）
# ═══════════════════════════════════════════════════

# 在容器内查看文件
docker exec rg_backend ls /app/src/

# 在容器内查看进程
docker exec rg_backend ps aux

# 在容器内运行 Node 命令
docker exec rg_backend node -v

# 在容器内运行数据库迁移
docker exec rg_backend npx prisma migrate deploy

# 进入容器的交互式终端（可以执行多个命令）
docker exec -it rg_backend bash
# 现在你在容器内部，命令提示符变成 root@容器ID:/app#
ls -la
npm run dev
exit  # 退出容器


# ═══════════════════════════════════════════════════
#  本地 → 容器 交互（本地发起，影响容器）
# ═══════════════════════════════════════════════════

# 查看容器日志（本地执行，查看容器输出）
docker logs rg_backend

# 查看容器资源使用（本地执行，监控容器）
docker stats rg_backend

# 重启容器（本地执行，影响容器）
docker restart rg_backend

# 停止容器（本地执行，影响容器）
docker stop rg_backend
```

**特殊情况：端口映射**

```
你的电脑 (Windows)                Docker 容器
localhost:4000  ←映射←  rg_backend:3000
localhost:5173  ←映射←  rg_frontend:80
localhost:3306  ←映射←  rg_db:3306

# 访问 http://localhost:4000
# 实际是访问容器内的 3000 端口
# 但命令在本地执行：
curl http://localhost:4000/api/health  # 本地命令，访问容器服务
```

**判断技巧：**
```bash
# 如果看到 "docker exec"，就是容器内执行
docker exec rg_backend npm run dev  # ✅ 容器内

# 如果没有 "docker"，就是本地执行
npm run dev  # ✅ 本地

# 如果看到 "docker logs/ps/stop"，是本地管理容器
docker logs rg_backend  # ✅ 本地查看容器日志
```

**实战示例：对比执行环境**

```powershell
# 场景：查看 Node 版本

# 方式 1：查看本地 Node 版本
node -v
# 输出：v18.17.0（你本地安装的版本）

# 方式 2：查看容器内 Node 版本
docker exec rg_backend node -v
# 输出：v18.19.0（Docker 镜像里的版本）

# 结论：两个环境可能版本不同，这就是为什么要用 Docker 统一环境
```

---

## 第七部分：硬编码问题与解决方案

### 7.1 什么是硬编码？为什么是问题？

**硬编码示例**：
```typescript
const API_BASE_URL = 'http://localhost:3000/api';  // ❌ 硬编码
```

**问题**：
- 本地开发：✅ 能用（后端在 localhost:3000）
- Docker 部署：❌ 不能用（容器内 localhost 指向自己）
- 云端部署：❌ 不能用（需要改成域名或 IP）

### 7.2 解决方案：环境变量 + 相对路径

#### 方案A：环境变量（推荐用于绝对路径场景）

**前端代码**：
```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
```

**本地开发 `.env`**：
```env
VITE_API_BASE_URL=http://localhost:3000/api
```

**云端部署 `.env`**：
```env
VITE_API_BASE_URL=http://123.45.67.89:3000/api
```

**原理**：Vite 在编译时会把 `import.meta.env.VITE_API_BASE_URL` 替换成配置值。

---

#### 方案B：相对路径 + 反向代理（最优雅）

**前端代码**：
```typescript
const API_BASE_URL = '/api';  // 相对路径
```

**本地开发（Vite Proxy）**：
```typescript
// vite.config.ts
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true
    }
  }
}
```

**生产环境（Nginx）**：
```nginx
# frontend_v3/nginx.conf
location /api {
    proxy_pass http://rg_backend:3000;  # Docker 内部网络
}
```

**工作流程**：
1. 浏览器请求 `/api/auth/login`
2. Nginx/Vite 拦截 `/api` 请求
3. 转发给后端服务器
4. 返回结果给浏览器

**优势**：
- ✅ 代码完全不需要修改
- ✅ 本地、Docker、云端统一用相对路径
- ✅ 网络层（Proxy）负责路由，代码层不关心后端在哪

### 7.3 本项目已修复的硬编码

| 文件 | 原硬编码 | 修复后 |
|------|---------|--------|
| `Settings.tsx` | `http://localhost:3000/api` | `import.meta.env.VITE_API_BASE_URL \|\| '/api'` |
| `OAuthCallback.tsx` | `http://localhost:3000/api` | `import.meta.env.VITE_API_BASE_URL \|\| '/api'` |
| `VideoPlayerPage.tsx` | `http://localhost:3000/api` | `import.meta.env.VITE_API_BASE_URL \|\| '/api'` |
| `video.service.ts` | Windows 路径 `Scripts/python.exe` | 跨平台检测 `Scripts/python.exe` \|\| `bin/python` |

### 7.4 环境配置最佳实践

**`.env` 文件规则**：
- `.env`：实际配置（包含密钥），**不提交到 Git**
- `.env.example`：模板文件（不含真实密钥），提交到 Git

**团队协作流程**：
1. 新成员 clone 代码
2. 复制 `.env.example` → `.env`
3. 填入自己的 API Key（如 GitHub OAuth）
4. 开始开发

**示例 `.env.example`**：
```env
# 后端配置
PORT=3000
DATABASE_URL=mysql://user:password@localhost:3306/db_name

# GitHub OAuth（需要自己申请）
GITHUB_CLIENT_ID=your_client_id_here
GITHUB_CLIENT_SECRET=your_client_secret_here

# 腾讯云 COS（需要自己申请）
COS_SECRET_ID=your_secret_id
COS_SECRET_KEY=your_secret_key
```

---

## 附录：快速命令参考

### Docker 常用命令

```bash
# 启动所有服务
docker-compose up -d

# 查看运行中的容器
docker ps

# 查看某个容器日志
docker logs -f rg_backend

# 进入容器内部（调试用）
docker exec -it rg_backend bash

# 停止所有服务
docker-compose down

# 停止并删除所有数据（包括数据库）
docker-compose down -v

# 重新构建镜像
docker-compose build --no-cache
```

### Git 常用命令

```bash
# 更新本地 dev 分支
git checkout dev
git pull origin dev

# 创建新功能分支
git checkout -b feature/new-feature

# 提交代码
git add .
git commit -m "feat: 添加新功能"
git push origin feature/new-feature

# 合并分支（在 GitHub 上操作更安全）
# 或本地操作：
git checkout dev
git merge feature/new-feature
git push origin dev
```

---

## 总结

本文档涵盖了从本地开发到云端部署的完整流程。推荐路线：

1. **阶段1**：本地 `npm run dev` 开发，熟悉业务逻辑
2. **阶段2**：本地 Docker 测试，验证容器环境
3. **阶段3**：云端 Docker 部署，小组内部使用（IP + GitHub OAuth）
4. **阶段4**（可选）：购买域名 + 配置 HTTPS，正式对外服务

**核心原则**：
- 代码一次编写，配置灵活切换
- 避免硬编码，善用环境变量和相对路径
- 本地开发用热重载，生产部署用 Docker
    *   更新数据库 `UserLearningProgress` 表。
6.  **前端**: 切换到下一张卡片。

---

### 附录：资源获取

*   **SimHei 字体 (中易黑体)**:
    *   **来源**: Windows 系统自带。
    *   **路径**: `C:\Windows\Fonts\simhei.ttf`。
    *   **操作**: 复制该文件到项目目录 `backend/assets/fonts/`。
    *   **注意**: 该字体仅供个人学习使用，商业发布建议替换为开源字体（如 Noto Sans SC 或 思源黑体）。
