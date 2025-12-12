# 云服务器从零配置指南

本文档提供从购买云服务器到完成部署的完整步骤。

---

## 第一步：购买腾讯云服务器

### 1.1 选择服务器类型

**推荐方案：轻量应用服务器 (Lighthouse)**
- 价格更便宜
- 配置更简单
- 学生优惠更多

**访问地址**：https://cloud.tencent.com/product/lighthouse

### 1.2 配置选择

| 配置项 | 推荐值 | 说明 |
|--------|--------|------|
| **地域** | 北京/上海/广州 | 选择离你最近的 |
| **镜像** | Ubuntu 22.04 LTS | 稳定且文档丰富 |
| **套餐** | 2核4G | 最低配置，足够运行项目 |
| **时长** | 1个月 | 先测试，后续可续费 |
| **价格** | 学生价 ~10元/月 | 需要学生认证 |

### 1.3 购买流程

```
1. 登录腾讯云 → 控制台
2. 产品 → 轻量应用服务器
3. 点击"新建"
4. 选择配置（按上表）
5. 设置服务器名称：rg-vocabulary-server
6. 设置密码（重要！记住这个密码）
7. 勾选"同意服务协议"
8. 点击"立即购买"
9. 支付
```

### 1.4 购买完成后

**记录以下信息**（非常重要）：
- ✅ 服务器公网 IP：`123.45.67.89`（示例，实际以控制台为准）
- ✅ 用户名：`ubuntu`（Ubuntu 系统）或 `root`（CentOS 系统）
- ✅ 密码：你设置的密码

---

## 第二步：配置防火墙

### 2.1 开放必要端口

在腾讯云控制台操作：

```
1. 进入轻量应用服务器控制台
2. 点击你的服务器名称
3. 左侧菜单 → 防火墙
4. 点击"添加规则"
```

**需要添加的规则**：

| 应用类型 | 协议 | 端口 | 来源 | 说明 |
|---------|------|------|------|------|
| 自定义 | TCP | 8080 | 0.0.0.0/0 | 前端访问端口 |
| 自定义 | TCP | 4000 | 0.0.0.0/0 | 后端 API 端口 |
| SSH | TCP | 22 | 0.0.0.0/0 | SSH 远程登录（默认已开放） |

**操作步骤**：
```
添加规则 → 选择"自定义" → 输入端口号 → 来源选择"所有" → 保存
```

---

## 第三步：SSH 连接到服务器

### 3.1 Windows 用户（推荐 PowerShell）

```powershell
# 打开 PowerShell
# 输入以下命令（将 IP 替换为你的实际 IP）
ssh ubuntu@123.45.67.89

# 首次连接会提示：
# Are you sure you want to continue connecting (yes/no)?
# 输入：yes

# 然后输入你设置的密码
```

### 3.2 连接成功的标志

你会看到类似这样的提示符：
```
ubuntu@rg-vocabulary-server:~$
```

---

## 第四步：安装 Docker

### 4.1 更新系统包

```bash
sudo apt update
sudo apt upgrade -y
```

### 4.2 安装 Docker

```bash
# 使用官方安装脚本
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 启动 Docker 服务
sudo systemctl start docker
sudo systemctl enable docker

# 验证安装
sudo docker --version
# 应该看到：Docker version 24.x.x
```

### 4.3 安装 Docker Compose

```bash
# 下载 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# 添加执行权限
sudo chmod +x /usr/local/bin/docker-compose

# 验证安装
docker-compose --version
# 应该看到：Docker Compose version v2.23.0
```

### 4.4 配置 Docker 权限（可选，但推荐）

```bash
# 将当前用户添加到 docker 组，避免每次都用 sudo
sudo usermod -aG docker $USER

# 重新登录使权限生效
exit
# 然后重新 ssh 连接

# 再次登录后，测试不用 sudo 能否运行 docker
docker ps
# 如果能正常运行，说明配置成功
```

---

## 第五步：部署项目

### 5.1 安装 Git

```bash
sudo apt install git -y

# 验证安装
git --version
```

### 5.2 克隆项目代码

```bash
# 进入 home 目录
cd ~

# 克隆代码（如果仓库是私有的，需要先配置 SSH 密钥）
git clone https://github.com/RuanGong-Group/RG_project.git

# 进入项目目录
cd RG_project
```

### 5.3 配置环境变量（可选）

```bash
# 如果需要自定义配置，复制示例文件
cp backend/.env.example backend/.env

# 编辑配置（可选）
nano backend/.env
# 按 Ctrl+X 退出，选择 Y 保存
```

### 5.4 启动服务

```bash
# 启动所有 Docker 容器
docker-compose up -d

# 查看启动日志
docker-compose logs -f

# 等待约 30 秒，看到以下信息说明启动成功：
# ✅ 数据库连接成功
# Server running on port 3000
```

### 5.5 初始化数据库

```bash
# 等容器完全启动后（约30秒），执行数据库迁移
docker exec rg_backend npx prisma migrate deploy

# 导入初始数据
docker exec rg_backend npx prisma db seed

# 验证数据导入
docker exec rg_db mysql -uroot -ppassword -D rg_vocabulary -e "SELECT COUNT(*) FROM words;"
# 应该看到有数据（如 5000+ 条）
```

---

## 第六步：验证部署

### 6.1 检查容器状态

```bash
docker ps

# 应该看到 4 个容器都在运行：
# - rg_backend
# - rg_frontend
# - rg_db
# - rg_redis
```

### 6.2 访问应用

**在浏览器中访问**：
- 前端：`http://你的服务器IP:8080`
- 后端 API：`http://你的服务器IP:4000/api`

**例如**：
```
http://123.45.67.89:8080
```

### 6.3 测试功能

1. 打开前端页面
2. 注册一个新账号
3. 登录
4. 选择词书
5. 开始学习
6. 完成一些单词
7. 尝试生成视频

---

## 第七步：功能测试清单

### 7.1 基础功能测试

- [ ] 用户注册/登录
- [ ] 选择词书（如 CET-4）
- [ ] 开始新学习会话
- [ ] 三路径学习（认识/模糊/不认识）
- [ ] 查看今日计划
- [ ] 开始复习会话

### 7.2 核心功能测试（V3.1 修复验证）

- [ ] **纯复习场景**：
  - 今日只做复习（不新学）
  - 尝试生成视频
  - 预期：能成功生成 ✅

- [ ] **混合学习场景**：
  - 新学 5 个 + 复习 10 个
  - 检查今日计划显示：15/10（已超目标）
  - 预期：阻止新学习，但允许继续复习 ✅

- [ ] **视频生成**：
  - 点击"生成今日学习视频"
  - 等待生成完成
  - 查看视频是否包含今日单词
  - 预期：视频正常播放 ✅

### 7.3 如果遇到问题

**查看日志**：
```bash
# 后端日志
docker logs -f rg_backend

# 数据库日志
docker logs -f rg_db

# 所有日志
docker-compose logs -f
```

**重启服务**：
```bash
docker-compose restart
```

**完全重启**：
```bash
docker-compose down
docker-compose up -d
```

---

## 第八步：清理测试数据

### 8.1 确认功能正常后

```bash
# 连接到数据库
docker exec -it rg_db mysql -uroot -ppassword -D rg_vocabulary

# 清理测试用户数据
DELETE FROM users WHERE id > 1;  -- 保留 id=1 的管理员账号
DELETE FROM daily_check_ins WHERE user_id > 1;
DELETE FROM user_learning_progress WHERE user_id > 1;
DELETE FROM video_generation_jobs WHERE user_id > 1;

# 退出数据库
exit;
```

### 8.2 清理临时文件

```bash
# 清理生成的视频和图片
docker exec rg_backend rm -rf /app/RG_data/videos/*
docker exec rg_backend rm -rf /app/RG_data/images/*
docker exec rg_backend rm -rf /app/RG_data/audio/*
```

---

## 第九步：Git 提交

### 9.1 在本地（开发机）提交代码

```powershell
# 回到本地开发机器
# 查看修改
git status

# 添加所有修改
git add .

# 提交
git commit -m "feat(v3.1): 优化每日目标计算和视频生成逻辑

- 每日目标计算包含新学习和复习总数
- 复习无上限，新学习受目标限制
- 视频生成支持纯复习场景
- 优化部署文档和需求文档
- 修复豆包 API watermark 参数问题"

# 推送到远程
git push origin dev

# 打版本标签
git tag v3.1.0
git push origin v3.1.0
```

### 9.2 云服务器拉取最新代码

```bash
# SSH 连接到云服务器
ssh ubuntu@你的服务器IP

# 进入项目目录
cd ~/RG_project

# 拉取最新代码
git pull origin dev

# 重启服务
docker-compose down
docker-compose up -d --build
```

---

## 常见问题排查

### Q1: SSH 连接超时

**可能原因**：
- 防火墙没有开放 22 端口
- 服务器 IP 地址错误

**解决方法**：
- 检查腾讯云控制台的防火墙规则
- 确认服务器 IP 地址正确

### Q2: Docker 启动失败

**可能原因**：
- 端口被占用
- 内存不足

**解决方法**：
```bash
# 查看端口占用
sudo netstat -tulpn | grep :8080

# 查看内存使用
free -h

# 清理 Docker 资源
docker system prune -a
```

### Q3: 前端无法访问

**可能原因**：
- 防火墙没有开放 8080 端口
- 容器没有启动

**解决方法**：
```bash
# 检查容器状态
docker ps | grep rg_frontend

# 查看前端日志
docker logs rg_frontend

# 重启前端
docker restart rg_frontend
```

### Q4: 视频生成失败

**可能原因**：
- Python 依赖缺失
- 豆包 API 密钥未配置

**解决方法**：
```bash
# 查看后端日志
docker logs -f rg_backend | grep -i video

# 进入容器检查
docker exec -it rg_backend bash
cd scripts/video_gen
python3 generate_daily_video.py
```

---

## 成本估算

| 项目 | 费用 | 备注 |
|------|------|------|
| 云服务器 | 10-30元/月 | 学生优惠价 |
| 域名（可选） | 15元/年 | .com 域名 |
| **总计** | **约 30元/月** | 不含域名 |

---

## 下一步计划

部署完成后，你可以：

1. **配置域名**（可选）
   - 购买域名
   - 配置 DNS 解析
   - 使用 Nginx + Let's Encrypt 配置 HTTPS

2. **配置 OAuth**
   - GitHub OAuth（支持 IP 地址回调）
   - 微信登录（需要域名和备案）

3. **配置对象存储**
   - 腾讯云 COS
   - 自动上传视频到 COS
   - 减少服务器存储压力

4. **监控和备份**
   - 配置自动备份数据库
   - 设置监控告警
   - 定期查看日志

---

**准备好了吗？开始第一步：购买云服务器！** 🚀
