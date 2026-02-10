import { useEffect } from "react";
import { useParams, useSearchParams } from "react-router";
import { useGameStore } from "../store/gameStore";
import PlayerList from "../component/PlayerList";
import GameChat from "../component/GameChat";
import AdminControl from "../component/AdminControl";

export default function GamePage() {
  const { roomId: paramRoomId } = useParams();
  const [searchParams] = useSearchParams();
  const paramPlayerName = searchParams.get("playerName");

  const { connect, disconnect, myRole, myWord, connected, roomStatus } =
    useGameStore();

  useEffect(() => {
    if (paramRoomId && paramPlayerName) {
      connect(paramRoomId, paramPlayerName);
    }
    return () => {
      disconnect();
    };
  }, [paramRoomId, paramPlayerName, connect, disconnect]);

  if (!paramRoomId || !paramPlayerName) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 text-gray-500">
        Invalid Room or Player ID
      </div>
    );
  }

  // Right sidebar logic
  const isAdmin = myRole === "Admin";

  return (
    <div className="h-screen w-screen bg-gray-100 flex overflow-hidden font-sans">
      {/* Left Sidebar: Player List & Connection Status */}
      <aside className="w-64 shrink-0 shadow-xl z-20">
        <PlayerList />
        <div className="bg-white border-t border-gray-200 p-2 text-xs text-center text-gray-400">
          Status:{" "}
          {connected ? (
            <span className="text-green-500 font-bold">Connected</span>
          ) : (
            <span className="text-red-500">Disconnected</span>
          )}
        </div>
      </aside>

      {/* Center: Game Area */}
      <main className="flex-1 flex flex-col relative z-10 min-w-0">
        {/* Top Info Bar: Word Display */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm">
          <div>
            <h1 className="font-bold text-gray-800 text-lg">
              Room: {paramRoomId}
            </h1>
            <p className="text-xs text-gray-500">
              Phase:{" "}
              <span className="uppercase text-indigo-600 font-semibold">
                {roomStatus}
              </span>
            </p>
          </div>

          {(myWord || myRole) && (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-gray-400 uppercase tracking-wider">
                  Your Role
                </p>
                <p className="font-bold text-gray-800">{myRole || "..."}</p>
              </div>
              {myWord && (
                <div className="bg-indigo-600 text-white px-4 py-2 rounded-lg shadow-sm">
                  <p className="text-xs opacity-80 uppercase tracking-wider mb-1">
                    Your Word
                  </p>
                  <p className="font-bold text-lg leading-none">{myWord}</p>
                </div>
              )}
              {!myWord && roomStatus !== "Waiting" && (
                <div className="bg-gray-100 text-gray-500 px-4 py-2 rounded-lg">
                  <p className="text-xs">Waiting for word...</p>
                </div>
              )}
            </div>
          )}
        </header>

        {/* Chat Area */}
        <div className="flex-1 min-h-0">
          <GameChat />
        </div>
      </main>

      {/* Right Sidebar: Admin Controls (Only for Admin) */}
      {isAdmin && (
        <aside className="w-72 shrink-0 bg-white shadow-xl z-20 border-l border-gray-200">
          <AdminControl />
        </aside>
      )}
    </div>
  );
}
