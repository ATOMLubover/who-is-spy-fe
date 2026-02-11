import { useState } from "react";
import { Form, useActionData, useNavigation } from "react-router";

/**
 * JoinPage - 玩家加入或创建房间的入口页面
 *
 * 流程说明：
 * 1. 创建房间模式 (mode="create")：
 *    - 用户输入房间名称和昵称
 *    - 提交表单 -> router.joinAction
 *    - HTTP POST /rooms/create 创建房间获取 roomId
 *    - 重定向到 GamePage，自动通过 WebSocket 加入房间
 *
 * 2. 加入房间模式 (mode="join")：
 *    - 用户输入房间ID和昵称
 *    - 提交表单 -> router.joinAction
 *    - 重定向到 GamePage，通过 WebSocket 加入房间
 */
export default function JoinPage() {
  const [mode, setMode] = useState<"join" | "create">("join");
  const navigation = useNavigation();
  const actionData = useActionData() as { error?: string } | undefined;
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-900/5">
        {/* 模式切换按钮：创建房间 vs 加入房间 */}
        <div className="flex text-center font-medium">
          <button
            type="button"
            onClick={() => setMode("join")}
            className={`flex-1 py-4 text-sm transition-colors ${
              mode === "join"
                ? "bg-white text-blue-600 shadow-[inset_0_-2px_0_0_#2563eb]"
                : "bg-slate-50 text-slate-500 hover:text-slate-700 hover:bg-slate-100"
            }`}
          >
            加入房间
          </button>
          <button
            type="button"
            onClick={() => setMode("create")}
            className={`flex-1 py-4 text-sm transition-colors ${
              mode === "create"
                ? "bg-white text-blue-600 shadow-[inset_0_-2px_0_0_#2563eb]"
                : "bg-slate-50 text-slate-500 hover:text-slate-700 hover:bg-slate-100"
            }`}
          >
            创建房间
          </button>
        </div>

        <div className="p-8">
          <Form method="post" className="space-y-5">
            {/* mode 隐藏字段决定后端流程：create 会先调用 HTTP 创建房间，join 直接跳转 */}
            <input type="hidden" name="mode" value={mode} />

            <div className="space-y-1">
              <label
                htmlFor="playerName"
                className="block text-sm font-medium text-slate-700"
              >
                你的昵称
              </label>
              <input
                id="playerName"
                name="playerName"
                required
                placeholder="请输入昵称"
                className="w-full rounded-lg border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all border"
              />
            </div>

            {mode === "create" ? (
              <div className="space-y-1">
                <label
                  htmlFor="roomName"
                  className="block text-sm font-medium text-slate-700"
                >
                  房间名称
                </label>
                <input
                  id="roomName"
                  name="roomName"
                  required
                  placeholder="给房间起个名字"
                  className="w-full rounded-lg border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all border"
                />
              </div>
            ) : (
              <div className="space-y-1">
                <label
                  htmlFor="roomId"
                  className="block text-sm font-medium text-slate-700"
                >
                  房间号
                </label>
                <input
                  id="roomId"
                  name="roomId"
                  required
                  placeholder="请输入房间号"
                  className="w-full rounded-lg border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all border"
                />
              </div>
            )}

            {actionData?.error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-100">
                ⚠️ {actionData.error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting
                ? "处理中..."
                : mode === "create"
                  ? "创建并加入"
                  : "加入房间"}
            </button>
          </Form>
        </div>
      </div>
    </div>
  );
}
