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
  | { type: "status"; status: RoomStatus; assignedWord?: string }
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
  connected: boolean;
  roomStatus: RoomStatus;
  players: Player[];
  messages: GameLog[];

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
      connected: false,
      roomStatus: "Waiting",
      players: [],
      messages: [],

      connect: async (roomId, playerName) => {
        set({ roomId, myName: playerName });

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
              });
              break;

            case "self_joined": {
              const selfPlayer = event.player;
              const updatedPlayers = players.some((p) => p.id === selfPlayer.id)
                ? players
                : [...players, selfPlayer];
              set({
                playerId: selfPlayer.id,
                myRole: selfPlayer.role,
                myWord: selfPlayer.word || null,
                players: updatedPlayers,
                messages: [
                  ...messages,
                  {
                    id: logId,
                    timestamp: now,
                    type: "join",
                    player: selfPlayer,
                  },
                ],
              });
              break;
            }

            case "player_joined": {
              const newPlayer = event.player;
              if (players.some((p) => p.id === newPlayer.id)) return;
              set({
                players: [...players, newPlayer],
                messages: [
                  ...messages,
                  {
                    id: logId,
                    timestamp: now,
                    type: "join",
                    player: newPlayer,
                  },
                ],
              });
              break;
            }

            case "words_set":
              set({
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
              break;

            case "state":
              set({
                roomStatus: event.stage,
                messages: [
                  ...messages,
                  {
                    id: logId,
                    timestamp: now,
                    type: "status",
                    status: event.stage,
                  },
                ],
              });
              break;

            case "eliminate":
              set({
                messages: [
                  ...messages,
                  {
                    id: logId,
                    timestamp: now,
                    type: "result",
                    eliminatedPlayerId: event.eliminatedId,
                  },
                ],
              });
              break;

            case "result":
              set({
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
            await client.connectAndJoin(roomId, playerName);
          }
          set({ connected: true, roomId });
        } catch (error) {
          console.error("Failed to connect to room stream:", error);
          set({ connected: false });
        }
      },

      disconnect: () => {
        client.disconnect();
        set({ connected: false });
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
        roomStatus: state.roomStatus,
      }),
    },
  ),
);
