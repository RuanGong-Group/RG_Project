# 语境记忆项目环境配置指南

**版本**: 1.1
**日期**: 2025年12月3日

---

## 1. 概述

本文档旨在指导"语境记忆"项目的开发者快速、顺利地搭建本地开发环境。项目采用前后端分离架构，后端使用 Node.js + Express + Prisma，前端使用 React + Vite。

遵循本指南，你将能够完成从代码拉取到本地成功运行的全过程。

**⚠️ 重要提醒**：本项目需要两个部分的数据：
1. **代码仓库**（通过 Git 克隆）
2. **数据源文件夹** `RG_data_sources`（通过团队共享网盘获取）

---

## 2. 环境要求

请确保你的开发设备满足以下要求：

- **操作系统**: Windows 10/11, macOS, 或 Linux 发行版。
- **硬件资源**: 建议至少 8GB 内存。
- **必需软件**:
    - **Node.js**: `v18.0.0` 或更高版本 (推荐 `v20.x` LTS)。
    - **npm**: `v9.x` 或更高版本 (通常随 Node.js 一起安装)。
    - **Git**: 最新版本。
    - **数据库**: MySQL `8.0` 或更高版本。
- **可选软件** (用于 AI 视频生成功能):
    - **Python**: `v3.10` 或更高版本。

---

## 2.1 目录结构说明

为了避免 Git 仓库膨胀，我们将生成的视频、音频等大文件存储在本地数据目录中（被 `.gitignore` 忽略）。

```
RG_project/
├── RG_project/              # 代码仓库 (Git Root)
│   ├── backend/             # 后端代码
│   │   ├── config/          # 配置文件
│   │   ├── scripts/         # 工具脚本
│   │   └── src/             # 源代码
│   ├── frontend_v3/         # 前端代码
│   └── RG_data/             # [自动创建] 本地数据目录 (被 .gitignore 忽略)
│       ├── videos/          # 生成的视频文件
│       ├── audio/           # 生成的音频文件
│       └── images/          # 生成的图片文件
└── ...
```

---

## 3. 安装与配置步骤

### 3.1 依赖安装

1.  **安装 Node.js**:
    - 访问 [Node.js 官网](https://nodejs.org/)，下载并安装 `20.x` LTS 版本。
    - 安装完成后，在终端运行 `node -v` 和 `npm -v` 验证是否成功。

2.  **安装 MySQL**:
    - 访问 [MySQL Community Server 官网](https://dev.mysql.com/downloads/mysql/)，下载并安装 `8.0` 版本。
    - **重要**: 安装过程中请务必记下你设置的 `root` 用户密码。
    - 建议安装 MySQL Workbench 或其他数据库可视化工具，方便管理。

### 3.2 项目获取

#### 3.2.1 克隆代码仓库

使用 Git 克隆项目仓库到你的本地工作区：

```bash
git clone https://github.com/RuanGong-Group/RG_project.git
cd RG_project
```

#### 3.2.2 获取数据源文件夹（必需！）

**数据源文件夹** `RG_data_sources` 包含了项目运行所需的核心词库数据和数据库初始化文件，由于体积较大（约 XXX MB），没有包含在 Git 仓库中。

**获取方式**：
1. 从团队共享网盘下载 `RG_data_sources.zip` 压缩包
   - **网盘链接**：[由项目负责人在团队群中分享]
   - 文件包含：词库 JSON 文件、数据库初始化 SQL、原始语料等
2. 解压到与 `RG_project` **同级**的目录

**正确的目录结构**：
```
你的工作目录/
├── RG_project/              # 代码仓库（Git 克隆得到）
│   ├── backend/
│   ├── frontend_v3/
│   └── docs/
└── RG_data_sources/         # 数据源文件夹（网盘下载得到）
    ├── processed/           # 处理好的词库 JSON
    ├── raw/                 # 原始语料
    ├── ECDICT-master/       # 第三方词典
    └── initial_data.sql     # 数据库初始化文件
```

**⚠️ 为什么不放在 Git 里？**
- 数据文件体积大（几百 MB），会严重拖慢仓库克隆速度
- 数据可能频繁更新，但不需要版本控制
- 通过网盘共享更灵活，可以随时更新而不影响代码仓库

### 3.3 后端配置与初始化

1.  **进入后端目录并安装依赖**:
    ```bash
    cd backend
    npm install
    ```

2.  **配置环境变量**:
    - 在 `backend` 目录下，将 `.env.example` 文件复制一份并重命名为 `.env`。
    - 打开 `.env` 文件，根据以下说明配置各项参数：

    ```env
    # ========== 数据库配置 ==========
    # 将 YOUR_PASSWORD 替换为你的 MySQL root 用户密码
    DATABASE_URL="mysql://root:YOUR_PASSWORD@localhost:3306/vocabulary_db"
    
    # ========== JWT 配置 ==========
    # 开发环境可以保持默认，生产环境必须更改为强密码
    JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
    JWT_EXPIRES_IN=7d
    
    # ========== AI 服务配置（视频生成功能需要）==========
    # SiliconFlow API 密钥（用于文本生成）
    # 获取方式：访问 https://siliconflow.cn 注册并创建 API Key
    SILICONFLOW_API_KEY=your-siliconflow-api-key-here
    
    # 豆包图像生成 API 配置（火山引擎，必需）
    # 获取方式：访问火山引擎官网，开通豆包服务
4.  **导入核心数据（重要！）**:
    
    为了让项目能够正常运行，你需要导入基础的单词和例句数据。**数据文件位于 `RG_data_sources` 文件夹中**（确保你已从网盘下载）。
    
    **⚠️ 前置条件**：
    - ✅ 已从团队网盘下载 `RG_data_sources` 文件夹
    - ✅ `RG_data_sources` 文件夹与 `RG_project` 处于同级目录
    - ✅ 已完成上一步的数据库迁移（`npx prisma migrate dev`）
    
    **方法 A：使用图形化工具（推荐新手）**
    1.  打开 MySQL Workbench 或 Navicat 等数据库工具
    2.  连接到你的本地数据库
    3.  选择 `File` > `Open SQL Script...`（或类似选项）
    4.  导航到 `RG_data_sources` 文件夹，打开 `initial_data.sql` 文件
    5.  点击"执行"按钮（⚡闪电图标），等待导入完成（可能需要几分钟）
    
    **方法 B：使用命令行（推荐有经验的开发者）**
    ```bash
    # Windows PowerShell / CMD
    cd ..
    mysql -u root -p vocabulary_db < RG_data_sources\initial_data.sql
    
    # Mac / Linux
    cd ..
    mysql -u root -p vocabulary_db < RG_data_sources/initial_data.sql
    ```
    
    **验证导入成功**：
    - 执行 SQL 查询：`SELECT COUNT(*) FROM words;`
    - 应该看到数千条单词记录
    - 执行 SQL 查询：`SELECT COUNT(*) FROM word_books;`
    - 应该看到至少 1 本词书（如"四级核心词汇"）
    ```bash
    # 应用数据库迁移（创建所有表结构）
    npx prisma migrate dev
    
    # 生成 Prisma Client
    npx prisma generate
    ```

4.  **导入核心数据 (重要)**:
    
    为了让项目能够正常运行，你需要导入基础的单词和例句数据。这些数据通过项目负责人分享的 `.sql` 文件提供。
    
    **方法 A: 使用图形化工具 (推荐)**
    1.  打开 MySQL Workbench 或其他数据库工具。
    2.  连接到你的本地数据库。
    3.  选择 `File` > `Open SQL Script...`，打开分享的 `.sql` 文件 (例如 `initial_data.sql`)。
    4.  点击“执行”按钮 (通常是一个闪电图标)，等待脚本运行完毕。
    
    **方法 B: 使用命令行**
    1.  打开终端 (CMD, PowerShell)。
    2.  使用 `cd` 命令进入存放 `.sql` 文件的目录。
    3.  运行以下命令 (将 `initial_data.sql` 替换为实际文件名):
        ```bash
        mysql -u root -p vocabulary_db < initial_data.sql
        ```
    4.  根据提示输入你的 MySQL `root` 用户密码。

5.  **导入额外词书数据**（可选）:
    
    如果你想导入更多词书（如 CET-6、考研、托福等），可以运行以下脚本。
    
    **前置条件**：
    - ✅ 已完成第 4 步的基础数据导入
    - ✅ `RG_data_sources/processed/` 目录中包含词书 JSON 文件
    
    ```bash
    # 查看可用的词书列表
    ls ../RG_data_sources/processed/
    
    # 导入指定词书（示例：导入 CET-6）
    npx ts-node scripts/import-vocabulary.ts --book cet6
    ```
    
    **可用的词书**：
    - `cet4-full.json` - 大学英语四级核心词汇
    - `cet6-full.json` - 大学英语六级核心词汇
    - `kaoyan-full.json` - 考研英语核心词汇
    - `toefl-full.json` - 托福考试核心词汇
    - `ielts-full.json` - 雅思考试核心词汇
    - `gre-full.json` - GRE 考试核心词汇
    
    **详细使用方法**：请查看 `backend/scripts/README.md`

### 3.4 前端配置

1.  **进入前端目录并安装依赖**:
    ```bash
    # 如果你当前在 backend 目录，先返回上级
    cd .. 
    
    cd frontend_v3
    npm install
    ```

2.  **配置环境变量**:
    - 在 `frontend_v3` 目录下，将 `.env.example` 文件复制一份并重命名为 `.env`。
    - 文件内容通常无需修改，因为它指向了本地后端的默认地址。
      ```env
      VITE_API_BASE_URL=http://localhost:3000
      ```

### 3.5 视频生成功能配置（可选）

如果你需要使用 AI 视频生成功能，请完成以下额外配置：

1.  **安装 Python 依赖**:
    
    视频生成脚本位于 `backend/scripts/video_gen`。
    
    ```bash
    cd backend/scripts/video_gen
    
    # 创建 Python 虚拟环境
    python -m venv venv
    
    # 激活虚拟环境
    # Windows:
    venv\Scripts\activate
    # Mac/Linux:
    source venv/bin/activate
    
    # 安装依赖
    pip install -r requirements.txt
    ```

2.  **配置 AI API 密钥和可选服务**:
    
    在 `backend/.env` 文件中添加以下配置：
    
    ```env
    # SiliconFlow API 密钥 (用于 AI 生成)
    SILICONFLOW_API_KEY=your-api-key-here
    
    # Redis 配置（可选，不配置则自动使用内存存储）
    # REDIS_URL=redis://localhost:6379
## 5. 常见问题排查

### 基础环境问题

- **Q1: `npx prisma migrate dev` 执行失败，提示数据库连接错误。**
  - **A:**
    1.  请检查 `backend/.env` 文件中的 `DATABASE_URL` 是否完全正确（用户名、密码、端口号）。
    2.  确认你的 MySQL 服务是否已启动。
    3.  检查防火墙或安全软件是否阻止了 `3306` 端口的连接。

- **Q2: 前端页面可以打开，但登录/注册时提示网络错误。**
  - **A:**
    1.  确认后端服务是否已在 `3000` 端口正常运行。
    2.  打开浏览器的开发者工具（F12），查看网络（Network）选项卡，检查 API 请求是否失败，并根据错误信息排查。
    3.  检查 `frontend_v3/.env` 文件中的 `VITE_API_BASE_URL` 是否指向了正确的后端地址。

- **Q3: `npm install` 失败。**
  - **A:**
    1.  尝试清除 npm 缓存：`npm cache clean --force`。
    2.  检查你的网络连接，部分依赖包可能需要从国外服务器下载。
    3.  确保你的 Node.js 和 npm 版本符合要求。

### 视频生成功能问题

- **Q4: Python 虚拟环境安装失败。**
  - **A:**
    1.  确认 Python 版本是否为 3.10 或更高。
    2.  在 Windows 上，确保 Python 已添加到系统 PATH。
    3.  尝试使用 `py -m venv venv` 代替 `python -m venv venv`。

- **Q5: 视频生成时提示 API 错误。**
  - **A:**
    1.  检查 `.env` 文件中的 `SILICONFLOW_API_KEY` 是否正确。
    2.  确认 API 密钥是否有效且有足够的配额。
    3.  检查网络连接是否正常。

- **Q6: 找不到 `RG_data` 目录。**
  - **A:**
    1.  `RG_data` 目录会在首次生成视频时自动创建。
    2.  你也可以手动创建：`mkdir RG_project/RG_data`。
    3.  确保该目录在 `.gitignore` 中被正确忽略。

---

## 6. 数据传递与协作说明

### ✅ 需要通过 Git 同步的内容
- **代码**: 所有源代码文件。
- **数据库结构**: 通过 `prisma/schema.prisma` 同步。
- **配置模板**: `.env.example` 文件。

### ✅ 需要单独分享的内容（通过网盘）
- **数据源文件夹**: `RG_data_sources.zip` 压缩包，包含：
  - `processed/` - 处理好的词库 JSON 文件（cet4, cet6, 考研等）
  - `raw/corpus/` - 原始语料库（真题例句等）
  - `ECDICT-master/` - 第三方英汉词典数据
  - `initial_data.sql` - 数据库初始化 SQL 文件
- **网盘分享方式**：
  - 推荐使用百度网盘、阿里云盘等
  - 在团队群中分享链接和提取码
  - 定期检查链接有效性
- **API 密钥**: 
  - 通过加密聊天工具（如微信、钉钉）私发
  - **绝对不要**提交到 Git 仓库或公开分享

### ❌ 不要提交到 Git 的内容
- **生成的媒体文件**: 视频/音频/图片（在 `RG_data/` 中），体积大且可重新生成。
- **依赖目录**: `node_modules`、`dist`、Python `venv` 等。
- **敏感信息**: `.env` 文件（包含密码和 API 密钥）。
- **临时文件**: 各种缓存和临时文件。

---

## 7. 快速检查清单

在开始开发前，请确认以下所有项目：

**环境准备**：
- [ ] Node.js v18+ 已安装
- [ ] MySQL 8.0+ 已安装并运行
- [ ] Git 已安装
- [ ] （可选）Python 3.10+ 已安装

**项目获取**：
- [ ] 已克隆代码仓库 `RG_project`
- [ ] 已从网盘下载 `RG_data_sources` 文件夹
- [ ] `RG_data_sources` 与 `RG_project` 处于同级目录

**后端配置**：
- [ ] 已安装后端依赖 `npm install`
- [ ] 已配置 `.env` 文件（至少包含 `DATABASE_URL`）
- [ ] 已运行数据库迁移 `npx prisma migrate dev`
- [ ] 已导入初始数据 `initial_data.sql`
- [ ] 后端服务可以正常启动 `npm run dev`

**前端配置**：
- [ ] 已安装前端依赖 `npm install`
- [ ] 前端应用可以正常启动 `npm run dev`
- [ ] 可以打开浏览器访问 `http://localhost:5173`

**功能验证**：
- [ ] 可以成功注册新用户
- [ ] 可以成功登录
- [ ] 可以看到词书列表
- [ ] （可选）可以生成 AI 视频

---

**最后更新**: 2025年12月3日  
**维护者**: RG_project 团队  
**指南结束**prisma db push
    ```

5.  **测试视频生成**（可选）:
    
    确保 Python 虚拟环境已激活：
    
    ```bash
    cd backend/scripts/video_gen
    python generate_daily_video.py
    ```

---

## 4. 运行与验证

你需要**同时启动**后端服务和前端应用。

1.  **启动后端服务**:
    - 打开一个新的终端窗口。
    - 进入 `backend` 目录，运行开发服务器：
      ```bash
      cd path/to/RG_project/backend
      npm run dev
      ```
    - 当你看到类似 `🚀 Server is running on http://localhost:3000` 的输出时，表示后端已成功启动。

2.  **启动前端应用**:
    - 打开另一个新的终端窗口。
    - 进入 `frontend_v3` 目录，运行开发服务器：
      ```bash
      cd path/to/RG_project/frontend_v3
      npm run dev
      ```
    - 当你看到类似 `➜ Local: http://localhost:5173/` 的输出时，表示前端已成功启动。

3.  **验证**:
    - 在浏览器中打开 `http://localhost:5173`。
    - 你应该能看到项目的登录/注册页面。
    - 尝试注册一个新用户，然后登录。如果可以成功进入系统主页，说明整个环境已配置成功！

---

## 5. 常见问题排查

- **Q1: `npx prisma migrate dev` 执行失败，提示数据库连接错误。**
  - **A:**
    1.  请检查 `backend/.env` 文件中的 `DATABASE_URL` 是否完全正确（用户名、密码、端口号）。
    2.  确认你的 MySQL 服务是否已启动。
    3.  检查防火墙或安全软件是否阻止了 `3306` 端口的连接。

- **Q2: 前端页面可以打开，但登录/注册时提示网络错误。**
  - **A:**
    1.  确认后端服务是否已在 `3000` 端口正常运行。
    2.  打开浏览器的开发者工具（F12），查看网络（Network）选项卡，检查 API 请求是否失败，并根据错误信息排查。
    3.  检查 `frontend_v3/.env` 文件中的 `VITE_API_BASE_URL` 是否指向了正确的后端地址。

- **Q3: `npm install` 失败。**
  - **A:**
    1.  尝试清除 npm 缓存：`npm cache clean --force`。
    2.  检查你的网络连接，部分依赖包可能需要从国外服务器下载。
    3.  确保你的 Node.js 和 npm 版本符合要求。

---
**指南结束**
