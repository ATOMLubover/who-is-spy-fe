import { useEffect, useRef, useState } from "react";
import { useGameStore, type GameLog } from "../store/gameStore";
import { Send, Vote } from "lucide-react";
import classNames from "classnames";

export default function GameChat() {
  const {
    messages,
    sendMessage,
    roomStatus,
    votePlayer,
    players,
    playerId,
    myRole,
  } = useGameStore();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage(input.trim());
    setInput("");
  };

  const getLogContent = (msg: GameLog) => {
    switch (msg.type) {
      case "chat": {
        // Find sender name from players list if possible
        const sender = players.find((p) => p.id === msg.playerId);
        const name = sender ? sender.name : "Unknown";
        const isMe = msg.playerId === playerId;
        return (
          <div
            className={classNames(
              "flex flex-col mb-4",
              isMe ? "items-end" : "items-start",
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-gray-600">{name}</span>
              <span className="text-[10px] text-gray-400">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <div
              className={classNames(
                "px-4 py-2 rounded-2xl max-w-[80%] text-sm",
                isMe
                  ? "bg-indigo-600 text-white rounded-tr-sm"
                  : "bg-gray-100 text-gray-800 rounded-tl-sm",
              )}
            >
              {msg.message}
            </div>
          </div>
        );
      }
      case "join":
        return (
          <div className="flex justify-center my-4">
            <span className="bg-blue-50 text-blue-600 text-xs px-3 py-1 rounded-full border border-blue-100">
              {msg.player.name} joined the game
            </span>
          </div>
        );
      case "status":
        return (
          <div className="flex justify-center my-6">
            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg text-center shadow-sm">
              <p className="text-yellow-800 font-bold text-sm uppercase tracking-wide">
                Phase Change
              </p>
              <p className="text-yellow-700 text-sm mt-1">
                Current Stage: {msg.status}
              </p>
            </div>
          </div>
        );
      case "speak": {
        const speaker = players.find((p) => p.id === msg.playerId);
        return (
          <div className="flex justify-center my-2">
            <span className="text-gray-500 text-sm italic">
              👉 Now speaking:{" "}
              <span className="font-bold text-gray-700">
                {speaker?.name || "Unknown"}
              </span>
            </span>
          </div>
        );
      }
      case "vote":
        return (
          <div className="flex justify-center my-2">
            <span className="text-purple-600 text-xs">
              🗳️ A vote has been cast!
            </span>
          </div>
        );
      case "result": {
        const eliminated = players.find((p) => p.id === msg.eliminatedPlayerId);
        return (
          <div className="flex justify-center my-6">
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg text-center shadow-sm">
              <p className="text-red-800 font-bold">Execution Result</p>
              {eliminated ? (
                <p className="text-red-600 mt-1">
                  {eliminated.name} was eliminated!
                </p>
              ) : (
                <p className="text-green-600 mt-1">No one was eliminated.</p>
              )}
            </div>
          </div>
        );
      }
      default:
        return null;
    }
  };

  const isVoting = roomStatus === "Voting";
  // Filter out candidates: not me, not admin/observer usually (simplified logic here: existing players)
  const canVote = isVoting && myRole !== "Admin" && myRole !== "Observer";

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((msg) => (
          <div key={msg.id}>{getLogContent(msg)}</div>
        ))}
        {isVoting && canVote && (
          <div className="my-4 bg-white p-4 rounded-lg shadow border border-purple-100">
            <h3 className="text-sm font-bold text-purple-800 mb-3 flex items-center gap-2">
              <Vote size={16} /> Cast Your Vote
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {players
                .filter(
                  (p) =>
                    p.id !== playerId &&
                    p.role !== "Admin" &&
                    p.role !== "Observer",
                )
                .map((p) => (
                  <button
                    key={p.id}
                    onClick={() => votePlayer(p.id)}
                    className="text-xs py-2 px-3 bg-white border border-gray-200 hover:bg-purple-50 hover:border-purple-300 rounded text-gray-700 text-left transition-colors"
                  >
                    Vote {p.name}
                  </button>
                ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="bg-white p-4 border-t border-gray-200">
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            placeholder={
              roomStatus === "Speaking" ? "Type your description..." : "Chat..."
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={roomStatus === "Voting" || roomStatus === "Judging"}
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-colors"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
