# 房间创建与加入流程说明

本文档详细说明了"谁是卧底"游戏前端的房间创建与加入逻辑。

## 核心要点

⚠️ **重要**：创建房间和加入房间是**完全不同**的两个流程！

- **创建房间** = HTTP 创建 + WebSocket 加入（两步）
- **加入房间** = WebSocket 加入（一步）

---

## 一、创建房间流程（两步）

### 步骤 1：HTTP 创建房间

**目的**：在服务端创建一个新房间，获取唯一的 `room_id`

**涉及文件**：

- `src/router/index.tsx` - `joinAction` 函数
- `src/api/room.ts` - `createRoom` 函数

**流程**：

1. 用户在 `JoinPage` 填写房间名称和昵称，选择"创建房间"模式
2. 点击提交后，表单数据发送到 `joinAction`
3. `joinAction` 检测到 `mode === "create"`
4. 调用 `createRoom({ roomName })` 发送 HTTP 请求

   ```typescript
   // HTTP POST /api/v1/rooms/create
   body: { "room_name": "我的房间" }

   // 响应
   { "room_id": "abc123xyz" }
   ```

5. 获得 `roomId`

**关键代码**：

```typescript
// src/router/index.tsx
if (mode === "create") {
  // 步骤1: HTTP 创建房间，获取 roomId
  const roomName = String(form.get("roomName") || "").trim() || "未命名房间";
  const res = await createRoom({ roomName });
  roomId = res.roomId;
  // 步骤2 将在 GamePage 中执行（见下文）
}
```

### 步骤 2：WebSocket 加入房间

**目的**：使用步骤 1 获得的 `room_id`，通过 WebSocket 加入房间

**涉及文件**：

- `src/router/index.tsx` - 重定向到 GamePage
- `src/feature/game/ui/GamePage.tsx` - 触发 WebSocket 连接
- `src/feature/game/store/gameStore.ts` - `connect` 函数
- `src/api/room.ts` - `RoomStreamClient.connectAndJoin` 方法

**流程**：

6. `joinAction` 重定向到 `/room/${roomId}?playerName=xxx`
7. `GamePage` 组件加载
8. `useEffect` 调用 `gameStore.connect(roomId, playerName)`
9. `connect` 调用 `RoomStreamClient.connectAndJoin(roomId, playerName)`
10. 建立 WebSocket 连接到 `/api/v1/ws/join`
11. 连接成功后，发送 `JoinGame` 请求
    ```json
    {
      "request_type": "JoinGame",
      "data": {
        "room_id": "abc123xyz",
        "joiner_name": "玩家1"
      }
    }
    ```
12. 服务端返回 `JoinGame` 响应，玩家成功加入房间
13. **首个加入者自动成为管理员（Admin）**

**关键代码**：

```typescript
// src/feature/game/ui/GamePage.tsx
useEffect(() => {
  if (paramRoomId && paramPlayerName) {
    // WebSocket 连接并加入房间（创建房间的第二步）
    connect(paramRoomId, paramPlayerName);
  }
}, [paramRoomId, paramPlayerName]);

// src/api/room.ts - RoomStreamClient
connectAndJoin(roomId: string, joinerName: string) {
  const onOpen = () => {
    // 发送 JoinGame 请求（创建房间的第二步）
    this.send("JoinGame", { room_id: roomId, joiner_name: joinerName });
  };
  // ...
}
```

---

## 二、直接加入已有房间流程（一步）

**目的**：使用已知的 `room_id` 直接加入房间

**涉及文件**：与创建房间的步骤 2 相同

**流程**：

1. 用户在 `JoinPage` 填写房间 ID 和昵称，选择"加入房间"模式
2. 点击提交后，表单数据发送到 `joinAction`
3. `joinAction` 检测到 `mode === "join"`
4. 直接使用用户输入的 `roomId`（**跳过 HTTP 创建**）
5. 重定向到 `/room/${roomId}?playerName=xxx`
6. 后续流程与创建房间的步骤 2 完全相同（见上文步骤 7-13）

**关键代码**：

```typescript
// src/router/index.tsx
if (mode === "join") {
  // 直接使用用户输入的 roomId，跳过 HTTP 创建
  roomId = String(form.get("roomId") || "").trim();
  if (!roomId) {
    return { error: "请输入房间号" };
  }
}
// 然后重定向到 GamePage，后续与创建房间步骤 2 相同
```

---

## 三、代码调用链总结

### 创建房间调用链

```
JoinPage (UI)
  ↓ 表单提交 (mode="create", roomName, playerName)
router/index.tsx::joinAction
  ↓ HTTP POST /rooms/create
api/room.ts::createRoom()
  ↓ 返回 { roomId }
router/index.tsx::joinAction
  ↓ redirect("/room/{roomId}?playerName=xxx")
feature/game/ui/GamePage.tsx
  ↓ useEffect 触发
feature/game/store/gameStore.ts::connect()
  ↓ WebSocket 连接
api/room.ts::RoomStreamClient.connectAndJoin()
  ↓ WebSocket 发送 JoinGame
服务端
  ✓ 玩家成功加入房间（成为管理员）
```

### 加入房间调用链

```
JoinPage (UI)
  ↓ 表单提交 (mode="join", roomId, playerName)
router/index.tsx::joinAction
  ↓ redirect("/room/{roomId}?playerName=xxx")
feature/game/ui/GamePage.tsx
  ↓ useEffect 触发
feature/game/store/gameStore.ts::connect()
  ↓ WebSocket 连接
api/room.ts::RoomStreamClient.connectAndJoin()
  ↓ WebSocket 发送 JoinGame
服务端
  ✓ 玩家成功加入房间（成为普通玩家或观察者）
```

---

## 四、关键接口说明

### HTTP 接口

#### POST /api/v1/rooms/create

**用途**：仅用于创建房间，不加入房间

**请求**：

```json
{
  "room_name": "我的房间"
}
```

**响应**：

```json
{
  "room_id": "abc123xyz"
}
```

### WebSocket 接口

#### 连接地址：`ws://<host>:<port>/api/v1/ws/join`

#### 消息：JoinGame

**用途**：

- 创建房间的第二步
- 直接加入房间的唯一步骤

**请求**：

```json
{
  "request_type": "JoinGame",
  "data": {
    "room_id": "abc123xyz",
    "joiner_name": "玩家1"
  }
}
```

**响应**：

```json
{
  "response_type": "JoinGame",
  "data": {
    "joiner": {
      "id": "player_xxx",
      "name": "玩家1",
      "role": "Admin", // 首个加入者为 Admin，后续为 Unset/Observer
      "word": ""
    }
  }
}
```

---

## 五、常见问题

### Q1: 为什么创建房间需要两步？

**A**: 因为创建房间和加入房间是两个独立的操作：

- 创建房间：在服务端生成房间数据结构，分配唯一 ID
- 加入房间：将玩家连接到房间，分配角色，建立实时通信

这样设计的好处：

1. 房间可以在创建后分享给其他玩家
2. 支持异步加入（不同时间加入）
3. WebSocket 连接与房间生命周期解耦

### Q2: 能否只用 WebSocket 创建房间？

**A**: 不行。根据文档，WebSocket 的首条消息**必须**是 `JoinGame`，它需要一个已存在的 `room_id`。因此必须先通过 HTTP 创建房间获取 ID。

### Q3: 直接加入房间时，如果房间不存在会怎样？

**A**: WebSocket 会返回错误响应（`response_type: "Error"`），前端会在 `gameStore` 中捕获并显示错误消息。

### Q4: 首个加入者一定是管理员吗？

**A**: 是的。根据 WebSocket API 文档，首个加入者自动成为 `Admin` 角色，拥有设置词库和开始游戏的权限。

---

## 六、验证清单

要验证创建房间流程是否正确，检查以下关键点：

- [ ] `JoinPage` 有两个模式：创建房间和加入房间
- [ ] 创建房间模式下，表单包含 `roomName` 和 `playerName` 字段
- [ ] `router/index.tsx::joinAction` 在 `mode === "create"` 时调用 `createRoom()`
- [ ] `createRoom()` 发送 HTTP POST 到 `/api/v1/rooms/create`
- [ ] 获取 `roomId` 后重定向到 `/room/{roomId}?playerName=xxx`
- [ ] `GamePage` 自动调用 `gameStore.connect()`
- [ ] `gameStore.connect()` 调用 `RoomStreamClient.connectAndJoin()`
- [ ] WebSocket 连接后发送 `JoinGame` 请求
- [ ] 首个加入者收到 `role: "Admin"` 响应

---

## 七、相关文档

- [HTTP API 文档](./http_api.md) - 详细的 HTTP 接口规范
- [WebSocket API 文档](./websock_api.md) - 详细的 WebSocket 消息格式

---

**最后更新**：2026-02-11  
**维护者**：前端团队
