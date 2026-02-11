import { useEffect, useMemo, useState } from "react";
import { useGameStore } from "../store/gameStore";
import type { RoomStatus } from "../../../model/room";
import { Check, Play, Settings2, Plus, X } from "lucide-react";

const areWordListsEqual = (a: string[], b: string[]) =>
  a.length === b.length && a.every((w, i) => w === b[i]);

export default function AdminControl() {
  const {
    startGame,
    updateWordList,
    messages,
    wordList: serverWords,
    players,
  } = useGameStore();

  const getLatestRoomStatus = (): RoomStatus => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.type === "status") return m.status;
    }
    return "Waiting";
  };

  const roomStatus = getLatestRoomStatus();
  const [draftWords, setDraftWords] = useState<string[]>(serverWords);
  const [tempWord, setTempWord] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingWords, setPendingWords] = useState<string[] | null>(null);
  const [justSynced, setJustSynced] = useState(false);
  const [submitGuard, setSubmitGuard] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);

  useEffect(() => {
    setDraftWords(serverWords);
  }, [serverWords]);

  useEffect(() => {
    if (!pendingWords) return;
    if (areWordListsEqual(serverWords, pendingWords)) {
      setIsSubmitting(false);
      setPendingWords(null);
      setJustSynced(true);
      setDraftWords(serverWords);
      if (submitGuard) {
        clearTimeout(submitGuard);
        setSubmitGuard(null);
      }
    }
  }, [pendingWords, serverWords, submitGuard]);

  useEffect(() => {
    if (!justSynced) return;
    const timer = setTimeout(() => setJustSynced(false), 2000);
    return () => clearTimeout(timer);
  }, [justSynced]);

  useEffect(
    () => () => {
      if (submitGuard) clearTimeout(submitGuard);
    },
    [submitGuard],
  );

  const isDirty = useMemo(
    () => !areWordListsEqual(draftWords, serverWords),
    [draftWords, serverWords],
  );

  const playableCount = useMemo(
    () =>
      players.filter((p) => p.role !== "Admin" && p.role !== "Observer").length,
    [players],
  );

  const handleAddWord = () => {
    if (tempWord.trim()) {
      setDraftWords([...draftWords, tempWord.trim()]);
      setTempWord("");
    }
  };

  const handleRemoveWord = (index: number) => {
    setDraftWords(draftWords.filter((_, i) => i !== index));
  };

  const handleSubmitWords = async () => {
    if (!isDirty) return;
    const normalizedDraft = draftWords.map((w) => w.trim()).filter(Boolean);
    setIsSubmitting(true);
    setPendingWords(normalizedDraft);
    setJustSynced(false);
    if (submitGuard) {
      clearTimeout(submitGuard);
      setSubmitGuard(null);
    }
    const guard = setTimeout(() => {
      setIsSubmitting(false);
      setPendingWords(null);
    }, 5000);
    setSubmitGuard(guard);
    try {
      await updateWordList(normalizedDraft);
    } finally {
      // 交由 WebSocket 返回的 words_set 事件来关闭提交态
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
                词库配置
              </label>
              <span
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium border ${
                  isDirty
                    ? "bg-amber-50 border-amber-100 text-amber-700"
                    : "bg-emerald-50 border-emerald-100 text-emerald-700"
                }`}
              >
                {isDirty ? "有未提交更改" : "已与服务器同步"}
              </span>
            </div>

            {/* <p className="text-[11px] text-slate-400 mb-2">
              服务器词库 {serverWords.length} 条，草稿 {draftWords.length} 条
            </p> */}

            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tempWord}
                  onChange={(e) => setTempWord(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddWord()}
                  className="flex-1 bg-slate-50 border border-slate-200 hover:border-indigo-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all placeholder:text-slate-400"
                  placeholder="输入词语..."
                />
                <button
                  onClick={handleAddWord}
                  className="bg-white border border-emerald-100 text-emerald-700 hover:bg-emerald-50 p-2 rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-100"
                >
                  <Plus size={18} />
                </button>
              </div>

              {draftWords.length > 0 && (
                <div className="flex flex-wrap gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100 min-h-15">
                  {draftWords.map((w, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 text-xs bg-white text-indigo-500 font-medium px-2 py-1 rounded-md border border-indigo-100 shadow-sm animate-fade-in"
                    >
                      {w}
                      <button
                        onClick={() => handleRemoveWord(i)}
                        className="text-slate-400 hover:text-emerald-700 transition-colors focus:outline-none"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <button
                onClick={handleSubmitWords}
                disabled={!isDirty || isSubmitting}
                className="w-full text-xs bg-white border border-emerald-100 text-emerald-700 hover:bg-emerald-50 py-2 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "更新中..." : "确认更新词库"}
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
              disabled={playableCount !== 8 || serverWords.length < 3}
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
