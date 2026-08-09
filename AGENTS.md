# Pi Web - 开发说明

pi 编码 agent 的本地 Web UI（npm 包 `@lyhue1991/pi-web`）。读取本地 pi 会话文件，提供浏览器端的会话浏览、实时聊天、模型配置、技能管理与项目文件预览。基于 Next.js（App Router）+ React 19，服务端在进程内通过 pi SDK 创建 AgentSession。

## 快速开始

```bash
npm run dev          # 127.0.0.1:30141（仅本机）
npm run dev:lan      # 0.0.0.0:30141（局域网，需配合 PI_WEB_PASSWORD）
```

| 用途 | 命令 |
| --- | --- |
| 类型检查 | `node_modules/.bin/tsc --noEmit` |
| Lint | `npm run lint`（`eslint .`） |
| 单元测试 | `node --test lib/*.test.mjs components/*.test.mjs hooks/*.test.mjs` |
| 单测（单个文件，含 TS 源） | `node_modules/.bin/jiti lib/i18n/registry.test.mjs` |
| 生产构建 | `npm run build`（`next build --webpack`，**非** turbopack） |
| 发布 | `npm run release`（bump 版本 + build + `npm publish`） |

- **开发期间切勿运行 `next build`**：会污染 `.next/` 并破坏 `npm run dev`。
- Node 要求 `>=22.19.0`（`bin/node-version.js` 强制校验）。
- 测试为 `*.test.mjs`，与源码同目录；用 Node 内置 test runner。导入 TS 源时通过 `jiti`（`createJiti(import.meta.url).import("./x.ts")`）。
- 路径别名 `@/*` → `./*`（见 `tsconfig.json`）。
- `next.config.ts` 中 `serverExternalPackages` 必须保留 `undici` 及四个 `@earendil-works/pi-*` 包为外部依赖。

---

## 架构

```
Browser                Next.js Server              AgentSession (in-process)
  │                        │                               │
  ├─ GET /api/sessions ────▶ reads ~/.pi/agent/sessions/   │
  ├─ GET /api/sessions/[id] reads .jsonl file directly     │
  ├─ GET /api/agent/running ───────▶ running id snapshot   │
  │                        │                               │
  ├─ send message ─────────▶ POST /api/agent/[id]          │
  │                        │   startRpcSession() ─────────▶│ createAgentSession()
  │                        │   session.send(cmd) ─────────▶│ session.prompt()
  │                        │                               │
  ├─ SSE connect ──────────▶ GET /api/agent/[id]/events    │
  │                        │   session.onEvent() ◀─────────│ session.subscribe()
  │◀── data: {...} ─────────│                               │
```

- **会话浏览**（只读）：通过 SDK `SessionManager` 助手与 `lib/session-reader.ts` 读取 `.jsonl` 文件，**不**创建 AgentSession。
- **发送消息**：`lib/rpc-manager.ts` 的 `startRpcSession()` 在进程内创建 AgentSession。
- **请求入口**：`proxy.ts`（Next 中间件，导出为 `proxy`）对每个 `/` 与 `/api/*` 请求做受信校验（`lib/request-security.ts`）与可选 Web 口令（`lib/web-auth.ts`，`PI_WEB_PASSWORD` 环境变量，Basic 认证）。`instrumentation.ts` 在 Node 运行时注册 `lib/http-dispatcher.ts` 替换全局 fetch/undici dispatcher。

---

## 文件地图

仓库已显著增长；下列为关键文件。`lib/`、`components/`、`hooks/` 下每个源文件几乎都配有同目录 `*.test.mjs`。

```
app/
  api/                          见下文“API 路由”
  layout.tsx page.tsx           根布局与入口
  manifest.ts                   PWA manifest（webmanifest）
  globals.css                   CSS 变量（见文末）

proxy.ts                        请求受信校验 + Web 口令中间件
instrumentation.ts              注册 http-dispatcher
next.config.ts                  serverExternalPackages / headers / 版本注入

lib/
  rpc-manager.ts                AgentSessionWrapper + 注册表 + startRpcSession
  session-reader.ts             SessionManager 包装 + 路径缓存 + buildSessionContext 适配
  normalize.ts                  normalizeToolCalls()（文件格式与类型字段不一致）
  tool-presets.ts               PRESET_NONE/DEFAULT/FULL + getPresetFromTools()
  model-scope.ts                enabledModels 作用域解析（委托 SDK）
  startup-preferences.ts        持久化浏览器选择的模型/thinking 有效值
  provider-listing.ts           能力驱动的 provider 列表（纯函数）
  provider-listing-runtime.ts   用 ModelRuntime 适配上述纯函数
  provider-credential-store.ts  auth.json 凭据增删（文件锁）
  web-auth.ts                   PI_WEB_PASSWORD Basic 认证
  request-security.ts           受信 API/主机判定
  path-security.ts / project-trust.ts   路径与项目信任模型
  allowed-roots.ts / file-access.ts     /api/files 与 worktree 的允许根
  worktree.ts                   项目/worktree 解析与 git worktree 操作
  http-dispatcher.ts            全局 fetch dispatcher 配置
  atomic-file.ts / bounded-form-data.ts  原子写、表单上限等基础设施
  directory-browser.ts          目录浏览
  file-*.ts                     file-paths/file-types/file-dirent/file-fuzzy/file-links/file-upload
  image-attachments.ts          图片附件处理
  git-changes.ts / git-status.ts / git-types.ts   git 状态
  patch.ts                      diff/patch
  terminal-input.ts / bash-output.ts / ansi.ts    终端输入与 ANSI 处理
  compaction-summary.ts         压缩摘要
  session-file-references*.ts   会话内文件引用
  session-title.ts / session-path.ts
  model-catalog.ts / model-discovery.ts / model-discovery-auth.ts / models-cache.ts
  skills-service.ts / skill-lock.ts / skill-updates.ts / npx.ts
  markdown.ts / clipboard.ts / pi-types.ts / types.ts / api-types.ts
  chat-lazy-load.ts / message-display.ts / panel-layout.ts / initial-navigation.ts
  i18n/                         内置 i18n 层（registry/format/types/messages/）

components/
  AppShell.tsx                  布局 + URL 状态 + 标签页管理
  SessionSidebar.tsx            会话树 + FileExplorer
  ChatWindow.tsx                聊天组合 + 完成提示音包装
  ChatInput.tsx                 输入栏 + 模型/thinking/工具/压缩控制
  MessageView.tsx               渲染单条消息（user/assistant/toolCall/toolResult）
  BranchNavigator.tsx           会话内分支切换
  ChatMinimap.tsx               消息列表滚动小地图
  MarkdownBody.tsx / MermaidBlock.tsx   markdown 与 mermaid 渲染
  ModelsConfig.tsx              编辑 models.json 的弹窗
  PluginsConfig.tsx             已装包插件弹窗
  SkillsConfig.tsx              技能 弹窗
  FileExplorer.tsx / FileViewer.tsx / FileIcons.tsx / DirectoryPicker.tsx
  TabBar.tsx                    标签栏（Chat + 打开的文件）
  ProjectTrustDialog.tsx        项目信任对话框
  ExtensionStatusBar.tsx        扩展状态栏
  PwaRegistration.tsx / MobilePwaLayout   PWA 与移动端布局

hooks/
  useAgentSession.ts            消息 + 流式 + SSE + fork/navigate/对账逻辑
  useI18n.tsx                   翻译 hook（见 i18n 节）
  useAudio.ts                   完成提示音 + AudioContext 解锁
  useDragDrop.ts / useIsMobile.ts / useTheme.ts
  useKeyboardShortcuts.ts / useResizablePanel.ts / useViewportHeight.ts

bin/                            发布为 `pi-web` CLI
  pi-web.js                     校验 Node 版本 → 启动 next（解析 next bin，不依赖 .bin 软链）
  node-version.js               Node >= 22.19.0 校验
  pi-web-options.js             启动参数解析（port/hostname/openBrowser）

docs/                           改动相关区域前应先读
  i18n.md  release.md  worktrees.md  worktrees.zh-CN.md
public/                         sw.js / offline.html / icons（PWA）
```

### API 路由（`app/api/`）

```
sessions/route.ts               GET  列出全部会话
sessions/[id]/route.ts          GET/PATCH/DELETE 会话
sessions/[id]/context/route.ts  GET ?leafId= - 某叶节点的上下文
sessions/[id]/export/route.ts   GET 导出会话 HTML
agent/new/route.ts              POST { cwd, message, toolNames?, provider?, modelId? }
agent/[id]/route.ts             GET state | POST 任意命令
agent/[id]/events/route.ts      GET SSE 流
agent/running/route.ts          GET 当前运行中会话 id
agent/running/events/route.ts   GET 当前运行中会话 id 的 SSE 流
auth/all-providers/route.ts     GET API-key provider 列表
auth/api-key/[provider]/route.ts GET/POST/DELETE provider API key 状态/存储
auth/login/[provider]/route.ts  GET OAuth/device-code SSE | POST 手动码
auth/logout/[provider]/route.ts POST OAuth 登出
auth/providers/route.ts         GET OAuth provider 列表
cwd/validate/route.ts           POST 校验/选择 cwd
default-cwd/route.ts            POST 创建 ~/pi-cwd-YYYYMMDD
files/[...path]/route.ts        GET 文件内容（仅允许根）
home/route.ts                   GET 用户家目录
models/route.ts                 GET { models, modelList, defaultModel }
models-config/route.ts          GET/PUT 读写 ~/.pi/agent/models.json
models-config/catalog/route.ts  GET models.dev 定价预设
models-config/discover/route.ts POST 拉取已配置 provider 的上游模型列表
models-config/test/route.ts     POST 测试已配置模型/provider（注意：app/api/models/test/ 不是真实路由）
plugins/route.ts                GET/POST 包插件管理
skills/route.ts                 GET/PATCH 已加载技能与 disable-model-invocation
skills/install/route.ts         POST 通过 npx skills add 安装
skills/search/route.ts          GET/POST skills.sh 搜索
worktrees/route.ts              GET/POST/DELETE git worktrees
```

---

## 关键设计决策与陷阱

### AgentSession 生命周期（`lib/rpc-manager.ts`）
- 每个 session id 对应一个 `AgentSessionWrapper`，以 `globalThis.__piSessions` 为键。
- `globalThis` 能在 Next.js 热重载中存活；普通模块级 Map 不行。
- 空闲超时 10 分钟。并发 `startRpcSession()` 共享同一个启动 Promise（`globalThis.__piStartLocks`）。

### Fork 必须立即销毁 wrapper
`AgentSession.fork()` **原地修改 wrapper 的内部状态**——fork 后 `inner.sessionId` 是*新*会话的 id。若 wrapper 仍以旧 id 留在注册表中，下次请求会拿到已 fork 的状态，后续 fork 会得到损坏的 `parentSession` 链。

**修法**：`send("fork")` 捕获 `newSessionId`，返回前调用 `this.destroy()`。下次请求原会话时从原文件重新加载干净的 AgentSession。

### 两种分支——别混淆
- **Fork**（用户消息上的 Fork 按钮）：创建新的独立 `.jsonl` 文件。通过 header 的 `parentSession` 字段在侧栏树中显示为子节点。
- **会话内分支**（Continue 按钮 / BranchNavigator）：在同一文件内调用 `navigate_tree`。多个条目共享同一 `parentId`。切换时调用 `/api/sessions/[id]/context?leafId=`。

### 会话文件可整体重写
header 中的 `parentSession` **仅作展示元数据**——对聊天内容零影响。可以安全地 `writeFileSync` 整个文件（pi 自身在迁移时也这么做）。删除时级联重设子会话的 parent 会用到。

### ToolCall 字段归一化
pi 存储的 toolCall 块为 `{type:"toolCall", id, name, arguments}`，而 `ToolCallContent` 用 `{toolCallId, toolName, input}`。`lib/normalize.ts` 的 `normalizeToolCalls()` 处理此差异——在 `session-reader.ts`（文件加载）和 `ChatWindow.handleAgentEvent()`（流式）两处都调用。

### 新会话工具预设
工具名在会话创建时传入（`POST /api/agent/new` -> `toolNames[]`）。对已存在会话，挂载时通过 `get_tools` -> `getPresetFromTools()` 推断当前预设。当工具被完全禁用（`toolNames = []`）时，`rpc-manager.ts` 传入空工具允许列表，并在启动/重载/资源发现后强制 `agent.state.systemPrompt = ""`。

### 新会话的模型默认值
`GET /api/models` 返回从 `~/.pi/agent/settings.json` 读取的 `defaultModel`。`ChatWindow` 为新会话在挂载时预选它。浏览器显式选择的模型/thinking 在 AgentSession 构造时原子地应用，随后 `lib/startup-preferences.ts` 持久化其有效值，且**不**回放 `set_model`/`set_thinking_level`；隐式 `enabledModels` 回退与 thinking 钉选不被持久化。

### `enabledModels` 作用域
`enabledModels` 设置用 pi 的 `--models` 语法：对 `provider/modelId` 或裸 `modelId` 做 minimatch glob，非 glob 模式做模糊匹配，可选 `:thinkingLevel` 后缀。**绝不要**把这些模式当字面字符串比较——`lib/model-scope.ts` 委托 SDK 的 `resolveModelScopeWithDiagnostics()`，使 pi-web 与 TUI 在可见模型列表上保持一致；当模式解析为空时回退到所有可用模型。`startRpcSession()` 在创建 AgentSession 前解析该作用域，并原子地传入选定的初始模型、thinking 钉选与 SDK 原生的 `scopedModels`；`GET /api/models` 仅复用该助手生成选择器数据、`thinkingLevelPins` 与 `modelScopeWarnings` 展示。

### 流式过程中刷新页面的 SSE 重连
`ChatWindow` 挂载时调用 `GET /api/agent/[id]`。若 `state.isStreaming === true`，自动重连 SSE。`thinkingLevel` 与 `isCompacting` 也从此响应同步。

### Compaction SSE 事件
新版 pi 发 `compaction_start` / `compaction_end`；旧版发 `auto_compaction_start` / `auto_compaction_end`。`handleAgentEvent` 同时接受两组以保持 `isCompacting` 同步。手动压缩是阻塞式 POST——按钮在响应返回前保持禁用。

### 运行状态轮询 + 对账
- 侧栏在标签页可见时每 2.5 秒轮询 `/api/agent/running`，后台标签页暂停轮询。会话列表响应仍是初始回退。
- `useAgentSession` 将每会话 SSE 视为聊天事件主源，并在每次 prompt 前打开它。`prompt_done` 立即完成当前 UI 阶段与通知，但空闲 SSE 会保留 30 秒宽限窗口并被下次 prompt 复用。`agent_start` 取消该关闭定时器；`agent_settled` 结束没有 wrapper 级 `prompt_done` 的扩展注入运行并开启新的宽限窗口。**不要**在第一个 `agent_end` 就关闭：重试、压缩、扩展排队消息可能继续同一个逻辑 prompt。
- 运行进行中时，`useAgentSession` 周期性调用 `GET /api/agent/[id]`，并在 `visibilitychange`/`online` 时对账。修复后台标签页或半开连接导致的终态事件丢失。
- prompt 运行用单调 run id；来自旧 run 的迟到 SSE 或慢对账响应必须被忽略，以免复活过期的流式气泡。

### Worktrees 与项目分组
- `lib/worktree.ts` 将 linked worktree 顶层解析回主仓库 `projectRoot`；`listAllSessions()` 把它附到每个 `SessionInfo`，使同一仓库的所有 worktree 在侧栏归为一组。
- worktree 操作由 `/api/worktrees` 提供，受与 `/api/files` 相同的允许根规则保护。
- 新 worktree 创建在 `<repoRoot>-worktrees/<sanitized-branch>` 下。复用已有分支；否则 `git worktree add -b` 创建分支。
- 移除脏 worktree 返回 `409` 且 `{ dirty: true }`，以便 UI 询问后再用 `force` 重试。
- cwd 指向已移除 worktree 的会话被回推断为主项目，而非变成幻影项目行。

### 文件访问允许列表
- `/api/files` 刻意**不是**通用文件浏览器。允许根来自会话 cwd、其解析后的项目根、`~/pi-cwd-*`，以及显式 `allowFileRoot()` 添加的根。
- `/api/cwd/validate`、`/api/default-cwd`、`/api/worktrees` 在使新位置可浏览时调用 `allowFileRoot()`。

### 插件与技能
- `/api/plugins` 用 pi 的 `SettingsManager` + `DefaultPackageManager` 做全局/项目包的安装、移除、更新、启用、禁用。禁用会为该包条目写入空的 `extensions/skills/prompts/themes` 数组。
- `/api/skills` 用 `DefaultResourceLoader`，使设置路径、包技能、项目 `.agents/skills` 的列出方式与运行时一致。
- 技能切换只编辑目标 `SKILL.md` 上的 `disable-model-invocation` frontmatter 键；保持手术式修改以保留用户格式。
- `/api/skills/install` 通过 `npx skills add ... --agent pi` 执行；项目安装以所选 cwd 运行。

### 鉴权与模型配置
- `ModelsConfig` 把 `~/.pi/agent/models.json` 的模型与 pi 的 `AuthStorage`/`ModelRegistry` 的 provider 鉴权状态合并。
- provider 列表是**能力驱动**的，绝不基于 id：`lib/provider-listing.ts` 依据 `auth.apiKey.login` / `auth.oauth` 加存储的凭据类型决定归属，使双鉴权 provider（当前为 anthropic 与 github-copilot——哪些 provider 同时声明两者会随 SDK 版本变化，**绝不要**按 id 假设）只出现一次，且不会同时落入两个列表（#309）。`lib/provider-listing-runtime.ts` 把 `ModelRuntime` 适配到这些纯函数助手。
- auth.json 每个 provider 只存**一**个凭据，`ModelRuntime.logout()` 删除当前那个。因此删除路由用 `removeStoredCredentialIfType()` 在 pi 鉴权存储的同一文件锁下比较并删除。`ModelsConfig` 在任何鉴权变更后刷新**两**个 provider 列表——只刷新一个会让双鉴权 provider 渲染两次。
- OAuth/device-code/manual-code 流程由 `GET /api/auth/login/[provider]` 流式输出；手动码响应 POST 回来，用存在 `globalThis.__piLoginCallbacks` 的短期 token。
- API-key 路由通过 `AuthStorage` 存取密钥。状态端点**绝不能**返回原始密钥。
- 模型测试路由是 `app/api/models-config/test/route.ts`；`app/api/models/test/` 不是真实路由。

### 完成提示音
- `hooks/useAudio.ts` 把开关存于 `localStorage` 的 `pi-sound-enabled`，复用一个 `AudioContext`。
- 浏览器自动播放策略要求声音须由用户手势解锁；`ChatInput` 从交互控件调用解锁 hook，`ChatWindow` 在 `onAgentEnd` 播放提示音。

### 导出会话 HTML
- `/api/sessions/[id]/export` 委托 pi 的导出助手，然后把生成 HTML 中的递归树助手改写为迭代版本，避免极深的线性会话撑爆浏览器调用栈。

### i18n（`lib/i18n/`、`hooks/useI18n.tsx`）
- 内置 i18n 层，无额外运行时依赖。内置语言包：`en`、`zh-CN`，位于 `lib/i18n/messages/`。
- 初始 locale 由浏览器推断，用户可在顶栏切换；选择存于 `localStorage` 的 `pi-locale`。
- 客户端组件用 `useI18n()` 的 `t(key, params?)`；动态值用参数（`{count}`）而非拼接翻译片段。组件须在 `I18nProvider`（已在 `app/page.tsx` 提供）下渲染。
- 改动前先读 `docs/i18n.md`；浏览器语言探测或 registry 行为变化时扩展 `lib/i18n/registry.test.mjs`，插值/格式变化时扩展 `lib/i18n/format.test.mjs`。

### PWA 与移动端
- `public/sw.js`（Service Worker）、`public/offline.html`、`app/manifest.ts`（webmanifest）、`components/PwaRegistration.tsx`、`components/MobilePwaLayout` 构成 PWA。
- `next.config.ts` 为 `/`、`/sw.js`、`/manifest.webmanifest` 设置缓存头，并给 `/sw.js` 设 `Service-Worker-Allowed: /`。
- iOS PWA 视口与键盘布局有专门处理（`hooks/useViewportHeight.ts` 等），改动需兼顾 Safari。

### CLI 与发布
- `bin/pi-web.js` 是发布的 `pi-web` CLI：先校验 Node 版本，再解析 `next` bin（不依赖 `.bin` 软链，兼容 npx 安装），要求 `.next/` 已构建。
- 非 loopback hostname 启动时若未设 `PI_WEB_PASSWORD` 会告警（见 `proxy.ts` 的 Basic 认证）。
- 发布流程见 `docs/release.md`：`npm run release` = `npm version patch --no-git-tag-version && npm run build && npm publish --access public`。
- **npm 发布需 2FA（必须用 TTY）**：`@lyhue1991` 对 publish 启用了双因子认证，无 TTY 直接 `npm publish` 会报 `EOTP` 退出。发布要在 TTY（PTY）下跑，让 npm 走 web 授权：它会打印 `https://www.npmjs.com/auth/cli/<token>` 并提示 "Press ENTER to open in the browser"。随后 `open "<url>"` 在浏览器打开授权页（或向 stdin 发回车让 npm 自行打开），用户在浏览器点确认后 npm 自动完成上传。

---

## Pi 会话文件格式

位置：`~/.pi/agent/sessions/<encoded-cwd>/<timestamp>_<uuid>.jsonl`

```jsonl
{"type":"session","version":3,"id":"<uuid>","timestamp":"...","cwd":"/path","parentSession":"/abs/path/to/parent.jsonl"}
{"type":"model_change","id":"<8hex>","parentId":null,"provider":"zenmux","modelId":"claude-sonnet-4-6","timestamp":"..."}
{"type":"message","id":"<8hex>","parentId":"<8hex>","message":{"role":"user","content":"..."}}
{"type":"message","id":"<8hex>","parentId":"<8hex>","message":{"role":"assistant","content":[...],...}}
{"type":"message","id":"<8hex>","parentId":"<8hex>","message":{"role":"toolResult","toolCallId":"...","content":[...]}}
{"type":"compaction","id":"<8hex>","parentId":"<8hex>","summary":"...","firstKeptEntryId":"<8hex>","tokensBefore":N}
{"type":"session_info","id":"...","parentId":"...","name":"user-defined name"}
```

`SessionContext` 中的 `entryIds[]` 与 `messages[]` 是平行数组——把每条展示消息映射回其 `.jsonl` entry id，供 fork 与 navigate_tree 调用使用。

可用 `PI_CODING_AGENT_DIR` 环境变量指向其他 pi agent 目录（默认 `~/.pi/agent/sessions`）。

---

## CSS 变量（`app/globals.css`）

```
--bg --bg-panel --bg-hover --bg-selected --border
--text --text-muted --text-dim
--accent --user-bg --tool-bg
--font-mono
```
