import { useNavigate } from "react-router";
import classNames from "classnames";
import { Home, Trophy, Crown, Frown, Skull, User } from "lucide-react";
import { useGame } from "../store/GameContext";

type PlayerInfo = {
  id: string;
  name: string;
  role: string;
  word: string;
  isEliminated: boolean;
  isSpySide: boolean;
};

const getRoleBadgeColor = (role: string) => {
  switch (role) {
    case "Spy":
      return "text-rose-700 bg-rose-100 border-rose-200";
    case "Blank":
      return "text-violet-700 bg-violet-100 border-violet-200";
    case "Normal":
      return "text-sky-700 bg-sky-100 border-sky-200";
    default:
      return "text-gray-600 bg-gray-100 border-gray-200";
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

type TeamSectionProps = {
  title: string;
  players: PlayerInfo[];
  isWinner: boolean;
  word: string;
  wordLabel: string;
  teamColor: "sky" | "rose";
};

function TeamSection({
  title,
  players,
  isWinner,
  word,
  wordLabel,
  teamColor,
}: TeamSectionProps) {
  const borderColor = isWinner ? `border-${teamColor}-500` : "border-gray-200";
  const bgColor = isWinner ? `bg-${teamColor}-50` : "bg-white";
  const titleColor = isWinner ? `text-${teamColor}-700` : "text-gray-500";
  const crownColor = `text-${teamColor}-600`;
  const wordColor = `text-${teamColor}-800`;
  const victoryBadgeColor = `text-${teamColor}-600 border-${teamColor}-200`;
  const ringColor = `ring-${teamColor}-200`;

  return (
    <div
      className={classNames(
        "flex-1 flex flex-col rounded-xl border-2 transition-all p-4",
        borderColor,
        bgColor,
        isWinner && "shadow-lg ring-1 ring-offset-2 ring-offset-transparent",
        isWinner ? ringColor : "opacity-90",
      )}
    >
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-black/5">
        <div className="flex items-center gap-2">
          {isWinner ? (
            <Crown className={classNames("w-6 h-6", crownColor)} />
          ) : (
            <Frown className="w-6 h-6 text-gray-400" />
          )}
          <h2 className={classNames("text-lg font-bold", titleColor)}>
            {title}{" "}
            <span className="text-sm font-normal opacity-80">
              ({players.length}人)
            </span>
          </h2>
        </div>
        {isWinner && (
          <span
            className={classNames(
              "text-xs font-bold px-2 py-1 rounded bg-white border",
              victoryBadgeColor,
            )}
          >
            VICTORY
          </span>
        )}
      </div>

      <div className="mb-4">
        <div className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">
          {wordLabel}
        </div>
        <div className={classNames("text-xl font-bold break-all", wordColor)}>
          {word || "无"}
        </div>
      </div>

      <div className="space-y-2 flex-1">
        {players.map((p) => (
          <div
            key={p.id}
            className={classNames(
              "flex items-center justify-between p-2 rounded-lg border bg-white/60",
              p.isEliminated && "opacity-60 bg-gray-50 grayscale",
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 bg-white rounded-full shadow-sm">
                <User className="w-4 h-4 text-gray-500" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-800 truncate text-sm">
                    {p.name}
                  </span>
                  <span
                    className={classNames(
                      "text-[10px] px-1.5 py-0.5 rounded border",
                      getRoleBadgeColor(p.role),
                    )}
                  >
                    {getRoleName(p.role)}
                  </span>
                </div>
                {p.word && p.word !== word && (
                  <div className="text-xs text-gray-500 truncate mt-0.5">
                    词: {p.word}
                  </div>
                )}
              </div>
            </div>

            <div className="ml-2 shrink-0">
              {p.isEliminated ? (
                <span className="flex items-center text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                  <Skull className="w-3 h-3 mr-1" /> 出局
                </span>
              ) : (
                isWinner && <Trophy className="w-4 h-4 text-yellow-500" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ResultPage() {
  const navigate = useNavigate();
  const { gameResult, players, eliminatedIds, disconnect } = useGame();

  if (!gameResult) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 text-gray-400 text-sm">
        结果加载中...
      </div>
    );
  }

  const { winner, answerWord, spyWord, playerRoles, playerWords } = gameResult;

  const playerDetails: PlayerInfo[] = players.map((player) => {
    const role = playerRoles[player.name] || "未知";
    const word = playerWords[player.name] || "";
    const isEliminated = eliminatedIds.includes(player.id);
    const isSpySide = role === "Spy" || role === "Blank";

    return {
      id: player.id,
      name: player.name,
      role,
      word,
      isEliminated,
      isSpySide,
    };
  });

  const civilianTeam = playerDetails.filter((p) => !p.isSpySide);
  const spyTeam = playerDetails.filter((p) => p.isSpySide);

  const isSpyWin = winner.includes("卧底") || winner.includes("白板");

  const handleBackToHome = () => {
    disconnect();
    navigate("/");
  };

  return (
    <div className="h-screen w-screen bg-gray-50 flex flex-col overflow-hidden">
      <header className="shrink-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-lg text-white">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">游戏结束</h1>
            <p className="text-sm text-gray-500 font-medium">
              获胜方:{" "}
              <span className={isSpyWin ? "text-rose-600" : "text-sky-600"}>
                {winner}
              </span>
            </p>
          </div>
        </div>
        <button
          onClick={handleBackToHome}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-black text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <Home className="w-4 h-4" />
          返回主页
        </button>
      </header>

      <main className="flex-1 overflow-auto p-4 md:p-6">
        <div className="max-w-6xl mx-auto h-full flex flex-col md:flex-row gap-4 md:gap-6">
          <TeamSection
            title="平民阵营"
            players={civilianTeam}
            isWinner={!isSpyWin}
            word={answerWord}
            wordLabel="平民词"
            teamColor="sky"
          />

          <TeamSection
            title="卧底/白板阵营"
            players={spyTeam}
            isWinner={isSpyWin}
            word={spyWord}
            wordLabel="卧底词"
            teamColor="rose"
          />
        </div>
      </main>
    </div>
  );
}
