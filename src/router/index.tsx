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
      const roomName =
        String(form.get("roomName") || "").trim() || "未命名房间";
      // Create room via HTTP to get the ID, but don't join via HTTP
      const res = await createRoom({ roomName });
      roomId = res.roomId;
    } else {
      roomId = String(form.get("roomId") || "").trim();
      if (!roomId) {
        return { error: "请输入房间号" };
      }
    }

    // Redirect to GamePage with playerName.
    // The Game Page logic will handle the actual WebSocket join/connection.
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
