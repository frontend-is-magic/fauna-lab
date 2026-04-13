# AGENTS.md — Fauna Lab

> 多模态图像分类 Web App，带沉浸式主题系统
> 前端 React，后端 FastAPI/PyTorch，本地训练与推理

---

## 1. 项目概述

Fauna Lab 是一个本地运行的图像分类应用。用户可以上传数据集、定义类别、使用本地 GPU 或 CPU 训练模型，并在训练完成后进行推理验证。

产品特色是沉浸式主题系统。不同主题会把 AI 工作流中的关键阶段拟人化为角色，让数据上传、训练、推理、报错和空闲态都具备一致的叙事体验。

当前首发范围固定为：

- 前端首发主题：`default + zoo`
- 后端训练方式：`threading.Thread + 全局状态`
- 仓库可见性：`public`
- Git 策略：首次推送允许直接推送到 `main`，首次推送后立即切换为受保护主分支

---

## 2. 协作模式

本项目默认按“两个子 Agent 执行 + 一个统筹 Agent 集成”执行。

### 2.1 固定协作编制

每一轮正式开发任务，默认固定拆成以下 3 个角色：

- `Frontend Sub-Agent`
  负责 `React + Vite + Tailwind + Jotai` 侧工作，包括主题系统、页面、组件、状态管理、前端 API 封装和交互体验。
- `Backend Sub-Agent`
  负责 `FastAPI + PyTorch` 侧工作，包括数据集管理、训练服务、推理服务、模型管理和本地存储。
- `Coordinator Agent`
  负责需求拆解、任务分配、接口契约、冲突规避、Git 规则、AGENTS 维护、集成验证和 GitHub 流程推进。

### 2.2 强制执行规则

1. 只要进入实现阶段，就必须先拆成两个子 Agent：
   - 一个负责前端
   - 一个负责后端
2. `Coordinator Agent` 不直接把前后端改动混在同一次无边界实现中，而是负责：
   - 分工
   - 约束写入范围
   - 合并结果
   - 解决冲突
3. 如果本轮任务只明显涉及单端，也要保留双子 Agent 编制：
   - 主责子 Agent 负责实现
   - 另一子 Agent 负责接口兼容性、目录规范、联调影响检查或预留位检查
4. 前后端子 Agent 不得同时修改同一文件，除非由 `Coordinator Agent` 明确接管冲突解决。
5. 涉及跨端字段变更、路由调整、训练状态结构、模型元数据结构等事项时，必须由 `Coordinator Agent` 先定义契约，再并行执行。

### 2.3 协作原则

1. 先定接口契约，再并行开发。
2. 前后端都不得绕开已写入本文件的技术决策。
3. 新的技术偏好或架构升级，必须先更新本文件，再开始实现。
4. 每一轮工作结束后，`Coordinator Agent` 必须回写当前进度和待办，保证 TODO 可持续更新。

---

## 3. Git 与 GitHub 规则

### 3.1 仓库与分支

- GitHub 仓库名称固定为：`fauna-lab`
- 首次推送前允许直接在本地初始化并推送 `main`
- 首次推送完成后，`main` 必须启用分支保护
- 常规开发分支命名：
  - `feat/<scope>`
  - `fix/<scope>`
  - `refactor/<scope>`
  - `docs/<scope>`

### 3.2 Main 保护策略

首次推送完成后，`main` 的默认规则如下：

- 禁止直接推送
- 仅允许通过 Pull Request 合并
- 要求分支与 `main` 保持最新
- 至少通过以下检查后才允许合并：
  - 前端：`lint`、`typecheck`、`build`
  - 后端：服务启动检查、核心 API 冒烟测试

### 3.3 提交与 PR 规则

- 提交信息建议使用：
  - `feat: ...`
  - `fix: ...`
  - `refactor: ...`
  - `docs: ...`
  - `chore: ...`
- 单个 PR 尽量只解决一个目标
- PR 描述必须说明：
  - 改动范围
  - 是否涉及接口变更
  - 验证方式
  - 风险点

---

## 4. 当前技术决策

### 4.1 前端

- 框架：`React 18 + TypeScript + Vite`
- 包管理器：`pnpm`
- 样式方案：`Tailwind CSS`
- 状态管理：`Jotai`
- 请求层：原生 `fetch` 封装
- 路由：`React Router v6`
- UI 组件库：`Ant Design 5`
- 图表：`Recharts`
- 动画：`Framer Motion`
- 特效：`canvas-confetti`
- 代码质量：`ESLint + Prettier`，并以 `Prettier` 结果为格式基准

### 4.2 后端

- 语言：`Python 3.10+`
- 框架：`FastAPI`
- 参数校验：`Pydantic v2`
- 训练框架：`PyTorch + torchvision`
- 图像处理：`Pillow`
- 运行方式：`uvicorn`
- 环境管理：`miniconda/conda`
- 依赖管理：`pyproject.toml + requirements.txt` 双轨维护
- 训练执行：`threading.Thread + 全局状态`

### 4.3 存储约定

- 运行时数据必须外置，禁止写入仓库工作区
- 存储目录默认由用户手动选择，并记忆上一次选择结果
- 已选择的目录必须持久化到仓库外的设置文件中
- 环境变量 `FAUNA_LAB_STORAGE_DIR` 为最高优先级覆盖项
- 若既没有环境变量，也还没有用户已保存选择，则使用系统默认目录作为首次启动回退：
  - macOS：`~/Library/Application Support/FaunaLab/storage`
  - Linux：`~/.local/share/fauna-lab/storage`
  - Windows：`%APPDATA%/FaunaLab/storage`
- 应用设置目录固定外置：
  - macOS：`~/Library/Application Support/FaunaLab`
  - Linux：`~/.local/share/fauna-lab`
  - Windows：`%APPDATA%/FaunaLab`
- 数据集目录：`{storage_root}/datasets/`
- 模型目录：`{storage_root}/checkpoints/`
- 运行时元数据目录：`{storage_root}/metadata/`
- 模型文件命名：`{arch}_{timestamp}_{accuracy:.2f}.pt`
- 当前阶段不引入数据库，元数据以本地文件和内存状态为主

---

## 5. 技术架构

```text
Browser
  -> Frontend (React 18 + Vite + Tailwind + Jotai)
  -> REST API (JSON + multipart/form-data)
  -> Backend (FastAPI + PyTorch)
  -> External Local Storage ({storage_root}/datasets + {storage_root}/checkpoints)
```

| 层级 | 技术选型 | 说明 |
|------|---------|------|
| 前端框架 | React 18 + TypeScript + Vite | SPA，快速迭代 |
| 包管理器 | pnpm | 统一前端依赖管理 |
| UI 组件 | Ant Design 5 | 中后台表单与组件基础 |
| 样式 | Tailwind CSS | 主要布局、原子样式与主题扩展 |
| 状态 | Jotai | 轻量状态管理 |
| 请求 | fetch wrapper | 统一请求与错误处理 |
| 图表 | Recharts | 训练曲线与置信度展示 |
| 动画 | Framer Motion | 页面与角色动效 |
| 后端框架 | FastAPI | 异步 API 服务 |
| 训练框架 | PyTorch + torchvision | 迁移学习与模型微调 |
| 图像处理 | Pillow | 上传与推理图像处理 |
| 环境 | miniconda | 统一 Python 环境 |

---

## 6. 目录结构

```text
fauna-lab/
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── themes/
│   │   ├── hooks/
│   │   ├── atoms/
│   │   ├── services/
│   │   ├── lib/
│   │   ├── styles/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── pnpm-lock.yaml
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── tailwind.config.ts
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── schemas.py
│   │   ├── routers/
│   │   ├── services/
│   │   └── models/
│   ├── pyproject.toml
│   ├── requirements.txt
│   └── environment.yml
├── AGENTS.md
└── README.md
```

目录原则：

- 前端按 `pages/components/themes/hooks/atoms/services` 分层
- 后端按 `routers/services/models` 分层
- API 契约类型应尽量集中定义，避免分散在多处重复声明

---

## 7. 主题系统设计

### 7.1 首发范围

首发阶段只实现：

- `default`
- `zoo`

以下主题保留在 Roadmap 中，不进入首发实现范围：

- `ocean`
- `space`

### 7.2 主题系统职责

- 提供全局主题切换能力
- 为各工作阶段映射角色、配色和文案
- 通过设计令牌统一前端视觉变量
- 支持角色气泡、进度展示、训练完成庆祝等主题化组件

### 7.3 Zoo 主题工作阶段映射

| 工作阶段 | 角色 | 说明 |
|---------|------|------|
| 数据上传 | 松鼠 `Nutty` | 收集数据 |
| 数据浏览 | 猫头鹰 `Owl-Eye` | 审视数据 |
| 模型选择 | 狐狸 `Foxy` | 做策略选择 |
| 训练中 | 仓鼠 `Hammy` | 跑轮代表计算进行中 |
| 训练完成 | 狮子 `King` | 代表训练完成的强模型 |
| 推理预测 | 猎犬 `Sniffy` | 嗅探并识别图片 |
| 错误 | 乌龟 `Shelly` | 错误与回退 |
| 空闲 | 猫咪 `Whiskers` | 待机与空闲态 |

---

## 8. 后端 API 设计

### 8.1 数据集 API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/dataset/upload` | 上传图片到指定类别 |
| GET | `/api/dataset/stats` | 获取数据集统计 |
| GET | `/api/dataset/preview/{class_name}` | 获取类别缩略图预览 |
| DELETE | `/api/dataset/{class_name}` | 删除整个类别 |
| DELETE | `/api/dataset/{class_name}/{filename}` | 删除单张图片 |

### 8.2 训练 API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/train/start` | 启动训练 |
| GET | `/api/train/status` | 获取训练状态 |
| GET | `/api/train/history` | 获取训练历史 |
| POST | `/api/train/stop` | 手动终止训练 |

### 8.3 推理 API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/inference/predict` | 单张图片推理 |

### 8.4 模型管理 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/models/list` | 获取模型列表 |
| GET | `/api/models/{model_id}/download` | 下载模型 |
| DELETE | `/api/models/{model_id}` | 删除模型 |

### 8.5 训练链路约束

1. 使用 `torchvision.datasets.ImageFolder` 读取 `data/`
   实际目录为外置存储根下的 `datasets/`
2. 按 `train_split` 划分训练集与验证集
3. 使用标准增强管线
4. 支持 `resnet18`、`resnet50`、`mobilenet_v2`
5. 优先冻结 backbone，仅训练最后分类头
6. 在 `threading.Thread` 中执行训练任务
7. 每个 epoch 更新全局 `train_state`
8. 训练完成后保存 `.pt` 模型与元数据

---

## 9. 前端组件与实现约束

### 9.1 状态管理

- 主题与跨页面共享状态使用 `Jotai`
- 组件局部临时状态仍使用 React 自身 state
- 不在首发阶段引入重型状态方案

### 9.2 样式约束

- 主要样式统一使用 `Tailwind CSS`
- 允许对 `Ant Design` 做必要的主题覆盖
- 避免大面积内联样式
- 设计令牌与主题变量集中管理，避免散落硬编码颜色

### 9.3 请求层约束

- 统一封装 `fetch`
- 统一处理：
  - 基础 URL
  - JSON 解析
  - 错误状态
  - multipart 上传
  - 超时与取消策略

### 9.4 组件约束

- 只使用函数式组件与 Hooks
- 组件名使用 `PascalCase`
- hooks 使用 `useXxx`
- 页面层不直接写复杂主题映射逻辑，应交由 `themes/` 与公共组件处理

---

## 10. 编码规范

### 10.1 前端

- TypeScript 使用 strict mode
- 导入顺序：React -> 第三方库 -> 内部模块 -> 样式 -> 类型
- 代码检查：`ESLint`
- 格式化：`Prettier`
- Prettier 为最终格式基准

PR 前必须至少通过：

- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`

### 10.2 后端

- Python 代码必须补全 type hints
- API 层只做参数校验、路由编排和异常转换
- 业务逻辑下沉到 `services`
- 统一使用 `HTTPException`
- 日志使用 `logging`
- 训练过程使用 `INFO` 级别输出

PR 前必须至少通过：

- 服务能成功启动
- 核心 API 冒烟测试通过
- 上传、训练、推理、模型管理主链路可用

---

## 11. 开发流程

### Phase 1: 基础设施

1. 初始化 git 仓库
2. 创建 GitHub 同名仓库 `fauna-lab`
3. 建立 `frontend/` 与 `backend/` 基础目录
4. 初始化 `pnpm` 前端工程
5. 初始化 `conda` 后端环境描述与 Python 依赖文件

### Phase 2: 后端 MVP

1. 编写 `schemas.py`
2. 编写 `dataset_manager.py` 与数据集路由
3. 编写模型定义与训练服务
4. 编写推理服务与模型管理路由
5. 编写 `main.py`
6. 使用 `curl` 做接口冒烟验证

### Phase 3: 前端 MVP

1. 搭建 Vite + React + Tailwind + Jotai 基础工程
2. 建立主题系统与 `default + zoo`
3. 编写数据集、训练、推理、模型管理四个页面
4. 对接后端 API
5. 完成训练状态轮询与结果展示

### Phase 4: 集成与治理

1. 完成首次推送
2. 启用 `main` 分支保护
3. 补充 README
4. 建立 PR 模板与基础检查脚本

---

## 12. 已确认决策记录

本轮已确认：

- 仓库可见性：`public`
- 默认分支策略：首次推送 `main`，随后保护 `main`
- 前端首发范围：`default + zoo`
- 后端训练架构：`threading.Thread + 全局状态`
- 前端包管理器：`pnpm`
- 前端样式方案：`Tailwind CSS`
- 前端状态管理：`Jotai`
- 前端请求层：原生 `fetch` 封装
- 前端代码质量工具：`ESLint + Prettier`，`Prettier` 优先
- 后端环境管理：`miniconda/conda`
- 后端依赖管理：`pyproject.toml + requirements.txt`
- 后端服务组织：单体 FastAPI，按 `routers/services/models` 分层

---

## 13. 待确认事项

后续如继续细化，优先确认：

- 测试框架与覆盖要求
- Python 格式化和类型检查工具
- 是否启用 `pre-commit`
- PR 模板与 issue 模板
- GitHub Actions 基础检查流水线
- 首次推送后 `main` 分支保护的具体规则细节
