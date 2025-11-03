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
- **软件版本**:
    - **Node.js**: `v20.x` 或更高版本 (LTS)。
    - **npm**: `v9.x` 或更高版本 (通常随 Node.js 一起安装)。
    - **Git**: 最新版本。
    - **数据库**: MySQL `8.0` 或更高版本。

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
      # 示例: mysql://root:123456@localhost:3306/rg_project_db
      DATABASE_URL="mysql://root:YOUR_PASSWORD@localhost:3306/vocabulary_db"
      
      # 替换为你自己的复杂密钥
      JWT_SECRET="a-very-strong-and-secret-key-for-jwt"
      ```
    - **注意**: `vocabulary_db` 是我们推荐的数据库名，你无需手动创建它，下一步 Prisma 会自动完成。

3.  **数据库初始化**:
    - 在 `backend` 目录下，运行以下命令来创建数据库、生成数据表并填充初始数据：
      ```bash
      # 此命令会根据 prisma/schema.prisma 文件创建数据库和表结构
      npx prisma migrate dev --name init
      
      # 此命令会运行 prisma/seed.ts 脚本，填充词书、单词等初始数据
      npx prisma db seed
      ```
    - **关于种子脚本**:
      - `prisma/seed.ts` 中的数据是临时性测试数据，主要用于开发阶段验证功能（如单词、例句等）。
      - 如果需要共享数据源，建议团队搭建一个云数据库（如 AWS RDS 或 PlanetScale），以便所有成员使用统一的数据。
      - 当前的种子脚本仅在本地数据库中生效，无法通过 Git 同步到其他成员的数据库。

    - 执行成功后，你的数据库 `vocabulary_db` 就已准备就绪。

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
