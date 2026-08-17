# 合并 upstream agegr/pi-web v0.8.9 清单

> 基线：上次同步点 `176cea8`（2026-08-13，吸收了 upstream 到 `0877bff` / v0.8.8 一批）。
> 目标：把 upstream `0877bff..agegr/main`（v0.8.9，12 个提交）合并进来，同时**保留**本 fork 的独有功能。
> 因 `176cea8` 是单父 squash merge，git 无法自动识别已吸收内容，**不能直接 `git merge agegr/main`**（会重复应用 v0.8.8 改动并大面积冲突）。需按下面逐项处理。

---

## A. 需要引入的 upstream v0.8.9 提交

| 提交 | 特性 | 优先级 |
|---|---|---|
| `5d07375` #487 | 隔离项目命令环境（清洗 `PORT`/`NODE_ENV`/`NEXT_*`） | 🔴 安全 |
| `06522eb` | 拒绝歧义的裸 model scope | 🔴 |
| `af0b592` | 更新有漏洞的依赖 | 🔴 安全 |
| `febcba5` | 升级 pi 依赖到 0.84.2（本地当前 0.84.1） | 🔴 |
| `77e482d` | 流式过程中实时显示 tool call | 🟠 |
| `b9bb1d9` | 显示 tool 执行进度 | 🟠 |
| `7473ac6` #460 | markdown 表格源码 token 保持内联 | 🟠 |
| `7152653` #502 | wrapper 关闭信号转发给 Next 子进程 | 🟠 |
| `fa32336` #490 | 规范化 Windows 项目身份 | 🟡 |
| `fb8e295` #491 | 聊天区 notice 居中 | 🟡 |
| `586d72e` | ModelsConfig 对 provider 响应做防御性 guard | 🟡 |
| `2a6e537` | Release v0.8.9（版本号，可跳过，本地自行 bump） | — |

---

## B. upstream 纯新增文件（本地不存在，直接采用，无冲突）

- `bin/process-lifecycle.js`（#502 进程生命周期）
- `lib/process-lifecycle.test.mjs`
- `lib/tool-execution-progress.ts` + `.test.mjs`（tool 执行进度）
- `lib/project-command-env.ts` + `.test.mjs`（环境隔离）
- `lib/project-identity.ts` + `.test.mjs`（Windows 项目身份）
- `lib/project-groups.ts` + `.test.mjs`
- `lib/project-tree.ts` + `.test.mjs`
- `docs/adr/0001-isolate-project-command-environments.md`
- `CONTEXT.md`（#487 引入的上下文文档，确认是否需要）
- 各类新增测试：`app/api/cwd/validate/route.test.mjs`、`app/api/sessions/runtime-route.test.mjs`、`components/AppShell.auto-name.test.mjs`、`components/AppShell.mobile-toolbar.test.mjs`、`components/BranchNavigator.test.mjs`、`components/ChatInput.mobile-thinking-menu.test.mjs`、`components/ChatWindow.notices.test.mjs`、`components/MobilePwaLayout.test.mjs`、`components/SessionSidebar.project-identity.test.mjs`、`components/SessionSidebar.test.mjs`、`lib/next-config-esm.test.mjs`、`lib/rpc-manager-shutdown.test.mjs`、`lib/rpc-session-info.test.mjs`、`lib/session-reader.test.mjs`

### 本地已有、upstream v0.8.9 也改了，但本地未独立修改（3-way 干净采用 upstream）
- `lib/agent-event-wire.ts`（本地有，v0.8.9 改，本地未动 → 采用 upstream）
- `lib/workspace-memory.ts`、`lib/chat-lazy-load.ts`、`lib/model-scope.ts`、`lib/session-reader.ts`、`lib/normalize.ts`、`lib/streaming-message.ts`、`lib/pi-types.ts`、`lib/http-dispatcher.ts`（同上，采用 upstream；**但** `normalize.ts`/`streaming-message.ts` 需核对本地的 CJK inline 改动是否已被 squash 吸收——见 C 节）

---

## C. 必须保留的本地独有功能（HEAD vs agegr/main 净增 ~5600 行）

| 本地功能 | 关键文件 | 关联提交 |
|---|---|---|
| 文件浏览器右键菜单 | `components/FileContextMenu.tsx`、`lib/file-ops.ts`、`components/InlineFileNameInput.tsx` | `a743b0a` |
| 文件重命名/删除/拖拽移动 | `lib/file-ops.ts`、`FileExplorer.tsx`(+954) | `a743b0a` |
| 系统默认应用打开 + 新建文件/文件夹按钮 | `FileExplorer.tsx`、`bin/pi-web-options.js` | `3d192f1` |
| 会话行右键菜单 | `lib/session-row-context-menu.ts` | `a3f6167` 本地实现 |
| GoalPanel 面板（/goal 子命令交互） | `components/GoalPanel.tsx`、`useAgentSession.ts`(`sendGoalAction/Edit`)、`rpc-manager.ts` | `34f4b87` |
| 聊天内图片点击预览 / read tool 图片渲染 | `components/ImagePreview.tsx`、`MessageView.tsx` | `c2af443` |
| 文件标签页状态持久化 | `components/file-tab-state.ts`、`lib/file-viewer-state.ts`、`AppShell.tsx` | `4e1a17b` |
| 浏览器通知 + "需要关注"回调 | `lib/browser-notifications.ts`、`useAgentSession.ts`(`onAttentionNeeded`)、`ChatWindow.tsx`(`ProcessDetailsGroup`) | `34f4b87`/`c2af443` |
| ModelsConfig 自定义 headers/compat | `components/models-config-helpers.ts`、`ModelsConfig.tsx`、`lib/models-config-store.ts` | `176cea8` |
| CJK token 估算 inline 化（删 `lib/token-estimate`） | `MessageView.tsx`、`useAgentSession.ts` | `7ef611a`+`d0a9740` |
| 中文 AGENTS.md / `@lyhue1991/pi-web` 发布 / trash externalize | `AGENTS.md`、`bin/pi-web.js`、`next.config.ts` | `9302e08`/`afb7d85`/`bf2ee64` |

---

## D. 冲突点逐文件处理清单（16 个 overlap 文件）

以下文件**本地和 upstream v0.8.9 都改了**，是真正的冲突点。策略：保留本地功能 + 手工并入 upstream 改动。

### D1. 🔴 高风险（功能正交，需手工融合）

**`hooks/useAgentSession.ts`**
- 上游加（`b9bb1d9`）：tool 执行进度相关逻辑（配合 `lib/tool-execution-progress.ts`、`lib/agent-event-wire.ts`）
- 本地保留：`sendGoalAction`/`sendGoalEdit`、`onAttentionNeeded`（阻塞式 extension UI）、`ProcessDetailsGroup` 配合
- 策略：先 cherry-pick `b9bb1d9`，冲突处把 tool-progress 的事件处理与本地的 goal/attention 处理并存；确保两边 callback 都接到事件总线

**`components/ChatWindow.tsx`**
- 上游加（`b9bb1d9` tool 进度 + `fb8e295` notice 居中）
- 本地保留：`onAttentionNeeded` prop、`ProcessDetailsGroup`、GoalPanel 接线、图片预览相关
- 策略：notice 居中（`fb8e295`）大概率干净采用；tool 进度渲染需与本地的 `ProcessDetailsGroup` 折叠区协调——确认两者不重复展示同一段过程

**`components/MessageView.tsx`**
- 上游加（`77e482d`）：流式过程中渲染 tool call（参数未完成时也显示）
- 本地保留：read tool 返回图片渲染（`c2af443`）、CJK token inline 估算（`7ef611a`/`d0a9740`）
- 策略：流式 tool-call 分支与图片渲染分支通常不重叠；CJK 估算本地已 inline，**不要**回退到上游独立 `lib/token-estimate`（上游 v0.8.9 仍保留独立模块——此处本地版本更优，保留本地）

**`lib/rpc-manager.ts`**
- 上游加（`5d07375` 环境隔离 + `febcba5` pi 0.84.2）
- 本地保留：GoalPanel 相关命令透传（`34f4b87`）
- 策略：环境隔离是在 shell spawn 处包一层 sanitizer，与 goal 命令透传正交；pi 0.84.2 升级需同步 `package.json`，注意 `serverExternalPackages` 四个 `@earendil-works/pi-*` 仍须保留

**`lib/types.ts`**
- 上游加（`fa32336` Windows 身份字段 + `77e482d` 流式 tool call 类型）
- 本地保留：本地新增类型（图片/attention/goal 相关）
- 策略：类型声明多为追加，合并时取并集

### D2. 🟡 中风险（特性重叠，需取舍）

**`components/ModelsConfig.tsx` / `ModelsConfig.test.mjs`**
- 上游加（`586d72e`）：provider 响应防御性 guard
- 本地保留：自定义 headers/compat 行（`models-config-helpers.ts`）
- 策略：guard 是对响应做 null/异常防护，与本地 headers 编辑正交；二者并存

**`components/SessionSidebar.tsx`**
- 上游加（`fa32336`）：Windows 项目身份规范化（`project-identity`/`project-groups` 接线）
- 本地保留：文件浏览器交互增强（+494 行）、会话行右键菜单事件、新建文件/文件夹按钮
- 策略：Windows 身份改动在项目分组逻辑里，本地改动在交互/菜单层；需确认 `projectRoot` 解析路径不被本地 worktree 回退逻辑覆盖。**用 `samePath()` 比较路径，勿用 `===`**（AGENTS.md 已强调）

**`components/AppShell.tsx`**
- 上游加（`fa32336`）：Windows 项目身份相关
- 本地保留：file-tab-state 持久化、`openFileTab`/`saveFileViewerState`、activeFileTab 单挂载
- 策略：Windows 身份改动多在会话分组/路由，本地改动在标签页状态；正交，合并取并集

### D3. 🟢 低风险（小改 / i18n，手工合并即可）

**`app/globals.css`** — 上游 `7473ac6` 加表格内联样式；本地仅 squash `176cea8` 接触。采用上游新增规则，保留本地变量。

**`bin/pi-web.js`** — 上游 `7152653` 加 process-lifecycle 转发；本地有 CLI 启动/DEP0190 抑制。并存：引入 `process-lifecycle.js`，保留本地启动逻辑。

**`lib/i18n/messages/en.ts` / `zh-CN.ts`** — 上游 `77e482d` 加流式 tool call 文案 key；本地加了文件操作/菜单/goal 等大量 key。**取并集**，注意同名 key 以语义为准（流式 tool call 用上游文案）。

**`components/FileViewer.state.test.mjs` / `MessageView.test.mjs`** — 测试文件，采用上游新增用例 + 保留本地用例。

---

## E. 推荐合并顺序与验证

1. **新建分支** `feat/merge-upstream-0.8.9`，从当前 HEAD 切出。
2. **先合纯新增文件**（B 节）：直接 `git checkout agegr/main -- <file>` 取入，再按需调整 import。包括 `lib/tool-execution-progress.ts`、`lib/project-command-env.ts`、`lib/project-identity.ts`、`lib/project-groups.ts`、`lib/project-tree.ts`、`bin/process-lifecycle.js` 及对应测试。
3. **干净采用 upstream 的 lib 文件**（B 末段）：`lib/agent-event-wire.ts`、`lib/workspace-memory.ts`、`lib/chat-lazy-load.ts`、`lib/model-scope.ts`、`lib/session-reader.ts`、`lib/pi-types.ts`、`lib/http-dispatcher.ts`——但 **`lib/normalize.ts` / `lib/streaming-message.ts` 需先核对本地的 CJK inline 改动是否已在 squash 中**，若本地版本与上游 v0.8.9 差异仅在本地的 inline CJK，优先保留本地。
4. **cherry-pick 高优先级提交**，逐个解冲突：
   - `5d07375`（环境隔离）→ 解 `lib/rpc-manager.ts`、`lib/pi-types.ts`
   - `06522eb`（model scope）→ `lib/model-scope.ts`（本地未动，应干净）
   - `7152653`（进程生命周期）→ 解 `bin/pi-web.js`
   - `febcba5` + `af0b592`（依赖升级）→ 手工合并 `package.json`/`package-lock.json`，**保留 `serverExternalPackages` 中 `undici` + 四个 `@earendil-works/pi-*`**
5. **cherry-pick 流式体验提交**：
   - `77e482d`（流式 tool call）→ 解 `lib/normalize.ts`、`lib/streaming-message.ts`、`components/MessageView.tsx`、`lib/types.ts`、i18n
   - `b9bb1d9`（tool 执行进度）→ 解 `hooks/useAgentSession.ts`、`components/ChatWindow.tsx`，并入 `lib/tool-execution-progress.ts`、`lib/agent-event-wire.ts`
   - `7473ac6`（表格内联）→ 解 `app/globals.css`、`FileViewer.state.test.mjs`
6. **cherry-pick 平台/小修提交**：`fa32336`（Windows 身份，解 `SessionSidebar.tsx`/`AppShell.tsx`/`lib/types.ts`/`session-reader.ts`）、`fb8e295`（notice 居中，解 `ChatWindow.tsx`）、`586d72e`（ModelsConfig guard）。
7. **验证**：
   - `node_modules/.bin/tsc --noEmit`
   - `npm run lint`
   - `node --test lib/*.test.mjs components/*.test.mjs hooks/*.test.mjs`
   - `npm run dev` 手测：发消息看流式 tool call 是否实时显示 + tool 进度；文件右键/重命名/删除；GoalPanel 编辑；聊天图片点击预览；标签页切换恢复 FileViewer 状态；后台标签页浏览器通知
   - **不要运行 `next build`**（会污染 `.next/`）
8. **版本**：本地自行 bump（跳过 `2a6e537`），走 `npm run release` 流程（需 TTY + 2FA）。

---

## F. 关键陷阱提醒

- **切勿 `git merge agegr/main`**：squash 基线会让 v0.8.8 改动重复应用。用 cherry-pick 或 `git checkout agegr/main -- <file>` + 手工融合。
- **CJK token 估算**：本地已 inline 化并删除 `lib/token-estimate`，上游 v0.8.9 仍用独立模块。合并 `77e482d`/`b9bb1d9` 时若上游 diff 重新引入 `lib/token-estimate` 引用，**保留本地 inline 版本**，拒绝回退。
- **路径比较**：Windows 身份相关改动里所有路径比较必须用 `samePath()`，不要 `===`（AGENTS.md 已强调，否则 worktree 切换器在 Windows 失效）。
- **`serverExternalPackages`**：升级 pi 0.84.2 后 `next.config.ts` 必须仍保留 `undici` + 四个 `@earendil-works/pi-*`。
- **`lib/normalize.ts` ToolCall 字段归一化**：上游 `77e482d` 改了 `normalize.ts`，本地 `session-reader.ts` 和 `ChatWindow.handleAgentEvent` 两处都调用 `normalizeToolCalls()`——合并后确认两处调用契约不变。
- **GoalPanel 命令透传**：`rpc-manager.ts` 里 goal 相关透传不能被环境隔离 sanitizer 误清洗（`/goal` 走 prompt 通道，不是环境变量，应无影响，但需回归测试）。
