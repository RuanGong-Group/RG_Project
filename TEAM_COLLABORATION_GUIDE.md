# 语境记忆项目团队协作与Git工作流指南 (最终版)

**版本**: 1.0
**日期**: 2025年10月31日
**制定者**: GitHub Copilot

---

## 第一部分：核心原则与分支模型

本指南旨在为“语境记忆”项目冲刺发布阶段提供清晰、高效的团队协作流程。我们将采用以测试和发布为核心的 **GitHub Flow 简化版** 模型。

### 1.1 分支定义与职责

| 分支类型 | 命名规则 | **核心职责** | 谁来操作？ |
| :--- | :--- | :--- | :--- |
| `main` | 固定 | **生产分支**：存放最稳定、可随时发布给用户的代码。**严格受保护**。 | 组长 (合并), 配置管理员 (维护) |
| `develop` | 固定 | **集成分支**：所有修复、优化、新功能的“集合点”，是**测试经理的主战场**。 | 全员 (合并任务分支), 测试经理 (测试) |
| `fix/*`<br>`polish/*`<br>`feature/*` | `fix/login-bug`<br>`polish/ui-style`<br>`feature/ai-func` | **任务分支**：从 `develop` 分出，用于**个人独立开发**。一个分支只做一件事。 | 架构师, 普通开发者 |
| `hotfix/*` | `hotfix/crash-bug` | **热修复分支**：从 `main` 分出，用于修复**线上生产环境的紧急、严重Bug**。 | 架构师, 组长 (批准) |

### 1.2 核心工作流图

```mermaid
graph TD
    subgraph "生产环境 (Production)"
        main[main (v1.0)]
    end

    subgraph "集成与测试环境 (Staging)"
        develop[develop]
    end

    subgraph "个人开发环境 (Local)"
        task_branch[fix/polish/feature 分支]
    end
    
    subgraph "紧急修复 (Emergency)"
        hotfix_branch[hotfix 分支]
    end

    task_branch -- 1. 提交PR (Pull Request) --> develop
    develop -- 2. 测试通过后, 提交发布PR --> main
    main -- 3. 发现线上紧急Bug --> hotfix_branch
    hotfix_branch -- 4. 修复后提交PR --> main
    hotfix_branch -- 5. 同时提交PR同步 --> develop
```

**关键规则**: **任何代码在合并到 `main` 分支前，必须先在 `develop` 分支经过测试经理的完整测试。**

---

## 第二部分：角色分工与职责

### 2.1 组长 (您)
- **核心职责**: 项目总负责人，对最终产品质量和发布节奏负责。
- **具体任务**:
    1.  **任务规划与分配**: 在GitHub Issues中创建任务，并指派给团队成员。
    2.  **决策审批**:
        - **批准发布**: 审批从 `develop` 到 `main` 的发布Pull Request。这是发布新版本的唯一入口。
        - **批准热修复**: 审批 `hotfix` 分支到 `main` 的紧急修复PR。
    3.  **进度跟踪**: 主持每日站会和每周复盘，确保项目按计划进行。
    4.  **冲突解决**: 解决团队内部的技术分歧或资源冲突。

### 2.2 配置管理员
- **核心职责**: 保障开发环境的一致性、仓库的规范性和自动化流程的顺畅。
- **具体任务**:
    1.  **仓库初始化与维护**:
        - 负责首次 `git init`，创建 `.gitignore`，关联远程仓库。
        - 在GitHub/Gitee上设置 `main` 分支的**保护规则**。
    2.  **环境管理**:
        - 维护 `backend/.env.example` 和 `frontend_v3/.env.example` 文件，确保所有必需的环境变量都有说明。
        - 编写并维护项目的《环境配置指南》。
    3.  **依赖管理**: 定期检查并更新 `package.json` 中的依赖，处理潜在的安全漏洞。
    4.  **(未来)** **CI/CD建设**: 搭建自动化测试和部署流水线（例如使用 GitHub Actions）。

### 2.3 架构师
- **核心职责**: 技术方案的制定者和代码质量的把关人。
- **具体任务**:
    1.  **技术攻坚**: 负责复杂任务的开发，如“AI功能集成”、“生词本核心逻辑”等。
    2.  **代码审查 (Code Review)**:
        - 作为所有Pull Request的主要审查者。
        - 确保新代码符合 `projectrules.md` 规范和整体架构设计。
        - 拒绝不合格的代码，并给出清晰的修改建议。
    3.  **分支开发**:
        - 从 `develop` 创建任务分支 (e.g., `feature/ai-engine`)。
        - 开发完成后，提交PR到 `develop`，并清晰描述改动。
    4.  **热修复执行**: 当出现线上紧急Bug时，由架构师负责从 `main` 创建 `hotfix` 分支进行快速修复。

### 2.4 测试经理
- **核心职责**: 软件质量的“守门员”，确保交付给用户的产品没有严重Bug。
- **具体任务**:
    1.  **测试用例编写**: 根据 `PRD.md` 和 `TESTING_ISSUES_FIXED.md`，编写并维护一份完整的《端到端测试用例》清单。
    2.  **`develop` 分支测试**:
        - **这是您的核心工作区**。一旦有新的 `fix` 或 `feature` 分支合并进来，您就需要将 `develop` 分支的代码部署到测试环境。
        - 执行完整的端到端测试，确保新功能符合预期且没有破坏旧功能（回归测试）。
    3.  **Bug报告**: 在GitHub Issues中创建详细的Bug报告，清晰描述复现步骤、期望结果和实际结果，并指派给架构师或相关开发者。
    4.  **发布确认**: 当且仅当 `develop` 分支通过所有测试用例后，向**组长**发出“可以发布”的确认信号。

---

## 第三部分：详细协作流程

### 场景一：常规开发/修复流程 (例如：架构师修复一个Bug)

1.  **接任务**: 组长在Issues里创建“Bug: 统计页面图表不显示”，并指派给架构师。
2.  **切分支**: 架构师在本地执行：
    ```powershell
    git checkout develop
    git pull origin develop  # 同步最新代码
    git checkout -b fix/stats-chart-display
    ```
3.  **写代码**: 架构师在 `fix/stats-chart-display` 分支上修复Bug。
4.  **提PR**: 修复完成后，架构师推送分支并创建到 `develop` 的PR。
5.  **审代码**: 组长或其他成员审查代码，提出意见或批准。
6.  **合代码**: PR批准后，合并到 `develop` 分支。
7.  **去测试**: **测试经理**收到通知，立即在测试环境中更新 `develop` 分支的代码，并根据测试用例验证该Bug是否已修复，以及是否引入了新问题。

### 场景二：版本发布流程

1.  **测试收敛**: 测试经理在 `develop` 分支上完成了对多个已合并功能/修复的全面测试，确认所有功能稳定。
2.  **发布确认**: 测试经理向组长报告：“`develop` 分支已达到发布标准。”
3.  **创建发布PR**: 组长（或配置管理员）创建一个从 `develop` 到 `main` 的PR，标题为 `Release: v1.1.0`。
4.  **最终审批**: 组长做最后确认，并点击“Merge Pull Request”。
5.  **打标签**: 配置管理员在本地执行：
    ```powershell
    git checkout main
    git pull origin main
    git tag -a v1.1.0 -m "Release v1.1.0: Added AI features and notebook."
    git push origin v1.1.0
    ```

### 场景三：紧急热修复流程

1.  **出事故**: 用户反馈v1.1.0版本有严重的登录闪退Bug。
2.  **切分支**: 架构师立即在本地执行：
    ```powershell
    git checkout main
    git pull origin main
    git checkout -b hotfix/login-crash-v1.1.0
    ```
3.  **快修复**: 架构师以最小改动修复闪退问题，并提交。
4.  **提双PR**: 架构师创建**两个**PR：
    - PR 1: `hotfix/login-crash-v1.1.0` -> `main` (用于紧急发布)
    - PR 2: `hotfix/login-crash-v1.1.0` -> `develop` (用于同步代码，防止下次发布时Bug重现)
5.  **急合并**: 组长立即审查并合并PR 1。配置管理员打上新标签 `v1.1.1` 并部署。
6.  **同步合**: 随后，合并PR 2，确保 `develop` 分支也包含了此修复。

---

这份指南为您和您的团队提供了清晰的路线图。建议将此文件存放在项目根目录，作为团队的行为准则。
