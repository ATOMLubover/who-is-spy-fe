import { useState } from "react";
import { useGameStore } from "../store/gameStore";
import { Play, Settings, Plus, X } from "lucide-react";

export default function AdminControl() {
  const { startGame, updateWordList, roomStatus } = useGameStore();
  const [words, setWords] = useState<string[]>([]);
  const [tempWord, setTempWord] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddWord = () => {
    if (tempWord.trim()) {
      setWords([...words, tempWord.trim()]);
      setTempWord("");
    }
  };

  const handleRemoveWord = (index: number) => {
    setWords(words.filter((_, i) => i !== index));
  };

  const handleSubmitWords = async () => {
    if (words.length === 0) return;
    setIsSubmitting(true);
    try {
      await updateWordList(words);
      // Maybe show toast success?
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-full bg-white border-l border-gray-200 p-4 flex flex-col">
      <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
        <Settings className="w-5 h-5 text-gray-700" />
        Admin Consoles
      </h2>

      {roomStatus === "Waiting" && (
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Game Config
            </label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tempWord}
                  onChange={(e) => setTempWord(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddWord()}
                  className="flex-1 bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Add word..."
                />
                <button
                  onClick={handleAddWord}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-600 p-2 rounded transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>

              <div className="flex flex-wrap gap-2 mt-2">
                {words.map((w, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded border border-indigo-100"
                  >
                    {w}
                    <button
                      onClick={() => handleRemoveWord(i)}
                      className="hover:text-indigo-900"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>

              <button
                onClick={handleSubmitWords}
                disabled={words.length === 0 || isSubmitting}
                className="w-full mt-2 text-xs bg-indigo-50 text-indigo-600 hover:bg-indigo-100 py-2 rounded font-medium transition-colors disabled:opacity-50"
              >
                {isSubmitting ? "Setting..." : "Update Word List"}
              </button>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100">
            <button
              onClick={() => startGame()}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-3 rounded-lg font-bold shadow-md transform active:scale-95 transition-all"
            >
              <Play size={18} fill="currentColor" />
              Start Game
            </button>
          </div>
        </div>
      )}

      {roomStatus !== "Waiting" && (
        <div className="flex-1 flex items-center justify-center text-center">
          <p className="text-sm text-gray-400">
            Game in progress.
            <br />
            Controls are locked.
          </p>
        </div>
      )}
    </div>
  );
}
