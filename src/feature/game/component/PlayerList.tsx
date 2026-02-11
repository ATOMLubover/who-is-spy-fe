import { useGameStore } from "../store/gameStore";
import { User, Shield, Glasses, UserX, Users } from "lucide-react";
import classNames from "classnames";

export default function PlayerList() {
  const { players, playerId } = useGameStore();

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "Admin":
        return <Shield size={14} className="text-amber-400" />;
      case "Spy":
        return <Glasses size={14} className="text-rose-400" />;
      case "Observer":
        // 观察者
        return <Glasses size={14} className="text-slate-400" />;
      case "Blank":
        // 白板
        return <UserX size={14} className="text-violet-400" />;
      default:
        // 平民
        return <User size={14} className="text-sky-400" />;
    }
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case "Admin":
        return "管理员";
      case "Spy":
        return "卧底";
      case "Observer":
        return "观察者";
      case "Blank":
        return "白板";
      case "Civilian":
        return "平民";
      default:
        return "未知";
    }
  };

  return (
    <div className="h-full flex flex-col">
      <h2 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2 px-1">
        <Users className="w-4 h-4 text-indigo-500" />
        在线玩家{" "}
        <span className="text-slate-400 font-normal text-xs">
          ({players.length})
        </span>
      </h2>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {players.map((p) => {
          const isMe = p.id === playerId;
          return (
            <div
              key={p.id}
              className={classNames(
                "flex items-center gap-3 p-2.5 rounded-xl transition-all duration-200 border",
                isMe
                  ? "bg-indigo-50/50 border-indigo-100 shadow-sm"
                  : "bg-white border-transparent hover:bg-gray-50 hover:border-gray-100",
              )}
            >
              <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 text-slate-400 shrink-0">
                {getRoleIcon(p.role)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm text-slate-700 truncate">
                    {p.name}
                  </p>
                  {isMe && (
                    <span className="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded ml-2 shrink-0">
                      我
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-400 mt-0.5">
                  {getRoleName(p.role)}
                </p>
              </div>
            </div>
          );
        })}

        {players.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-slate-300">
            <UserX size={32} className="mb-2 opacity-50" />
            <span className="text-xs">暂无玩家</span>
          </div>
        )}
      </div>
    </div>
  );
}
