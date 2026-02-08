import { Form, useNavigation } from "react-router";
import { useState } from "react";

type Mode = "create" | "join";

export default function JoinCard() {
  const navigation = useNavigation();
  const busy = navigation.state === "submitting";
  const [mode, setMode] = useState<Mode>("create");

  return (
    <div className="max-w-md mx-auto bg-white/80 backdrop-blur-md rounded-lg shadow-md p-6">
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          className={`flex-1 py-2 rounded-md border ${mode === "create" ? "bg-sky-600 text-white border-sky-600" : "bg-white text-slate-700 border-slate-200"}`}
          onClick={() => setMode("create")}
        >
          创建房间
        </button>
        <button
          type="button"
          className={`flex-1 py-2 rounded-md border ${mode === "join" ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-700 border-slate-200"}`}
          onClick={() => setMode("join")}
        >
          加入房间
        </button>
      </div>

      <h2 className="text-2xl font-semibold mb-4 text-slate-800">
        {mode === "create" ? "创建房间" : "加入房间"}
      </h2>

      <Form method="post" className="space-y-4">
        {mode === "create" ? (
          <>
            <div>
              <label className="block text-sm text-slate-600 mb-1">
                房间名称
              </label>
              <input
                name="roomName"
                required
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">
                你的昵称
              </label>
              <input
                name="playerName"
                required
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <input type="hidden" name="mode" value="create" />
            <button
              type="submit"
              disabled={busy}
              className="w-full mt-2 bg-sky-600 text-white py-2 rounded-md disabled:opacity-50"
            >
              {busy ? "提交中…" : "创建并进入"}
            </button>
          </>
        ) : (
          <>
            <div>
              <label className="block text-sm text-slate-600 mb-1">
                房间 ID
              </label>
              <input
                name="roomId"
                required
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">
                你的昵称
              </label>
              <input
                name="playerName"
                required
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <input type="hidden" name="mode" value="join" />
            <button
              type="submit"
              disabled={busy}
              className="w-full mt-2 bg-emerald-600 text-white py-2 rounded-md disabled:opacity-50"
            >
              {busy ? "提交中…" : "加入房间"}
            </button>
          </>
        )}
      </Form>
    </div>
  );
}
