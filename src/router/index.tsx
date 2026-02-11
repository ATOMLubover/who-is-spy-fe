import { createBrowserRouter, redirect } from "react-router";
import { lazy, Suspense } from "react";
import JoinPage from "../feature/join/ui/JoinPage";
import { createRoom } from "../api/room";

const GamePage = lazy(() => import("../feature/game/ui/GamePage"));

async function joinAction({ request }: { request: Request }) {
  const form = await request.formData();
  const mode = form.get("mode");
  const playerName = String(form.get("playerName") || "").trim();

  if (!playerName) {
    return { error: "昵称不能为空" };
  }

  try {
    let roomId = "";

    if (mode === "create") {
      // ============ 创建房间流程（两步）============
      // 步骤1: 调用 HTTP POST /rooms/create 接口创建房间，获取 roomId
      const roomName =
        String(form.get("roomName") || "").trim() || "未命名房间";
      const res = await createRoom({ roomName });
      roomId = res.roomId;
      // 步骤2: 跳转到 GamePage，在那里通过 WebSocket 发送 JoinGame 加入房间
      // （见 GamePage -> gameStore.connect -> RoomStreamClient.connectAndJoin）
    } else {
      // ============ 直接加入房间流程（一步）============
      // 直接使用用户输入的 roomId，然后跳转到 GamePage 通过 WebSocket 加入
      roomId = String(form.get("roomId") || "").trim();
      if (!roomId) {
        return { error: "请输入房间号" };
      }
    }

    // 重定向到 GamePage，携带 roomId 和 playerName
    // GamePage 会自动调用 WebSocket 连接并发送 JoinGame 请求
    return redirect(
      `/room/${roomId}?playerName=${encodeURIComponent(playerName)}`,
    );
  } catch (err) {
    console.error("Join/Create error:", err);
    return {
      error:
        "操作失败，请重试: " +
        (err instanceof Error ? err.message : String(err)),
    };
  }
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <JoinPage />,
    action: joinAction,
  },
  {
    path: "/join",
    element: <JoinPage />,
    action: joinAction,
  },
  {
    path: "/room/:roomId",
    element: (
      <Suspense
        fallback={
          <div className="h-screen w-screen flex items-center justify-center text-slate-500">
            Loading...
          </div>
        }
      >
        <GamePage />
      </Suspense>
    ),
  },
]);

export default router;
