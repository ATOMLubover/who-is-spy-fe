import { useNavigate } from "react-router";
import { useGame } from "../store/GameContext";
import { Trophy, Home, Users, XCircle, Target } from "lucide-react";

/**
 * ResultPage - 游戏结算页面
 * 显示游戏结果、胜利方、失败方、词语等信息
 */
export default function ResultPage() {
  const navigate = useNavigate();
  const { gameResult, players, eliminatedIds, disconnect } = useGame();

  if (!gameResult) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#fdfbf7] text-gray-400">
        游戏结果加载中...
      </div>
    );
  }

  const { winner, answerWord, spyWord, playerRoles, playerWords } = gameResult;

  // 构建玩家详细信息列表
  const playerDetails = players.map((player) => {
    const role = playerRoles[player.name] || "未知";
    const word = playerWords[player.name] || "";
    const isEliminated = eliminatedIds.includes(player.id);

    // 判断玩家属于哪一方
    const isSpy = role === "Spy";
    const isBlank = role === "Blank";
    const isSpyTeam = isSpy || isBlank;

    return {
      id: player.id,
      name: player.name,
      role,
      word,
      isEliminated,
      isSpyTeam,
    };
  });

  // 分组：胜利方和失败方
  const isSpyWin = winner.includes("卧底");
  const winnerTeam = playerDetails.filter((p) =>
    isSpyWin ? p.isSpyTeam : !p.isSpyTeam,
  );
  const loserTeam = playerDetails.filter((p) =>
    isSpyWin ? !p.isSpyTeam : p.isSpyTeam,
  );

  const handleBackToHome = () => {
    disconnect();
    navigate("/");
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "Spy":
        return "text-rose-600 bg-rose-50 border-rose-200";
      case "Blank":
        return "text-violet-600 bg-violet-50 border-violet-200";
      case "Normal":
        return "text-sky-600 bg-sky-50 border-sky-200";
      default:
        return "text-slate-600 bg-slate-50 border-slate-200";
    }
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case "Spy":
        return "卧底";
      case "Blank":
        return "白板";
      case "Normal":
        return "平民";
      default:
        return role;
    }
  };

  return (
    <div className="h-screen w-screen bg-linear-to-br from-indigo-50 via-purple-50 to-pink-50 overflow-auto">
      <div className="container mx-auto px-6 py-10 max-w-6xl">
        {/* 顶部胜利横幅 */}
        <div className="bg-white rounded-3xl shadow-lg border border-indigo-100 p-8 mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Trophy className="w-12 h-12 text-amber-500" />
            <h1 className="text-4xl font-bold text-slate-800">游戏结束</h1>
          </div>
          <p className="text-2xl font-semibold text-indigo-600 mb-6">
            {winner}胜利！
          </p>

          {/* 词语展示 */}
          <div className="flex gap-6 justify-center items-center flex-wrap">
            <div className="bg-sky-50 border-2 border-sky-200 rounded-2xl px-8 py-4 shadow-sm">
              <p className="text-xs text-sky-500 font-medium uppercase tracking-wide mb-1">
                平民词
              </p>
              <p className="text-2xl font-bold text-sky-700">{answerWord}</p>
            </div>
            <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl px-8 py-4 shadow-sm">
              <p className="text-xs text-rose-500 font-medium uppercase tracking-wide mb-1">
                卧底词
              </p>
              <p className="text-2xl font-bold text-rose-700">{spyWord}</p>
            </div>
          </div>
        </div>

        {/* 胜利方与失败方 */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* 胜利方 */}
          <div className="bg-white rounded-2xl shadow-md border border-emerald-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-6 h-6 text-emerald-600" />
              <h2 className="text-xl font-bold text-emerald-700">
                胜利方 ({winnerTeam.length}人)
              </h2>
            </div>
            <div className="space-y-3">
              {winnerTeam.map((p) => (
                <div
                  key={p.id}
                  className={`flex items-center justify-between p-3 rounded-xl border ${
                    p.isEliminated
                      ? "bg-gray-50 border-gray-200"
                      : "bg-emerald-50/50 border-emerald-100"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="font-semibold text-slate-700">{p.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-md border font-medium ${getRoleColor(p.role)}`}
                        >
                          {getRoleName(p.role)}
                        </span>
                        <span className="text-xs text-slate-500">
                          {p.word || "无词"}
                        </span>
                      </div>
                    </div>
                  </div>
                  {p.isEliminated && (
                    <div className="flex items-center gap-1 text-rose-500 text-xs font-medium bg-rose-50 px-2 py-1 rounded-md border border-rose-200">
                      <XCircle className="w-3 h-3" />
                      被投出局
                    </div>
                  )}
                  {!p.isEliminated && (
                    <div className="flex items-center gap-1 text-emerald-600 text-xs font-medium">
                      <Target className="w-3 h-3" />
                      存活
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 失败方 */}
          <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <XCircle className="w-6 h-6 text-slate-500" />
              <h2 className="text-xl font-bold text-slate-700">
                失败方 ({loserTeam.length}人)
              </h2>
            </div>
            <div className="space-y-3">
              {loserTeam.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 rounded-xl border bg-slate-50/50 border-slate-200"
                >
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="font-semibold text-slate-700">{p.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-md border font-medium ${getRoleColor(p.role)}`}
                        >
                          {getRoleName(p.role)}
                        </span>
                        <span className="text-xs text-slate-500">
                          {p.word || "无词"}
                        </span>
                      </div>
                    </div>
                  </div>
                  {p.isEliminated && (
                    <div className="flex items-center gap-1 text-rose-500 text-xs font-medium bg-rose-50 px-2 py-1 rounded-md border border-rose-200">
                      <XCircle className="w-3 h-3" />
                      被投出局
                    </div>
                  )}
                  {!p.isEliminated && (
                    <div className="flex items-center gap-1 text-slate-500 text-xs font-medium">
                      <Target className="w-3 h-3" />
                      存活
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 返回主页按钮 */}
        <div className="text-center">
          <button
            onClick={handleBackToHome}
            className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg transition-all duration-200 hover:scale-105"
          >
            <Home className="w-5 h-5" />
            返回主页
          </button>
        </div>
      </div>
    </div>
  );
}
