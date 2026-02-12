import { useEffect, useMemo, useState } from "react";
import { useGame } from "../store/GameContext";
import type { RoomStatus } from "../../../model/room";
import { Check, Play, Settings2 } from "lucide-react";

export default function AdminControl() {
  const {
    startGame,
    updateWordList,
    messages,
    wordList: serverWords,
    players,
  } = useGame();

  const getLatestRoomStatus = (): RoomStatus => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.type === "status") return m.status;
    }
    return "Waiting";
  };

  const roomStatus = getLatestRoomStatus();
  const [normalWord, setNormalWord] = useState("");
  const [spyWord, setSpyWord] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [justSynced, setJustSynced] = useState(false);

  useEffect(() => {
    if (serverWords.length >= 2) {
      setNormalWord(serverWords[0] || "");
      setSpyWord(serverWords[1] || "");
    }
  }, [serverWords]);

  useEffect(() => {
    if (!justSynced) return;
    const timer = setTimeout(() => setJustSynced(false), 2000);
    return () => clearTimeout(timer);
  }, [justSynced]);

  const isDirty = useMemo(() => {
    if (serverWords.length !== 2)
      return normalWord.trim() !== "" || spyWord.trim() !== "";
    return normalWord !== serverWords[0] || spyWord !== serverWords[1];
  }, [normalWord, spyWord, serverWords]);

  const playableCount = useMemo(
    () =>
      players.filter((p) => p.role !== "Admin" && p.role !== "Observer").length,
    [players],
  );

  const handleSubmitWords = async () => {
    if (!isDirty) return;
    const trimmedNormal = normalWord.trim();
    const trimmedSpy = spyWord.trim();
    if (!trimmedNormal || !trimmedSpy) {
      return;
    }
    setIsSubmitting(true);
    try {
      await updateWordList([trimmedNormal, trimmedSpy]);
      setJustSynced(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-4">
      <h2 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
        <Settings2 className="w-4 h-4 text-indigo-500" />
        管理员控制台
      </h2>

      {roomStatus === "Waiting" && (
        <div className="space-y-6 flex-1 overflow-y-auto pr-1">
          {/* 游戏配置区域 */}
          <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-xs font-semibold text-slate-500 tracking-wide">
                词语配置
              </label>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  平民词
                </label>
                <input
                  type="text"
                  value={normalWord}
                  onChange={(e) => setNormalWord(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-indigo-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all placeholder:text-slate-400"
                  placeholder="输入平民词..."
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  卧底词
                </label>
                <input
                  type="text"
                  value={spyWord}
                  onChange={(e) => setSpyWord(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-rose-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-100 focus:border-rose-400 transition-all placeholder:text-slate-400"
                  placeholder="输入卧底词..."
                />
              </div>

              <button
                onClick={handleSubmitWords}
                disabled={
                  !isDirty ||
                  isSubmitting ||
                  !normalWord.trim() ||
                  !spyWord.trim()
                }
                className="w-full text-xs bg-white border border-emerald-100 text-emerald-700 hover:bg-emerald-50 py-2 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "更新中..." : "确认更新词语"}
              </button>

              {justSynced && (
                <p className="text-[11px] text-emerald-600 flex items-center gap-1 mt-1">
                  <Check className="w-3 h-3" /> 已同步到服务器
                </p>
              )}
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => startGame()}
              disabled={playableCount !== 8}
              className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg font-bold shadow-sm transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play size={18} fill="currentColor" className="opacity-90" />
              开始游戏
            </button>
            <p className="text-[10px] text-center text-slate-400 mt-2">
              {`可开始玩家：${playableCount} / 8（不含管理员与观众）`}
            </p>
          </div>
        </div>
      )}

      {roomStatus !== "Waiting" && (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
          <Play className="w-12 h-12 mb-2 opacity-20" />
          <p className="text-sm">游戏进行中</p>
          <div className="mt-4 w-full">
            <button className="w-full py-2 bg-white border border-emerald-100 text-emerald-700 hover:bg-emerald-50 rounded-lg text-xs font-medium transition-colors shadow-sm">
              强制结束 (慎用)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
