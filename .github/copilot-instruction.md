# Copilot 指南 — 技术栈

目前项目使用的主要技术栈：

- 语言：TypeScript
- 前端框架：React（禁止任何 any）
- 相关库：zustand、react router（v6.4+）
- 打包/开发工具：Vite
- 包管理器：pnpm
- 静态检查：ESLint
- 类型配置：tsconfig (TypeScript)
- 路由库：react-router
- 网络通信：WebSocket / HTTP（见 api/room.ts, docs/websock_dto.md）
- 构建配置：vite.config.ts
- 样式：Tailwind v4.1

## 开发范式

feature-driven。

模块化为 components（业务组件）、ui（视觉组件）、api（RPC，包括任何网络通信）、types（所有类型，不允许使用 interface，仅使用 type）。

禁止任何过度设计。

## UI 风格

应该使用纯净自然、简约清新的风格，不要使用莫名其妙的深色（比如 AI 风的蓝紫渐变）。

必须使用 Tailwind v4.1，且须使用 classnames 进行逻辑分组，防止单行膨胀。

## 回答要点

必须阅览整个 workspace 相关代码后，再给出回答。不可以给出模棱两可的莫名其妙答案，因为代码已经有了，答案一定是确定的。

必须使用中文。
