import { useEffect, useRef, useState } from "react";
import { useGameStore, type GameLog } from "../store/gameStore";
import { SendHorizontal, Vote } from "lucide-react";
import classNames from "classnames";

export default function GameChat() {
  const {
    messages,
    sendMessage,
    votePlayer,
    players,
    playerId,
    myRole,
    roomStatus,
    hasVoted,
    myVotedFor,
  } = useGameStore();

  // 获取最新的current turn信息
  const getCurrentTurn = (): { id?: string; name?: string } => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m: GameLog = messages[i];
      if (m.type === "status" && m.currentTurnId) {
        return { id: m.currentTurnId, name: m.currentTurnName };
      }
    }
    return {};
  };
  const currentTurn = getCurrentTurn();
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
        const sender = players.find((p) => p.id === msg.playerId);
        const name = sender ? sender.name : "未知玩家";
        const isMe = msg.playerId === playerId;
        return (
          <div
            className={classNames(
              "flex flex-col mb-4 animate-fade-in-up",
              isMe ? "items-end" : "items-start",
            )}
          >
            <div
              className={`flex items-center gap-2 mb-1 opacity-80 ${isMe ? "flex-row-reverse" : "flex-row"}`}
            >
              <span className="text-[10px] font-bold text-slate-500">
                {name}
              </span>
              <span className="text-[10px] text-slate-400">
                {new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <div
              className={classNames(
                "px-4 py-2.5 rounded-2xl max-w-[85%] text-sm leading-relaxed shadow-sm relative",
                isMe
                  ? "bg-indigo-500 text-white rounded-tr-sm"
                  : "bg-white text-slate-600 border border-slate-100 rounded-tl-sm",
              )}
            >
              {msg.message}
            </div>
          </div>
        );
      }
      case "join":
        return (
          <div className="flex justify-center my-4 opacity-60">
            <span className="bg-slate-100 text-slate-500 text-[10px] px-3 py-1 rounded-full">
              {msg.player?.name} 加入了游戏
            </span>
          </div>
        );
      case "status": {
        const map: Record<string, string> = {
          Waiting: "等待",
          Preparing: "准备阶段（30秒）",
          Speaking: "发言阶段（每人40秒）",
          Voting: "投票阶段（30秒）",
          Judging: "判定阶段（10秒）",
          Finished: "已结束",
        };
        const label = map[msg.status] || msg.status;
        return (
          <div className="flex justify-center my-6">
            <div className="bg-amber-50 border border-amber-100 px-4 py-2 rounded-xl text-center shadow-sm">
              <p className="text-amber-600 font-bold text-xs uppercase tracking-wider mb-0.5">
                阶段变更
              </p>
              <p className="text-amber-800/80 text-sm">当前阶段：{label}</p>
              {msg.currentTurnName && msg.status === "Speaking" && (
                <p className="text-slate-500 text-xs mt-1">
                  当前发言者：{msg.currentTurnName}
                </p>
              )}
            </div>
          </div>
        );
      }
      case "speak": {
        const speaker = players.find((p) => p.id === msg.playerId);
        return (
          <div className="flex justify-center my-3">
            <span className="text-slate-400 text-xs flex items-center gap-1 bg-white/50 px-2 py-1 rounded-full border border-white backdrop-blur-sm">
              🎙️ 正在发言:{" "}
              <span className="font-medium text-slate-600">
                {speaker?.name || "未知"}
              </span>
            </span>
          </div>
        );
      }
      case "vote":
        return (
          <div className="flex justify-center my-2 opacity-70">
            <span className="text-indigo-400 text-xs bg-indigo-50 px-2 py-0.5 rounded-full">
              🗳️ 有人进行了一次投票
            </span>
          </div>
        );
      case "result": {
        const eliminated = players.find((p) => p.id === msg.eliminatedPlayerId);
        return (
          <div className="flex justify-center my-6">
            <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl text-center shadow-sm w-3/4 mx-auto">
              <p className="text-rose-700 font-bold text-sm mb-1">投票结果</p>
              {eliminated ? (
                <p className="text-rose-600 mt-1 text-xs">
                  <span className="font-bold">{eliminated.name}</span> 被淘汰了!
                </p>
              ) : (
                <p className="text-emerald-600 mt-1 text-xs">无人被淘汰。</p>
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
  const isSpeaking = roomStatus === "Speaking";
  // Filter out candidates: not me, not admin/observer usually (simplified logic here: existing players)
  const canVote = isVoting && myRole !== "Admin" && myRole !== "Observer";
  const isMyTurn = isSpeaking && currentTurn.id === playerId;
  const canSpeak = isSpeaking && isMyTurn;

  return (
    <div className="flex flex-col h-full bg-slate-50/30 relative">
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar scroll-smooth pb-20">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-2 opacity-60">
            <div className="text-2xl grayscale">💬</div>
            <p className="text-xs">暂无消息</p>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div key={idx}>{getLogContent(msg)}</div>
        ))}
        {isSpeaking && currentTurn.name && <></>}
        {isVoting && canVote && (
          <div className="my-4 bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-md border border-indigo-100 animate-fade-in-up">
            <h3 className="text-xs font-bold text-indigo-800 mb-3 flex items-center gap-2 uppercase tracking-wider">
              <Vote size={14} /> 请进行投票
            </h3>
            {hasVoted && (
              <div className="mb-3 text-xs text-slate-500">
                您已投票给{" "}
                {players.find((p) => p.id === myVotedFor)?.name || "某位玩家"}
              </div>
            )}
            {!hasVoted && (
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
                      disabled={hasVoted}
                      className="text-xs py-1.5 px-2 bg-white border border-emerald-100 text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-100"
                    >
                      投票给 {p.name}
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="bg-white border-t border-slate-100/50 p-4 backdrop-blur-md">
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all placeholder:text-slate-400 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder={
              isSpeaking
                ? isMyTurn
                  ? "请输入你的描述..."
                  : `等待 ${currentTurn.name || "其他玩家"} 发言中...`
                : roomStatus === "Voting"
                  ? "投票中..."
                  : "聊天..."
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={
              !canSpeak &&
              (isSpeaking ||
                roomStatus === "Voting" ||
                roomStatus === "Judging")
            }
          />
          <button
            type="submit"
            disabled={!input.trim() || !canSpeak}
            className="bg-white border border-emerald-100 text-emerald-700 p-2 rounded-full transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <SendHorizontal size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
