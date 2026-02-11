import { create } from "zustand";
import { persist } from "zustand/middleware";
import { RoomStreamClient } from "../../../api/room";
import type { RoomEvent } from "../../../api/room";
import type { Player, Role } from "../../../model/player";
import type { RoomStatus } from "../../../model/room";

export type LogType =
  | "chat"
  | "join"
  | "status"
  | "speak"
  | "vote"
  | "result"
  | "system";

export type GameLog = {
  id: string;
  timestamp: number;
} & (
  | { type: "chat"; playerId: string; message: string; playerName?: string }
  | { type: "join"; player: Player }
  | {
      type: "status";
      status: RoomStatus;
      assignedWord?: string;
      currentTurnId?: string;
      currentTurnName?: string;
    }
  | { type: "speak"; playerId: string }
  | { type: "vote"; votedPlayers: VotedPlayer[] }
  | { type: "result"; eliminatedPlayerId?: string }
  | { type: "system"; message: string }
);

type VotedPlayer = {
  votedPlayerId: string;
  totalVotes: number;
};

interface GameState {
  roomId: string | null;
  playerId: string | null;
  myRole: Role | null;
  myWord: string | null;
  myName: string | null;
  masterId: string | null;
  roomStatus: RoomStatus;
  hasVoted: boolean;
  myVotedFor: string | null;
  joinStatus: "idle" | "connecting" | "joined" | "failed";
  joinError?: string;
  connected: boolean;
  players: Player[];
  messages: GameLog[];
  wordList: string[];
  eliminatedIds: string[];
  gameResult: {
    winner: string;
    answerWord: string;
    spyWord: string;
    playerRoles: Record<string, string>;
    playerWords: Record<string, string>;
  } | null;

  // Actions
  connect: (roomId: string, playerName: string) => Promise<void>;
  disconnect: () => void;
  sendMessage: (message: string) => void;
  startGame: () => void;
  votePlayer: (votedPlayerId: string) => void;
  updateWordList: (words: string[]) => Promise<void>;
  setPlayers: (players: Player[]) => void;
  setRole: (role: Role) => void;
}

const client = new RoomStreamClient();
const generateId = () =>
  globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      roomId: null,
      playerId: null,
      myName: null,
      myRole: null,
      myWord: null,
      myVotedFor: null,
      masterId: null,
      roomStatus: "Waiting",
      hasVoted: false,
      joinStatus: "idle",
      joinError: undefined,
      connected: false,
      players: [],
      messages: [],
      wordList: [],
      eliminatedIds: [],
      gameResult: null,

      connect: async (roomId, playerName) => {
        set({
          roomId,
          myName: playerName,
          wordList: [],
          joinStatus: "connecting",
          joinError: undefined,
          connected: false,
        });

        // ============ WebSocket 连接并加入房间 ============
        // 此方法会调用 RoomStreamClient.connectAndJoin()，发送 JoinGame 请求
        // 对于创建房间流程：这是第二步（第一步是 HTTP createRoom）
        // 对于加入房间流程：这是唯一步骤

        // Handler for incoming stream events
        const handleEvent = (event: RoomEvent) => {
          const logId = generateId();
          const now = Date.now();
          const { messages, players } = get();

          switch (event.type) {
            case "error":
              set({
                messages: [
                  ...messages,
                  {
                    id: logId,
                    timestamp: now,
                    type: "system",
                    message: event.message,
                  },
                ],
                joinStatus:
                  get().joinStatus === "connecting"
                    ? "failed"
                    : get().joinStatus,
                joinError:
                  get().joinStatus === "connecting"
                    ? event.message
                    : get().joinError,
              });
              break;

            case "joined": {
              if (event.isSelf) {
                set({
                  playerId: event.joiner.id,
                  myRole: event.joiner.role,
                  myWord: event.joiner.word || null,
                  masterId: event.masterId,
                  roomStatus: event.stage,
                  hasVoted: false,
                  myVotedFor: null,
                  joinStatus: "joined",
                  players: event.players,
                  messages: [
                    ...messages,
                    {
                      id: logId,
                      timestamp: now,
                      type: "join",
                      player: event.joiner,
                    },
                  ],
                });
              } else {
                set({
                  masterId: event.masterId,
                  roomStatus: event.stage,
                  hasVoted: false,
                  myVotedFor: null,
                  players: event.players,
                  messages: [
                    ...messages,
                    {
                      id: logId,
                      timestamp: now,
                      type: "join",
                      player: event.joiner,
                    },
                  ],
                });
              }
              break;
            }

            case "player_left": {
              const updatedPlayers = players.filter(
                (p) => p.id !== event.playerId,
              );
              set({
                players: updatedPlayers,
                messages: [
                  ...messages,
                  {
                    id: logId,
                    timestamp: now,
                    type: "system",
                    message: `${event.playerName} 已离开房间`,
                  },
                ],
              });
              break;
            }

            case "words_set":
              set({
                wordList: event.wordList,
                messages: [
                  ...messages,
                  {
                    id: logId,
                    timestamp: now,
                    type: "system",
                    message: `词库已更新 (${event.wordList.length})`,
                  },
                ],
              });
              break;

            case "started":
              set({
                myRole: event.role,
                myWord: event.word,
                roomStatus: "Preparing",
                hasVoted: false,
                myVotedFor: null,
                players: event.players || players,
                messages: [
                  ...messages,
                  {
                    id: logId,
                    timestamp: now,
                    type: "status",
                    status: "Preparing",
                    assignedWord: event.word,
                  },
                ],
              });
              break;

            case "describe":
              set({
                messages: [
                  ...messages,
                  {
                    id: logId,
                    timestamp: now,
                    type: "chat",
                    playerId: event.speakerId,
                    playerName: event.speakerName,
                    message: event.message,
                  },
                ],
              });
              break;

            case "vote":
              set({
                messages: [
                  ...messages,
                  {
                    id: logId,
                    timestamp: now,
                    type: "vote",
                    votedPlayers: [
                      {
                        votedPlayerId: event.targetId,
                        totalVotes: 1,
                      },
                    ],
                  },
                ],
              });
              // If this client is the voter, mark hasVoted
              if (event.voterId && event.voterId === get().playerId) {
                set({ hasVoted: true, myVotedFor: event.targetId });
              }
              break;

            case "state":
              set({
                roomStatus: event.stage,
                // reset hasVoted when a new voting stage begins
                hasVoted: event.stage === "Voting" ? false : get().hasVoted,
                myVotedFor: event.stage === "Voting" ? null : get().myVotedFor,
                messages: [
                  ...messages,
                  {
                    id: logId,
                    timestamp: now,
                    type: "status",
                    status: event.stage,
                    currentTurnId: event.currentTurnId,
                    currentTurnName: event.currentTurnName,
                  },
                ],
              });
              break;

            case "eliminate":
              {
                const eliminatedId = event.eliminatedId;
                const updatedPlayers = players.map((p) =>
                  p.id === eliminatedId
                    ? { ...p, role: "Observer" as Role }
                    : p,
                );
                const currentEliminatedIds = get().eliminatedIds;
                set({
                  players: updatedPlayers,
                  myRole:
                    get().playerId && get().playerId === eliminatedId
                      ? "Observer"
                      : get().myRole,
                  eliminatedIds: [...currentEliminatedIds, eliminatedId],
                  messages: [
                    ...messages,
                    {
                      id: logId,
                      timestamp: now,
                      type: "result",
                      eliminatedPlayerId: eliminatedId,
                    },
                  ],
                });
              }
              break;

            case "result":
              set({
                roomStatus: "Finished",
                hasVoted: false,
                myVotedFor: null,
                gameResult: {
                  winner: event.winner,
                  answerWord: event.answerWord,
                  spyWord: event.spyWord,
                  playerRoles: event.playerRoles,
                  playerWords: event.playerWords,
                },
                messages: [
                  ...messages,
                  {
                    id: logId,
                    timestamp: now,
                    type: "system",
                    message: `游戏结束，${event.winner}`,
                  },
                ],
              });
              break;
          }
        };

        // Subscribe handles adding the listener
        client.subscribe(handleEvent);

        try {
          if (!client.isConnected) {
            // 通过 WebSocket 加入房间（发送 JoinGame 请求）
            await client.connectAndJoin(roomId, playerName);
          }
          set({ connected: true, roomId, joinStatus: "joined" });
        } catch (error) {
          console.error("Failed to connect to room stream:", error);
          set({
            connected: false,
            joinStatus: "failed",
            joinError:
              error instanceof Error ? error.message : "连接房间失败，请重试",
          });
        }
      },

      disconnect: () => {
        client.disconnect();
        set({
          connected: false,
          wordList: [],
          joinStatus: "idle",
          joinError: undefined,
        });
      },

      sendMessage: (message: string) => {
        const { playerId } = get();
        if (playerId) {
          client.describe(playerId, message);
        }
      },

      startGame: () => {
        const { playerId } = get();
        if (playerId) {
          client.startGame(playerId);
        }
      },

      votePlayer: (votedPlayerId: string) => {
        const { playerId } = get();
        if (playerId) {
          client.vote(playerId, votedPlayerId);
          // mark local player as having voted to prevent duplicate votes
          set({ hasVoted: true });
        }
      },

      updateWordList: async (words: string[]) => {
        const { playerId } = get();
        if (playerId) {
          client.setWords(playerId, words);
        }
      },

      setPlayers: (players: Player[]) => set({ players }),
      setRole: (role: Role) => set({ myRole: role }),
    }),
    {
      name: "game-storage",
      partialize: (state) => ({
        roomId: state.roomId,
        playerId: state.playerId,
        myName: state.myName,
        myRole: state.myRole,
        myWord: state.myWord,
      }),
    },
  ),
);
