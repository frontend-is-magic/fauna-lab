# Project Worklist Redesign

Date: 2026-04-14
Status: Approved for spec drafting

## Background

The repository already has:

- `AGENTS.md` for broader product and collaboration decisions
- `TODO.md` for execution-oriented notes
- a newly added repo-level `CLAUDE.md` for future Claude Code sessions

What is still missing is a compact status list that helps a future Claude session quickly answer four questions:

1. What has already been built?
2. What exists but still needs correction or validation?
3. What is still not implemented?
4. Which side of the stack should be inspected next?

## Goal

Create a replacement list that summarizes prior work and serves as a continuation index for future Claude sessions.

The list should:

- summarize the current state instead of acting like a raw changelog
- be easy to scan in under a minute
- help future work continue from the correct frontend, backend, or integration surface
- distinguish clearly between completed work, work that exists but needs follow-up, and work that has not been implemented yet

## Chosen approach

Use **Scheme C**:

1. Add a short execution summary at the top.
2. Organize the main body by:
   - Frontend
   - Backend
   - Integration
3. Within each section, split items into:
   - 已完成
   - 待修正
   - 待开发

This was chosen because it best balances quick global understanding with per-surface handoff clarity.

## Structure

The final list should use this shape:

```md
# Project Worklist

## 执行摘要
- 当前最完整：
- 当前半成品：
- 当前主要缺口：

## Frontend
### 已完成
### 待修正
### 待开发

## Backend
### 已完成
### 待修正
### 待开发

## Integration
### 已完成
### 待修正
### 待开发
```

## Writing rules

### Item granularity

Each bullet should describe a feature flow, capability, or validation surface — not a tiny implementation detail.

Good examples:

- Dataset 页面已接入真实业务 UI
- Train 页面已接入训练状态轮询
- 模型列表接口尚未形成闭环

Bad examples:

- 改了一个按钮颜色
- 新增一个 type
- 调整一个字段名

### Item wording

Each item should prefer **result + limitation/gap** wording when helpful.

Examples:

- Train 页面已经接入训练启动、状态轮询和历史展示，但仍缺页面级手工验收。
- 推理页仍是占位 UI，尚未接入真实模型与预测结果展示。

### Status semantics

- **已完成**: functionality or structure is already landed and usable
- **待修正**: the capability exists but still has validation gaps, missing polish, or incomplete closure
- **待开发**: the capability is still not meaningfully implemented

## Content model

The list should reflect current repository reality:

- Most complete end-to-end flows: Dataset, Training
- Partial areas: storage settings, model listing, training workflow stabilization
- Major gaps: real inference flow, real model operations, automated tests, integration acceptance

## Draft list content

```md
# Project Worklist

## 执行摘要
- 当前最完整：Dataset 管理链路、Training 主链路
- 当前半成品：外置存储设置、模型列表、Train 页面联调收尾
- 当前主要缺口：Inference 真实链路、Models 真实操作、自动化测试、跨端联调验收

## Frontend

### 已完成
- 约定式路由主链已打通，页面路由由 `src/pages/**/*.tsx` 自动生成。
- `default / zoo` 主题切换入口已保留，公共壳层与导航已落在 `_layout.tsx`。
- Dataset 页面已接入真实业务 UI，包括外置存储设置、类别统计、文件夹上传、预览和删除。
- Train 页面已接入真实业务 UI，包括训练参数表单、启动/停止、状态轮询和历史展示。
- 前端请求层已按业务拆分到 `services/`，并通过统一的 `http.ts` 封装基础请求行为。

### 待修正
- `pnpm lint` 仍未跑通。
- `pnpm typecheck` 仍未跑通。
- `src/router.tsx` 的路由约束与对应测试覆盖仍不足。
- Dataset 与 Train 页面虽已具备真实 UI，但仍缺页面级手工验收。
- 前端对后端实际响应结构的依赖仍需继续核对，避免字段漂移。

### 待开发
- Inference 页面仍是占位 UI，尚未接入真实推理流程。
- Models 页面仍是占位 UI，尚未接入真实模型列表、下载和删除交互。
- 若继续推进训练体验，仍需要补更稳定的结果展示与异常态处理。

## Backend

### 已完成
- FastAPI 应用入口、路由注册与 `/health` 检查已打通。
- 数据集上传、统计、预览、删除已落成真实文件操作，而不是占位返回。
- 存储设置接口已支持读取和更新外置存储目录。
- 运行时数据外置规则已落地，数据集、checkpoint、metadata 都写入仓库外目录。
- 训练主链路已实现：启动、停止、状态轮询、历史记录。
- 当前训练路径已统一到 `torchvision vit_b_16` 主方案。
- 训练任务已放到后台线程执行，并通过全局状态对外暴露运行信息。

### 待修正
- 后端最小冒烟测试仍未补齐。
- 训练历史与运行状态主要保存在内存中，服务重启后不会恢复实时轮询状态。
- 训练相关能力虽然可用，但仍缺少更系统的错误场景验证。
- 模型管理路由和服务层之间仍有未完全接上的地方，现状还不算闭环。

### 待开发
- 推理接口仍是占位实现，尚未完成真实模型加载与预测。
- 模型下载仍未实现，接口当前返回 `501`。
- 模型删除接口仍需接入真实文件删除逻辑。
- 若要补齐模型管理，需要继续完善模型元数据读取与展示能力。

## Integration

### 已完成
- 前端默认通过 `http://localhost:8000` 访问后端，和当前本地开发方式一致。
- 后端 CORS 已对齐前端开发端口 `http://localhost:5173`。
- Dataset 页面到后端接口的最小联调链路已验证通过。
- Train 页面已具备联调所需的前后端接口与页面骨架。

### 待修正
- 前端 `fetch` 请求层与后端实际响应结构仍需继续对齐确认。
- Train 页面到后端接口的最小联调链路仍需明确验收结论。
- Inference 与 Models 对应的跨端链路尚未真正打通。
- README 本地启动说明仍未补齐，影响后续接手效率。
- PR 检查命令说明仍未补齐，影响统一验证流程。

### 待开发
- 后端最小冒烟测试与前端验证命令需要形成更稳定的交付前检查流程。
- 本地启动、联调、验证方式需要整理成一份统一说明，降低接手成本。
- 若继续多人并行开发，需要进一步明确跨端字段变更时的联动更新规则。
```

## Non-goals

This redesign is not trying to:

- replace `AGENTS.md` as the source of broader product or collaboration policy
- replace `CLAUDE.md` as the operating guide for future Claude sessions
- become a commit-level changelog
- define implementation steps for inference/models completion yet

## Review standard

A finished version of this list is successful if a future Claude session can:

- identify the two most complete flows within seconds
- distinguish incomplete-but-existing work from not-started work
- know whether to continue in frontend, backend, or integration first
- avoid re-discovering the same project state from scratch
