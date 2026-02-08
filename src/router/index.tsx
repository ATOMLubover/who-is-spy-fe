import { createBrowserRouter, redirect } from "react-router";
import JoinPage from "../feature/join/ui/JoinPage";
import { createRoom, joinRoom } from "../api/room";

async function joinAction({ request }: { request: Request }) {
  const form = await request.formData();
  const mode = form.get("mode");

  try {
    if (mode === "create") {
      const roomName = String(form.get("roomName") || "");
      const playerName = String(form.get("playerName") || "");

      const res = await createRoom({ roomName, creatorName: playerName });
      const roomId = res.roomId;
      const playerId = res.creator.id;
      return redirect(`/room/${roomId}?playerId=${playerId}`);
    }

    const roomId = String(form.get("roomId") || "");
    const playerName = String(form.get("playerName") || "");
    const res = await joinRoom({ roomId, playerName });

    const matched = res.joinedPlayers.find((p) => p.name === playerName);
    const playerId = matched ? matched.id : "";
    return redirect(`/room/${roomId}?playerId=${playerId}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: message };
  }
}

const router = createBrowserRouter([
  { path: "/", element: <JoinPage />, action: joinAction },
  { path: "/join", element: <JoinPage />, action: joinAction },
]);

export default router;
