import { useGameStore } from "../store/gameStore";
import { User, Shield, Briefcase, Glasses, UserX } from "lucide-react";
import classNames from "classnames";

export default function PlayerList() {
  const { players, playerId } = useGameStore();

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "Admin":
        return <Shield size={16} className="text-yellow-500" />;
      case "Spy":
        return <Glasses size={16} className="text-red-500" />;
      case "Observer":
        return <Glasses size={16} className="text-gray-400" />;
      case "Blank":
        return <UserX size={16} className="text-purple-500" />;
      default:
        return <User size={16} className="text-blue-500" />;
    }
  };

  return (
    <div className="h-full flex flex-col bg-white border-r border-gray-200 p-4">
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
        <Briefcase className="w-5 h-5 text-indigo-600" />
        Players ({players.length})
      </h2>

      <div className="flex-1 overflow-y-auto space-y-2">
        {players.map((p) => {
          const isMe = p.id === playerId;
          return (
            <div
              key={p.id}
              className={classNames(
                "flex items-center gap-3 p-3 rounded-lg transition-colors",
                isMe
                  ? "bg-indigo-50 border border-indigo-100"
                  : "hover:bg-gray-50",
              )}
            >
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                {getRoleIcon(p.role)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-900 truncate">
                  {p.name} {isMe && "(You)"}
                </p>
                <p className="text-xs text-gray-500">{p.role}</p>
              </div>
            </div>
          );
        })}

        {players.length === 0 && (
          <p className="text-center text-gray-400 text-sm mt-10">
            No players yet
          </p>
        )}
      </div>
    </div>
  );
}
