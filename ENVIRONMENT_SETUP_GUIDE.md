# 语境记忆项目环境配置指南

**版本**: 1.0
**日期**: 2025年11月3日

---

## 1. 概述

本文档旨在指导“语境记忆”项目的开发者快速、顺利地搭建本地开发环境。项目采用前后端分离架构，后端使用 Node.js + Express + Prisma，前端使用 React + Vite。

遵循本指南，你将能够完成从代码拉取到本地成功运行的全过程。

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

使用 Git 克隆项目仓库到你的本地工作区：

```bash
git clone https://github.com/Xiecanquan/RG_project.git
cd RG_project
```

### 3.3 后端配置与初始化

1.  **进入后端目录并安装依赖**:
    ```bash
    cd backend
    npm install
    ```

2.  **配置环境变量**:
    - 在 `backend` 目录下，将 `.env.example` 文件复制一份并重命名为 `.env`。
    - 打开 `.env` 文件，修改 `DATABASE_URL` 为你的本地 MySQL 连接信息。
      ```env
      # 格式: mysql://USER:PASSWORD@HOST:PORT/DATABASE
      DATABASE_URL="mysql://root:YOUR_PASSWORD@localhost:3306/vocabulary_db"
      
      # JWT 密钥（请使用强密码）
      JWT_SECRET="your-super-secret-jwt-key-here"
      ```
    - **注意**: `vocabulary_db` 是数据库名，下一步 Prisma 会自动创建。

3.  **数据库初始化**:
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
    
    如果你想导入 CET-4 之外的其他词书（如 CET-6, 考研等），可以运行以下脚本。
    
    - **前置条件**: 确保已从项目负责人处获取 `RG_data_sources` 文件夹，并将其放置在与 `RG_project` 同级的目录中。
    
    ```bash
    # 导入测试词书（使用处理好的数据源）
    npx ts-node scripts/import-vocabulary.ts
    ```
    
    - **说明**: 
      - 词书的 `json` 数据文件位于 `../RG_data_sources/processed/` 目录。
      - 详细使用方法请查看 `backend/scripts/README.md`。

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

### ✅ 需要单独分享的内容
- **核心数据包**: 一个包含以下所有内容的 `.zip` 压缩文件：
  - **`RG_data_sources/` 文件夹**: 包含所有词库的原始 `json` 文件。
  - **`initial_data.sql` 文件**: 包含基础单词和例句的数据库快照。
- **API 密钥**: 通过安全渠道分享，不要提交到 Git。

### ❌ 不要提交到 Git 的内容
- **生成的媒体文件**: 视频/音频/图片（在 `RG_data/` 中），体积大且可重新生成。
- **依赖目录**: `node_modules`、`dist`、Python `venv` 等。
- **敏感信息**: `.env` 文件（包含密码和 API 密钥）。
- **临时文件**: 各种缓存和临时文件。

---

**最后更新**: 2025年11月30日  
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
