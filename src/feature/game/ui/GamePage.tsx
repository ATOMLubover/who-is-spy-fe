import { Link, useParams, useSearchParams } from "react-router";
import { GameProvider, useGame } from "../store/GameContext";
import PlayerList from "../component/PlayerList";
import GameChat from "../component/GameChat";
import AdminControl from "../component/AdminControl";
import ResultPage from "./ResultPage";
import { roleToString } from "../../../model/player";

/**
 * GamePage - 游戏主页面
 */
export default function GamePage() {
  const { roomId } = useParams();
  const [searchParams] = useSearchParams();
  const playerName = searchParams.get("playerName");

  if (!roomId || !playerName) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#fdfbf7] text-gray-400">
        无效的房间号或玩家名
      </div>
    );
  }

  return (
    <GameProvider roomId={roomId} playerName={playerName}>
      <GameView roomId={roomId} />
    </GameProvider>
  );
}

// 内部视图：消费 useGame
function GameView({ roomId }: { roomId: string }) {
  const { myRole, myWord, connected, roomStatus, joinStatus, joinError } =
    useGame();

  const isAdmin = myRole === "Admin";

  if (joinStatus === "connecting") {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#fdfbf7] text-gray-500 gap-2">
        <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin" />
        <p className="text-sm">正在加入房间...</p>
        <p className="text-xs text-gray-400">房间号 {roomId}</p>
      </div>
    );
  }

  if (joinStatus === "failed") {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#fdfbf7] text-gray-500 gap-3 px-4 text-center">
        <p className="text-base font-semibold text-rose-500">加入房间失败</p>
        <p className="text-sm text-gray-500 max-w-md">
          {joinError || "房间不存在或连接被拒绝，请检查房间号后重试。"}
        </p>
        <Link
          to="/"
          className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg shadow-sm hover:bg-indigo-500"
        >
          返回加入页
        </Link>
      </div>
    );
  }

  // 状态映射
  const statusMap: Record<string, string> = {
    Waiting: "等待中",
    Playing: "游戏中",
    Finished: "已结束",
  };

  // 如果游戏已结束，显示结算页面
  if (roomStatus === "Finished") {
    return <ResultPage />;
  }

  return (
    <div className="h-screen w-screen bg-[#f3f4f6] text-slate-700 font-sans p-6 overflow-hidden flex gap-6 items-stretch">
      {/* 
        布局策略：
        整体采用 Flex 布局，分为左中右三个悬浮卡片。
        1. 左侧：玩家列表 (固定宽度)
        2. 中间：游戏主控区 (聊天、词语显示) (自适应宽度)
        3. 右侧：管理员面板 (仅管理员可见，固定宽度)
      */}

      {/* 左侧卡片：玩家列表 */}
      <section className="w-64 flex flex-col bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white/50 overflow-hidden shrink-0 transition-all duration-300 hover:shadow-md">
        <div className="flex-1 overflow-hidden p-4">
          {/* 传递 className 给子组件以控制内部样式，或者依赖子组件自适应 */}
          <PlayerList />
        </div>
        <div className="p-3 border-t border-gray-100 text-xs text-center text-gray-400">
          {connected ? (
            <span className="text-emerald-500 font-medium flex items-center justify-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
              已连接
            </span>
          ) : (
            <span className="text-rose-400 flex items-center justify-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-400 inline-block"></span>
              断开连接
            </span>
          )}
        </div>
      </section>

      {/* 中间卡片：主游戏区 */}
      <main className="flex-1 flex flex-col bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white/50 overflow-hidden min-w-0 transition-all duration-300 hover:shadow-md relative">
        {/* 顶部信息栏 */}
        <header className="px-6 py-4 flex justify-between items-center bg-white/50 border-b border-gray-100 backdrop-blur-md sticky top-0 z-10">
          <div>
            <h1 className="font-bold text-slate-700 text-lg tracking-tight">
              房间号 {roomId}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              状态：
              <span className="text-indigo-500 font-medium">
                {statusMap[roomStatus] || roomStatus}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-4">
            {(myWord || myRole) && (
              <>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-0.5">
                    你的身份
                  </p>
                  <p className="font-bold text-slate-700 text-sm">
                    {myRole ? roleToString(myRole) : "未知"}
                  </p>
                </div>

                {myWord ? (
                  <div className="bg-indigo-50/80 text-indigo-600 px-5 py-2.5 rounded-xl border border-indigo-100 shadow-sm">
                    <p className="text-[10px] text-indigo-400 uppercase tracking-widest mb-1 text-center font-medium">
                      你的词语
                    </p>
                    <p className="font-bold text-lg leading-none text-center tracking-wide">
                      {myWord}
                    </p>
                  </div>
                ) : (
                  roomStatus !== "Waiting" &&
                  myRole !== "Blank" &&
                  myRole !== "Admin" &&
                  myRole !== "Observer" && (
                    <div className="bg-gray-50 text-gray-400 px-4 py-2 rounded-lg border border-dashed border-gray-200">
                      <p className="text-xs">等待发词...</p>
                    </div>
                  )
                )}
              </>
            )}
          </div>
        </header>

        {/* 聊天区域 */}
        <div className="flex-1 min-h-0 relative">
          <GameChat />
        </div>
      </main>

      {/* 右侧卡片：管理员控制 (仅管理员) */}
      {isAdmin && (
        <aside className="w-72 flex flex-col bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white/50 overflow-hidden shrink-0 transition-all duration-300 hover:shadow-md">
          <AdminControl />
        </aside>
      )}
    </div>
  );
}
